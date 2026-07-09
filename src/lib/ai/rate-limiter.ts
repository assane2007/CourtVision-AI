/**
 * AI-Specific Rate Limiter
 * Per-player, per-operation-type rate limiting with subscription-based multipliers.
 * Works alongside the global rate-limiter but is tuned for expensive AI operations.
 */

import type { AiOperationType, AiQuota, SubscriptionTier } from './types'
import { AI_RATE_LIMITS, AI_TIER_MULTIPLIERS } from './types'
import { logger } from '@/lib/logger'

// ── In-Memory Store ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const MAX_STORE_ENTRIES = 50_000

// Periodic cleanup every 10 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
      cleaned++
    }
  }
  if (cleaned > 0) {
    logger.debug(`AI rate limiter cleanup: removed ${cleaned} entries`, 'ai.rate-limiter')
  }
}, 10 * 60 * 1000)
cleanupTimer.unref()

// ── Core Rate Limiting ──────────────────────────────────────────────────────────

function getBucketKey(playerId: string, operationType: AiOperationType): string {
  return `ai:${operationType}:${playerId}`
}

/**
 * Check if a player can make an AI request of the given type.
 * Returns true if allowed, false if rate limited.
 * Also tracks the usage if allowed.
 */
export function checkAndTrack(
  playerId: string,
  operationType: AiOperationType,
  tier: SubscriptionTier = 'free',
): { allowed: boolean; retryAfterMs: number; limit: number; remaining: number } {
  const config = AI_RATE_LIMITS[operationType]
  if (!config) {
    logger.warn(`Unknown AI operation type: ${operationType}`, 'ai.rate-limiter')
    return { allowed: true, retryAfterMs: 0, limit: 999, remaining: 999 }
  }

  const multiplier = AI_TIER_MULTIPLIERS[tier] ?? 1
  const limit = Math.round(config.perHour * multiplier)
  const key = getBucketKey(playerId, operationType)
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour

  // Safety valve: evict expired entries if store is too large
  if (store.size >= MAX_STORE_ENTRIES) {
    for (const [k, entry] of store) {
      if (entry.resetAt < now) store.delete(k)
    }
    if (store.size >= MAX_STORE_ENTRIES) {
      let evicted = 0
      for (const k of store.keys()) {
        if (evicted >= MAX_STORE_ENTRIES * 0.2) break
        store.delete(k)
        evicted++
      }
    }
  }

  const entry = store.get(key)

  // No entry or expired — start fresh
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0, limit, remaining: limit - 1 }
  }

  // Already at limit
  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
      limit,
      remaining: 0,
    }
  }

  // Under limit — increment and allow
  entry.count++
  return {
    allowed: true,
    retryAfterMs: 0,
    limit,
    remaining: limit - entry.count,
  }
}

/**
 * Check quota without tracking (read-only).
 */
export function checkQuota(
  playerId: string,
  operationType: AiOperationType,
  tier: SubscriptionTier = 'free',
): boolean {
  const config = AI_RATE_LIMITS[operationType]
  if (!config) return true

  const multiplier = AI_TIER_MULTIPLIERS[tier] ?? 1
  const limit = Math.round(config.perHour * multiplier)
  const key = getBucketKey(playerId, operationType)
  const now = Date.now()

  const entry = store.get(key)
  if (!entry || now > entry.resetAt) return true
  return entry.count < limit
}

/**
 * Get detailed quota information for a player across all AI operation types.
 */
export function getQuota(
  playerId: string,
  tier: SubscriptionTier = 'free',
): Record<AiOperationType, AiQuota> {
  const result = {} as Record<AiOperationType, AiQuota>
  const now = Date.now()

  for (const opType of Object.keys(AI_RATE_LIMITS) as AiOperationType[]) {
    const config = AI_RATE_LIMITS[opType]
    const multiplier = AI_TIER_MULTIPLIERS[tier] ?? 1
    const total = Math.round(config.perHour * multiplier)
    const key = getBucketKey(playerId, opType)
    const entry = store.get(key)

    const used = (!entry || now > entry.resetAt) ? 0 : entry.count
    const resetAt = entry ? new Date(entry.resetAt).toISOString() : new Date(now + 60 * 60 * 1000).toISOString()

    result[opType] = {
      total,
      used,
      remaining: Math.max(0, total - used),
      resetAt,
      tier,
    }
  }

  return result
}

/**
 * Manually track usage (e.g., when the check was done elsewhere).
 */
export function trackUsage(
  playerId: string,
  operationType: AiOperationType,
  _tokens: number = 0,
): void {
  const key = getBucketKey(playerId, operationType)
  const now = Date.now()
  const windowMs = 60 * 60 * 1000

  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
  } else {
    entry.count++
  }
}

/**
 * Reset rate limit for a specific player+operation (admin use).
 */
export function resetLimit(playerId: string, operationType: AiOperationType): void {
  const key = getBucketKey(playerId, operationType)
  store.delete(key)
}
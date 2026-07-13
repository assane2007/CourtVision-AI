/**
 * AI-Specific Rate Limiter
 * Per-player, per-operation-type rate limiting with subscription-based multipliers.
 * Uses Redis (via RedisCache) for distributed rate limiting when available,
 * with automatic fallback to an in-memory Map.
 *
 * Key format in Redis: ai:ratelimit:{playerId}:{operationType}
 * Values: integer count, TTL: 1 hour (3600s).
 */

import type { AiOperationType, AiQuota, SubscriptionTier } from './types';
import { AI_RATE_LIMITS, AI_TIER_MULTIPLIERS } from './types';
import { logger } from '@/lib/logger';
import { RedisCache } from '@/lib/cache/redis-cache';
import { config } from '@/lib/config';

// ── Constants ──────────────────────────────────────────────────────────────────

const WINDOW_MS = 60 * 60 * 1000 // 1 hour window

// ── Redis Cache Instance ──────────────────────────────────────────────────────

let redisCache: RedisCache | null = null
let redisChecked = false

function getRedis(): RedisCache | null {
  if (redisChecked && !redisCache) return null
  if (redisCache) return redisCache

  try {
    const url = config.redis.url
    if (!url) {
      redisChecked = true
      return null
    }
    redisCache = new RedisCache({ url, namespace: 'ai' })
    redisChecked = true
    return redisCache
  } catch {
    redisChecked = true
    return null
  }
}

// ── In-Memory Fallback Store ──────────────────────────────────────────────────

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

// ── Core Helpers ──────────────────────────────────────────────────────────────

function getBucketKey(playerId: string, operationType: AiOperationType): string {
  return `ratelimit:${playerId}:${operationType}`
}

/**
 * Atomic-like increment using RedisCache public API.
 * 1. Check if key exists.
 * 2. If not, set it to 1 with TTL (first request in window).
 * 3. If yes, increment by 1.
 *
 * Returns the new count, or null if Redis is unavailable.
 * Note: Not perfectly atomic under extreme concurrency (rare double-count possible),
 * but acceptable for rate limiting.
 */
async function redisIncr(key: string): Promise<number | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const exists = await redis.exists(key)
    if (exists) {
      const count = await redis.increment(key, 1)
      return count
    }
    // First request in this window — set with TTL
    await redis.set(key, 1, WINDOW_MS)
    return 1
  } catch (err) {
    logger.debug(
      `Redis rate limit failed, falling back to memory: ${err instanceof Error ? err.message : String(err)}`,
      'ai.rate-limiter',
    )
    redisCache = null
    redisChecked = true
    return null
  }
}

async function redisGetCount(key: string): Promise<number | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const val = await redis.get<number>(key)
    return typeof val === 'number' ? val : null
  } catch {
    return null
  }
}

async function redisDel(key: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    await redis.delete(key)
    return true
  } catch {
    return false
  }
}

// ── Core Rate Limiting ──────────────────────────────────────────────────────────

/**
 * Check if a player can make an AI request of the given type.
 * Returns true if allowed, false if rate limited.
 * Also tracks the usage if allowed.
 */
export async function checkAndTrack(
  playerId: string,
  operationType: AiOperationType,
  tier: SubscriptionTier = 'free',
): Promise<{ allowed: boolean; retryAfterMs: number; limit: number; remaining: number }> {
  const config_ = AI_RATE_LIMITS[operationType]
  if (!config_) {
    logger.warn(`Unknown AI operation type: ${operationType}`, 'ai.rate-limiter')
    return { allowed: true, retryAfterMs: 0, limit: 999, remaining: 999 }
  }

  const multiplier = AI_TIER_MULTIPLIERS[tier] ?? 1
  const limit = Math.round(config_.perHour * multiplier)
  const key = getBucketKey(playerId, operationType)

  // Try Redis first
  const count = await redisIncr(key)
  if (count !== null) {
    if (count > limit) {
      return {
        allowed: false,
        retryAfterMs: WINDOW_MS,
        limit,
        remaining: 0,
      }
    }
    return {
      allowed: true,
      retryAfterMs: 0,
      limit,
      remaining: Math.max(0, limit - count),
    }
  }

  // Fallback to in-memory
  return checkAndTrackMemory(limit, key)
}

function checkAndTrackMemory(
  limit: number,
  key: string,
): { allowed: boolean; retryAfterMs: number; limit: number; remaining: number } {
  const now = Date.now()

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
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
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
export async function checkQuota(
  playerId: string,
  operationType: AiOperationType,
  tier: SubscriptionTier = 'free',
): Promise<boolean> {
  const config_ = AI_RATE_LIMITS[operationType]
  if (!config_) return true

  const multiplier = AI_TIER_MULTIPLIERS[tier] ?? 1
  const limit = Math.round(config_.perHour * multiplier)
  const key = getBucketKey(playerId, operationType)

  // Try Redis
  const redisCount = await redisGetCount(key)
  if (redisCount !== null) {
    return redisCount < limit
  }

  // Fallback to memory
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) return true
  return entry.count < limit
}

/**
 * Get detailed quota information for a player across all AI operation types.
 */
export async function getQuota(
  playerId: string,
  tier: SubscriptionTier = 'free',
): Promise<Record<AiOperationType, AiQuota>> {
  const result = {} as Record<AiOperationType, AiQuota>
  const now = Date.now()

  for (const opType of Object.keys(AI_RATE_LIMITS) as AiOperationType[]) {
    const config_ = AI_RATE_LIMITS[opType]
    const multiplier = AI_TIER_MULTIPLIERS[tier] ?? 1
    const total = Math.round(config_.perHour * multiplier)
    const key = getBucketKey(playerId, opType)

    // Try Redis
    const redisCount = await redisGetCount(key)
    if (redisCount !== null) {
      const resetAt = new Date(now + WINDOW_MS).toISOString()
      result[opType] = {
        total,
        used: redisCount,
        remaining: Math.max(0, total - redisCount),
        resetAt,
        tier,
      }
      continue
    }

    // Fallback to memory
    const entry = store.get(key)
    const used = (!entry || now > entry.resetAt) ? 0 : entry.count
    const resetAt = entry ? new Date(entry.resetAt).toISOString() : new Date(now + WINDOW_MS).toISOString()

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
export async function trackUsage(
  playerId: string,
  operationType: AiOperationType,
  _tokens: number = 0,
): Promise<void> {
  const key = getBucketKey(playerId, operationType)
  const now = Date.now()

  // Try Redis
  const count = await redisIncr(key)
  if (count !== null) return

  // Fallback to memory
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count++
  }
}

/**
 * Reset rate limit for a specific player+operation (admin use).
 */
export async function resetLimit(playerId: string, operationType: AiOperationType): Promise<void> {
  const key = getBucketKey(playerId, operationType)

  // Try Redis
  const deleted = await redisDel(key)
  if (deleted) {
    store.delete(key)
    return
  }

  // Fallback to memory
  store.delete(key)
}
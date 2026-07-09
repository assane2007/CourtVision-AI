/**
 * Production rate limiter with sliding window algorithm.
 *
 * Supports configurable per-endpoint limits, returns proper HTTP headers,
 * and has a strategy pattern for memory (dev) vs redis (prod).
 */

import { logger } from '@/lib/logger'

// ── Types ────────────────────────────────────────────────────────────────────

type Strategy = 'memory' | 'redis'

interface RateLimitConfig {
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetMs: number       // Timestamp when the window resets
  retryAfterMs?: number // Only set when `allowed` is false
}

interface SlidingWindowEntry {
  timestamps: number[] // Sorted array of request timestamps
}

// ── Presets ──────────────────────────────────────────────────────────────────

export const RATE_PRESETS = {
  /** Authentication endpoints — strict */
  auth: { max: 5, windowMs: 60_000 },           // 5/min
  /** General API endpoints */
  api: { max: 60, windowMs: 60_000 },            // 60/min
  /** File upload endpoints */
  upload: { max: 10, windowMs: 60_000 },         // 10/min
  /** AI / expensive endpoints */
  ai: { max: 20, windowMs: 60_000 },             // 20/min
  /** AI form check (video analysis) */
  aiFormCheck: { max: 10, windowMs: 60_000 },    // 10/min
  /** Password reset / sensitive operations */
  sensitive: { max: 3, windowMs: 15 * 60_000 },  // 3 per 15 min
  /** Public read-only endpoints */
  public: { max: 120, windowMs: 60_000 },        // 120/min
  /** Webhook endpoints (Stripe, etc.) */
  webhook: { max: 100, windowMs: 60_000 },       // 100/min
} as const

// ── Sliding Window Implementation ────────────────────────────────────────────

/**
 * In-memory sliding window rate limiter.
 * Uses a Map<string, number[]> where each key is the identifier
 * and the value is an array of request timestamps.
 */
class MemoryStore {
  private entries = new Map<string, SlidingWindowEntry>()
  private maxEntries = 50_000

  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get or create entry
    let entry = this.entries.get(key)

    if (!entry) {
      // Evict if at capacity
      if (this.entries.size >= this.maxEntries) {
        this.evict(now)
      }
      entry = { timestamps: [] }
      this.entries.set(key, entry)
    }

    // Remove expired timestamps (sliding window)
    entry.timestamps = entry.timestamps.filter(t => t > windowStart)

    const remaining = Math.max(0, config.max - entry.timestamps.length)

    if (entry.timestamps.length >= config.max) {
      // Find the oldest timestamp in the window to calculate reset
      const oldestInWindow = entry.timestamps[0] || now
      const resetMs = oldestInWindow + config.windowMs
      return {
        allowed: false,
        remaining: 0,
        limit: config.max,
        resetMs,
        retryAfterMs: resetMs - now,
      }
    }

    // Record this request
    entry.timestamps.push(now)

    // Calculate when the window resets (based on the first request in the window)
    const resetMs = (entry.timestamps[0] || now) + config.windowMs

    return {
      allowed: true,
      remaining: remaining - 1, // -1 because we just used one
      limit: config.max,
      resetMs,
    }
  }

  /** Remove entries that have no active timestamps */
  private evict(now: number): void {
    const keysToDelete: string[] = []
    let deleted = 0
    const targetDelete = Math.floor(this.maxEntries * 0.2) // Evict 20%

    for (const [key, entry] of this.entries) {
      entry.timestamps = entry.timestamps.filter(t => t > now - 60_000) // 1 min window
      if (entry.timestamps.length === 0) {
        keysToDelete.push(key)
        deleted++
        if (deleted >= targetDelete) break
      }
    }

    for (const key of keysToDelete) {
      this.entries.delete(key)
    }
  }

  /** Delete a specific key */
  delete(key: string): void {
    this.entries.delete(key)
  }

  /** Clear all entries */
  clear(): void {
    this.entries.clear()
  }
}

// ── Rate Limiter Class ───────────────────────────────────────────────────────

export class RateLimiter {
  private store: MemoryStore
  private strategy: Strategy
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(strategy: Strategy = 'memory') {
    this.strategy = strategy
    this.store = new MemoryStore()

    if (this.strategy === 'memory') {
      // Periodic cleanup every 5 minutes
      this.cleanupTimer = setInterval(() => {
        this.store.clear()
      }, 5 * 60_000)
      this.cleanupTimer.unref()
    }
  }

  /**
   * Check if a request is allowed under the rate limit.
   *
   * @param identifier - Unique identifier (IP, userId, etc.)
   * @param config - Rate limit config or a preset name
   */
  check(
    identifier: string,
    config: RateLimitConfig | keyof typeof RATE_PRESETS = 'api',
  ): RateLimitResult {
    const resolvedConfig = typeof config === 'string' ? RATE_PRESETS[config] : config

    return this.store.check(`${this.strategy}:${identifier}`, resolvedConfig)
  }

  /**
   * Convenience method: check and return headers + 429 response if limited.
   *
   * @returns `null` if allowed (attach headers manually), or a 429 Response.
   */
  limit(
    identifier: string,
    config: RateLimitConfig | keyof typeof RATE_PRESETS = 'api',
  ): { allowed: true; headers: Record<string, string> } | { allowed: false; response: Response } {
    const result = this.check(identifier, config)

    const headers = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
    }

    if (!result.allowed) {
      headers['Retry-After'] = String(Math.ceil((result.retryAfterMs || 0) / 1000))

      logger.warn('Rate limit exceeded', 'rate-limiter', {
        identifier,
        limit: result.limit,
        resetMs: result.resetMs,
      })

      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          },
        ),
      }
    }

    return { allowed: true, headers }
  }

  /**
   * Reset rate limit for a specific identifier.
   */
  reset(identifier: string): void {
    this.store.delete(`${this.strategy}:${identifier}`)
  }

  /** Clean up resources */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

const strategy: Strategy = process.env.REDIS_URL ? 'redis' : 'memory'
export const rateLimiter = new RateLimiter(strategy)
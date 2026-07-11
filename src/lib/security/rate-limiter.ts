/**
 * Production rate limiter with fixed-window algorithm.
 *
 * Supports configurable per-endpoint limits, returns proper HTTP headers,
 * and uses a strategy pattern for memory (dev) vs Redis (prod).
 *
 * When `REDIS_URL` is set the limiter transparently switches to a Redis
 * backed store that uses INCR + PEXPIRE in a MULTI transaction so the
 * increment + TTL refresh are atomic.
 */

import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

// ── Types ────────────────────────────────────────────────────────────────────

type Strategy = 'memory' | 'redis'

export interface RateLimitConfig {
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

/**
 * Common store interface that both MemoryStore and RedisStore implement.
 *
 * `increment` atomically bumps the counter for a key within a time window
 * and returns the new count together with the absolute reset timestamp.
 */
export interface Store {
  increment(key: string, windowMs: number): Promise<{ count: number; resetMs: number }>
  get(key: string): Promise<number | undefined>
  reset(key: string): Promise<void>
  cleanup(): Promise<void>
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

// ── Memory Store (fixed-window) ──────────────────────────────────────────────

interface MemoryEntry {
  count: number
  resetMs: number
}

/**
 * In-memory fixed-window rate limit store.
 *
 * Keeps counters in a Map and periodically purges expired entries
 * so memory usage stays bounded.
 */
class MemoryStore implements Store {
  private entries = new Map<string, MemoryEntry>()
  private maxEntries = 50_000
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Purge expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.evictExpired(), 5 * 60_000)
    this.cleanupTimer.unref()
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetMs: number }> {
    const now = Date.now()
    let entry = this.entries.get(key)

    // If no entry or window has expired, start fresh
    if (!entry || now >= entry.resetMs) {
      // Evict if at capacity
      if (!entry && this.entries.size >= this.maxEntries) {
        this.evictExpired()
      }
      entry = { count: 0, resetMs: now + windowMs }
      this.entries.set(key, entry)
    }

    entry.count++

    return { count: entry.count, resetMs: entry.resetMs }
  }

  async get(key: string): Promise<number | undefined> {
    const entry = this.entries.get(key)
    if (!entry || Date.now() >= entry.resetMs) return undefined
    return entry.count
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key)
  }

  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.entries.clear()
  }

  /** Remove entries whose window has expired */
  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetMs) {
        this.entries.delete(key)
      }
    }
  }
}

// ── Rate Limiter Class ───────────────────────────────────────────────────────

export class RateLimiter {
  private store: Store
  private strategy: Strategy

  constructor(strategy: Strategy = 'memory') {
    this.strategy = strategy

    if (strategy === 'redis' && config.redis.url) {
      // Dynamic import to avoid bundling ioredis when not needed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RedisStore } = require('./redis-store') as typeof import('./redis-store')
      this.store = new RedisStore(config.redis.url)
      logger.info('Rate limiter using Redis store', 'rate-limiter')
    } else {
      this.store = new MemoryStore()
    }
  }

  /**
   * Check if a request is allowed under the rate limit.
   *
   * @param identifier - Unique identifier (IP, userId, etc.)
   * @param config - Rate limit config or a preset name
   */
  async check(
    identifier: string,
    config: RateLimitConfig | keyof typeof RATE_PRESETS = 'api',
  ): Promise<RateLimitResult> {
    const resolvedConfig = typeof config === 'string' ? RATE_PRESETS[config] : config
    const key = `${this.strategy}:${identifier}`

    const { count, resetMs } = await this.store.increment(key, resolvedConfig.windowMs)

    const remaining = Math.max(0, resolvedConfig.max - count)
    const now = Date.now()

    if (count > resolvedConfig.max) {
      return {
        allowed: false,
        remaining: 0,
        limit: resolvedConfig.max,
        resetMs,
        retryAfterMs: Math.max(0, resetMs - now),
      }
    }

    return {
      allowed: true,
      remaining: remaining - 1, // -1 because we just used one
      limit: resolvedConfig.max,
      resetMs,
    }
  }

  /**
   * Convenience method: check and return headers + 429 response if limited.
   *
   * @returns `null` if allowed (attach headers manually), or a 429 Response.
   */
  async limit(
    identifier: string,
    config: RateLimitConfig | keyof typeof RATE_PRESETS = 'api',
  ): Promise<{ allowed: true; headers: Record<string, string> } | { allowed: false; response: Response }> {
    const result = await this.check(identifier, config)

    const headers: Record<string, string> = {
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
  async reset(identifier: string): Promise<void> {
    await this.store.reset(`${this.strategy}:${identifier}`)
  }

  /** Clean up resources (Redis connection, timers, etc.) */
  async destroy(): Promise<void> {
    await this.store.cleanup()
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

const strategy: Strategy = config.redis.isEnabled ? 'redis' : 'memory'
export const rateLimiter = new RateLimiter(strategy)
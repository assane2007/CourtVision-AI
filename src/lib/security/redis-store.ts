/**
 * Redis-backed rate limit store.
 *
 * Uses INCR + PEXPIRE within a MULTI/EXEC transaction for atomic
 * fixed-window rate limiting.  Falls back gracefully when Redis is
 * unavailable.
 *
 * Only connects on first use (lazyConnect) so the import cost is
 * near-zero when REDIS_URL is not set.
 */

import Redis from 'ioredis'
import { logger } from '@/lib/logger'
import type { Store } from './rate-limiter'

export class RedisStore implements Store {
  private redis: Redis
  private connected = false

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        // Exponential back-off capped at 2 s
        return Math.min(times * 200, 2000)
      },
      enableReadyCheck: true,
    })

    this.redis.on('ready', () => {
      this.connected = true
      logger.info('Redis store connected', 'rate-limiter')
    })

    this.redis.on('error', (err) => {
      logger.error(`Redis store error: ${err.message}`, 'rate-limiter')
    })

    this.redis.on('close', () => {
      this.connected = false
      logger.warn('Redis store connection closed', 'rate-limiter')
    })
  }

  /**
   * Atomically increment the counter for `key` and set / refresh its TTL.
   *
   * Uses MULTI/EXEC so INCR + PEXPIRE are executed as a single atomic
   * operation — no race conditions between concurrent requests.
   *
   * @returns The new count and the absolute timestamp (ms) when the window resets.
   */
  async increment(key: string, windowMs: number): Promise<{ count: number; resetMs: number }> {
    // Ensure connection before operating
    if (!this.connected) {
      await this.redis.connect().catch((err) => {
        throw new Error(`Redis connect failed: ${err.message}`)
      })
    }

    const results = await this.redis
      .multi()
      .incr(key)
      .pexpire(key, windowMs)          // set / refresh TTL in milliseconds
      .pttl(key)                       // -2 if key doesn't exist, -1 if no expiry, else remaining ms
      .exec()

    if (!results) {
      throw new Error('Redis MULTI exec returned null')
    }

    // results is [ [err, result], [err, result], [err, result] ]
    const incrErr = results[0]?.[0]
    if (incrErr) throw incrErr

    const count = results[0]?.[1] as number

    // PTTL result: -2 = key expired/missing, -1 = no TTL, else remaining ms
    const pttlResult = results[2]?.[1] as number
    const remainingMs = pttlResult > 0 ? pttlResult : windowMs
    const resetMs = Date.now() + remainingMs

    return { count, resetMs }
  }

  /**
   * Get the current count for a key (or undefined if not set).
   */
  async get(key: string): Promise<number | undefined> {
    if (!this.connected) return undefined

    try {
      const val = await this.redis.get(key)
      return val !== null ? parseInt(val, 10) : undefined
    } catch {
      return undefined
    }
  }

  /**
   * Delete a specific rate-limit key, resetting the window.
   */
  async reset(key: string): Promise<void> {
    if (!this.connected) return
    await this.redis.del(key).catch(() => {})
  }

  /**
   * Gracefully close the Redis connection.
   */
  async cleanup(): Promise<void> {
    try {
      await this.redis.quit()
      this.connected = false
    } catch {
      // Force-close if quit fails
      this.redis.disconnect()
      this.connected = false
    }
  }
}
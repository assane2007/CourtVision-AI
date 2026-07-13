/**
 * Redis cache implementation with fallback to in-memory cache.
 *
 * Features:
 * - Uses ioredis for battle-tested Redis protocol support
 * - Falls back to MemoryCache if Redis is unavailable
 * - Automatic JSON serialization
 * - Key namespacing: cv:{feature}:{key}
 * - Supports tags/invalidation groups
 * - Connection singleton via globalThis (survives hot-reload)
 * - Uses SCAN instead of KEYS for production safety
 * - Pipelines multi-key operations where possible
 *
 * Server-only module.
 */

import Redis from 'ioredis';
import { config } from '@/lib/config';
import { MemoryCache } from './memory-cache';
import type { CacheAdapter, CacheAdapterWithTags, CacheStats, RedisConfig } from './types';

// ── Configuration ──────────────────────────────────────────────────────────────

const DEFAULT_NAMESPACE = 'cv'
const DEFAULT_CONNECT_TIMEOUT = 5000
const DEFAULT_TTL_MS = 5 * 60 * 1000
const SCAN_COUNT = 100

// ── Singleton connection (survives hot-reload) ─────────────────────────────────

const REDIS_SINGLETON_KEY = Symbol.for('redis-cache:client')

function getRedisClient(url: string, connectTimeout: number): Redis {
  const existing = (globalThis as Record<symbol, Redis | undefined>)[REDIS_SINGLETON_KEY]
  if (existing) return existing

  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
  })

  // Store on globalThis for hot-reload persistence
  ;(globalThis as Record<symbol, Redis | undefined>)[REDIS_SINGLETON_KEY] = client
  return client
}

// ── Redis Cache Implementation ──────────────────────────────────────────────────

export class RedisCache implements CacheAdapter, CacheAdapterWithTags {
  private client: Redis | null = null
  private fallback: MemoryCache
  private namespace: string
  private usingFallback = true
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    estimatedBytes: 0,
  }

  constructor(redisConfig: RedisConfig = { url: config.redis.url || '' }) {
    this.namespace = redisConfig.namespace || DEFAULT_NAMESPACE

    // Always have a fallback ready
    this.fallback = new MemoryCache()

    if (!redisConfig.url) {
      // No Redis URL configured, use fallback
      return
    }

    try {
      this.client = getRedisClient(
        redisConfig.url,
        redisConfig.connectTimeout || DEFAULT_CONNECT_TIMEOUT,
      )
      this.usingFallback = false
    } catch {
      // Fallback to memory
      this.usingFallback = true
    }
  }

  private ns(key: string): string {
    return `${this.namespace}:${key}`
  }

  private nsTag(tag: string): string {
    return `${this.namespace}:tag:${tag}`
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.client) return false
    try {
      if (this.client.status === 'ready') return true
      if (this.client.status === 'end') return false
      await this.client.connect()
      return (this.client.status as string) === 'ready'
    } catch {
      return false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.usingFallback || !this.client) {
      return this.fallback.get<T>(key)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.get<T>(key)
      }
      const raw = await this.client.get(this.ns(key))
      if (raw === null) {
        this.stats.misses++
        return null
      }
      this.stats.hits++
      return JSON.parse(raw) as T
    } catch {
      this.switchToFallback()
      return this.fallback.get<T>(key)
    }
  }

  async set(
    key: string,
    value: unknown,
    ttl: number = DEFAULT_TTL_MS,
    tags: string[] = [],
  ): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.set(key, value, ttl, tags)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.set(key, value, ttl, tags)
      }

      const ttlSec = Math.max(1, Math.round(ttl / 1000))
      const serialized = JSON.stringify(value)
      const nsKey = this.ns(key)

      if (tags.length === 0) {
        await this.client.set(nsKey, serialized, 'EX', ttlSec)
      } else {
        // Pipeline SET + all SADD operations together
        const pipeline = this.client.pipeline()
        pipeline.set(nsKey, serialized, 'EX', ttlSec)
        for (const tag of tags) {
          pipeline.sadd(this.nsTag(tag), nsKey)
        }
        await pipeline.exec()
      }
    } catch {
      this.switchToFallback()
      return this.fallback.set(key, value, ttl, tags)
    }
  }

  async delete(key: string): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.delete(key)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.delete(key)
      }
      await this.client.del(this.ns(key))
    } catch {
      this.switchToFallback()
      return this.fallback.delete(key)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.usingFallback || !this.client) {
      return this.fallback.exists(key)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.exists(key)
      }
      const result = await this.client.exists(this.ns(key))
      return result === 1
    } catch {
      this.switchToFallback()
      return this.fallback.exists(key)
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (this.usingFallback || !this.client) {
      return this.fallback.increment(key, amount)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.increment(key, amount)
      }
      const result = await this.client.incrby(this.ns(key), amount)
      this.stats.hits++
      return result
    } catch {
      this.switchToFallback()
      return this.fallback.increment(key, amount)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.usingFallback || !this.client) {
      return this.fallback.keys(pattern)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.keys(pattern)
      }

      // Use SCAN instead of KEYS for production safety
      const fullPattern = this.ns(pattern)
      const allKeys: string[] = []
      let cursor = '0'

      do {
        const [nextCursor, matchedKeys] = await this.client.scan(
          Number(cursor),
          'MATCH',
          fullPattern,
          'COUNT',
          SCAN_COUNT,
        )
        cursor = String(nextCursor)
        if (matchedKeys.length > 0) {
          allKeys.push(...matchedKeys)
        }
      } while (cursor !== '0')

      // Remove namespace prefix from returned keys
      const prefix = `${this.namespace}:`
      return allKeys.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k))
    } catch {
      this.switchToFallback()
      return this.fallback.keys(pattern)
    }
  }

  async flush(): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.flush()
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.flush()
      }
      await this.client.flushdb()
    } catch {
      this.switchToFallback()
      return this.fallback.flush()
    }
  }

  async healthCheck(): Promise<boolean> {
    if (this.usingFallback || !this.client) {
      return this.fallback.healthCheck()
    }

    try {
      if (!(await this.ensureConnected())) return false
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.invalidateTags(tags)
    }

    try {
      if (!(await this.ensureConnected())) {
        this.switchToFallback()
        return this.fallback.invalidateTags(tags)
      }

      for (const tag of tags) {
        const tagKey = this.nsTag(tag)
        const members = await this.client.smembers(tagKey)
        if (members.length > 0) {
          // Pipeline the DEL of cached keys and the tag set itself
          const pipeline = this.client.pipeline()
          pipeline.del(...members)
          pipeline.del(tagKey)
          await pipeline.exec()
        } else {
          await this.client.del(tagKey)
        }
      }
    } catch {
      this.switchToFallback()
      return this.fallback.invalidateTags(tags)
    }
  }

  getStats(): CacheStats {
    if (this.usingFallback) {
      return this.fallback.getStats()
    }
    return { ...this.stats }
  }

  async destroy(): Promise<void> {
    if (this.client && this.client.status !== 'end') {
      try {
        await this.client.quit()
      } catch {
        // Force close if quit fails
        this.client.disconnect()
      }
    }
    await this.fallback.destroy()
  }

  private switchToFallback(): void {
    if (!this.usingFallback) {
      this.usingFallback = true
      // Don't close the client — ioredis has its own reconnection logic
    }
  }
}
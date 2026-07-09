/**
 * Cache module — auto-selects adapter based on environment.
 *
 * - REDIS_URL env var set → RedisCache (with automatic fallback to memory)
 * - Otherwise → MemoryCache (in-process LRU with TTL)
 *
 * Server-only module.
 */

import { config } from '@/lib/config'
import { MemoryCache } from './memory-cache'
import { RedisCache } from './redis-cache'
import type { CacheAdapter, CacheAdapterWithTags } from './types'

// ── Adapter Selection ───────────────────────────────────────────────────────────

function createCache(): CacheAdapter & CacheAdapterWithTags {
  if (config.redis.url) {
    return new RedisCache({ url: config.redis.url })
  }
  return new MemoryCache()
}

// ── Singleton ───────────────────────────────────────────────────────────────────

// Use globalThis to survive hot-reloads in development
const globalForCache = globalThis as unknown as {
  courtvisionCache: (CacheAdapter & CacheAdapterWithTags) | undefined
}

const _cache: CacheAdapter & CacheAdapterWithTags =
  globalForCache.courtvisionCache ?? createCache()

if (!globalForCache.courtvisionCache) {
  globalForCache.courtvisionCache = _cache
}

/**
 * The application cache instance.
 *
 * @example
 * // Basic get/set
 * await cache.set('player:123:profile', playerData, 300_000)
 * const data = await cache.get<PlayerProfile>('player:123:profile')
 *
 * // With tags for group invalidation
 * await cache.set('drill:45:stats', stats, 300_000, ['drill:45', 'drills:all'])
 * await cache.invalidateTags(['drill:45']) // invalidates all keys tagged 'drill:45'
 */
export const cache = _cache

// ── Re-exports ──────────────────────────────────────────────────────────────────

export type { CacheAdapter, CacheAdapterWithTags, CacheConfig, CacheStats, RedisConfig } from './types'
export { MemoryCache } from './memory-cache'
export { RedisCache } from './redis-cache'
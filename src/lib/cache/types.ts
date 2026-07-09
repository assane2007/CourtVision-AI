/**
 * Cache adapter interface and types.
 * Server-only module.
 */

// ── Cache Adapter Interface ─────────────────────────────────────────────────────

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number, tags?: string[]): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  increment(key: string, amount?: number): Promise<number>
  keys(pattern: string): Promise<string[]>
  flush(): Promise<void>
  healthCheck(): Promise<boolean>
}

// ── Extended interface for tag support ──────────────────────────────────────────

export interface CacheAdapterWithTags extends CacheAdapter {
  invalidateTags(tags: string[]): Promise<void>
}

// ── Cache Statistics ────────────────────────────────────────────────────────────

export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
  estimatedBytes: number
}

// ── Cache Configuration ─────────────────────────────────────────────────────────

export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTtl?: number
  /** Maximum entries for memory cache */
  maxEntries?: number
  /** Key namespace prefix */
  namespace?: string
  /** Cleanup interval in ms */
  cleanupIntervalMs?: number
}

// ── Redis Configuration ─────────────────────────────────────────────────────────

export interface RedisConfig {
  url: string
  namespace?: string
  connectTimeout?: number
  maxRetries?: number
}
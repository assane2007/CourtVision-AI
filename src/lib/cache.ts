/**
 * Server-side in-memory cache with TTL and LRU eviction.
 * Not for use on the client side.
 */

const MAX_ENTRIES = 500
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
  lastAccessed: number
}

// Ordered map: most-recently-used at the end for easy eviction
const store = new Map<string, CacheEntry>()

// ── Auto-cleanup timer ─────────────────────────────────────────────────────────

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Allow the process to exit even if the timer is active
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

// Start cleanup on first import
startCleanup()

// ── Core API ───────────────────────────────────────────────────────────────────

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }

  // Touch for LRU
  entry.lastAccessed = Date.now()
  // Move to end of Map (most recently used)
  store.delete(key)
  store.set(key, entry)
  return entry.value as T
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  // Evict oldest entries if at capacity
  while (store.size >= MAX_ENTRIES) {
    // Map iterates in insertion order — first key is the oldest
    const oldestKey = store.keys().next().value
    if (oldestKey !== undefined) {
      store.delete(oldestKey)
    } else {
      break
    }
  }

  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    lastAccessed: Date.now(),
  })
}

export function cacheInvalidate(key: string): void {
  store.delete(key)
}

/**
 * Invalidate all keys matching a glob-like pattern.
 * Supports a single trailing wildcard: "drills:*" matches "drills:abc", "drills:def", etc.
 */
export function cacheInvalidatePattern(pattern: string): void {
  if (!pattern.includes('*')) {
    cacheInvalidate(pattern)
    return
  }

  const prefix = pattern.slice(0, pattern.indexOf('*'))
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

// ── Higher-order helper ────────────────────────────────────────────────────────

/**
 * Wrap an async fetcher with caching.
 * If a valid cached entry exists for `key`, returns it immediately.
 * Otherwise calls `fetcher()`, caches the result, and returns it.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key)
  if (cached !== null) return cached

  const result = await fetcher()
  cacheSet(key, result, ttlMs)
  return result
}
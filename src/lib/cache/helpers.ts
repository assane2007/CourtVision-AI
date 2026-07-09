/**
 * Cache helper functions for common caching patterns.
 *
 * Server-only module.
 */

import { cache } from '.'

// ── Cached Get ──────────────────────────────────────────────────────────────────

/**
 * Fetch a value with automatic caching.
 * If the key exists in cache and is valid, returns it.
 * Otherwise calls the fetcher, caches the result, and returns it.
 *
 * @example
 * const profile = await cachedGet(
 *   'player:123:profile',
 *   () => db.player.findUnique({ where: { id: '123' } }),
 *   300_000, // 5 min TTL
 *   ['player:123', 'profiles']
 * )
 */
export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000,
  tags: string[] = [],
): Promise<T> {
  const cached = await cache.get<T>(key)
  if (cached !== null) return cached

  const result = await fetcher()
  await cache.set(key, result, ttlMs, tags)
  return result
}

// ── Cached Get with Stale-While-Revalidate ──────────────────────────────────────

/**
 * Like cachedGet but returns stale data immediately while refreshing in the background.
 * Useful for data that changes infrequently and brief staleness is acceptable.
 *
 * @example
 * const leaderboard = await cachedGetStale(
 *   'leaderboard:global',
 *   () => db.player.findMany({ orderBy: { xp: 'desc' }, take: 50 }),
 *   300_000,
 *   600_000, // serve stale for up to 10 min
 *   ['leaderboard']
 * )
 */
export async function cachedGetStale<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000,
  staleWhileRevalidateMs: number = 10 * 60 * 1000,
  tags: string[] = [],
): Promise<T> {
  const cached = await cache.get<T>(key)

  if (cached !== null) {
    // Check if we should revalidate in the background
    const raw = await cache.get<{ expiresAt: number }>(`${key}:meta`)
    if (raw && Date.now() > raw.expiresAt - staleWhileRevalidateMs) {
      // Revalidate in background (fire-and-forget)
      fetcher()
        .then((result) => cache.set(key, result, ttlMs, tags))
        .catch(() => { /* ignore revalidation errors */ })
    }
    return cached
  }

  const result = await fetcher()
  await cache.set(key, result, ttlMs, tags)
  return result
}

// ── Invalidation Helpers ────────────────────────────────────────────────────────

/**
 * Invalidate all cache keys matching a pattern.
 * Supports a single trailing wildcard: "player:123:*"
 *
 * @example
 * await invalidatePattern('player:123:*')  // invalidates player:123:profile, player:123:stats, etc.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const matchingKeys = await cache.keys(pattern)
  for (const key of matchingKeys) {
    await cache.delete(key)
  }
}

/**
 * Invalidate all keys associated with the given tags.
 *
 * @example
 * await invalidateTags(['player:123', 'drills:all'])
 */
export async function invalidateTags(tags: string[]): Promise<void> {
  if ('invalidateTags' in cache && typeof cache.invalidateTags === 'function') {
    await cache.invalidateTags(tags)
  } else {
    // Fallback: pattern-based invalidation for each tag
    for (const tag of tags) {
      await invalidatePattern(`${tag}:*`)
    }
  }
}

// ── Cache Warming ───────────────────────────────────────────────────────────────

/**
 * Pre-warm multiple cache entries in parallel.
 * Useful during server startup or after deployment.
 *
 * @example
 * await prewarm(
 *   ['leaderboard:global', 'drills:featured', 'challenges:active'],
 *   new Map([
 *     ['leaderboard:global', () => fetchGlobalLeaderboard()],
 *     ['drills:featured', () => fetchFeaturedDrills()],
 *     ['challenges:active', () => fetchActiveChallenges()],
 *   ])
 * )
 */
export async function prewarm(
  keys: string[],
  fetchers: Map<string, () => Promise<unknown>>,
  ttlMs: number = 5 * 60 * 1000,
  tags: string[] = [],
): Promise<{ key: string; status: 'hit' | 'warmed' | 'error'; durationMs: number }[]> {
  const results = await Promise.allSettled(
    keys.map(async (key): Promise<{ key: string; status: 'hit' | 'warmed' | 'error'; durationMs: number }> => {
      const start = performance.now()
      const fetcher = fetchers.get(key)

      if (!fetcher) {
        return { key, status: 'error', durationMs: Math.round(performance.now() - start) }
      }

      try {
        const cached = await cache.get(key)
        if (cached !== null) {
          return { key, status: 'hit', durationMs: Math.round(performance.now() - start) }
        }

        const value = await fetcher()
        await cache.set(key, value, ttlMs, tags)
        return { key, status: 'warmed', durationMs: Math.round(performance.now() - start) }
      } catch {
        return { key, status: 'error', durationMs: Math.round(performance.now() - start) }
      }
    }),
  )

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { key: 'unknown', status: 'error' as const, durationMs: 0 },
  )
}

// ── Rate-Limited Cache Key ──────────────────────────────────────────────────────

/**
 * Generate a stable cache key from a URL request.
 * Includes path and query params (excluding nocache).
 */
export function cacheKeyFromRequest(req: Request): string {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.search)

  // Remove nocache param for stable keys
  params.delete('nocache')

  const queryString = params.toString()
  return queryString ? `${url.pathname}?${queryString}` : url.pathname
}

/**
 * Check if a request explicitly bypasses cache via ?nocache=1
 */
export function isNoCacheRequest(req: Request): boolean {
  return new URL(req.url).searchParams.get('nocache') === '1'
}
/**
 * Response cache middleware for API route handlers.
 *
 * Wraps Next.js route handlers with transparent caching:
 * - Caches GET responses with configurable TTL
 * - Supports custom cache key generation
 * - Tag-based invalidation for mutation endpoints
 * - Automatically skips cache on ?nocache=1
 * - Sets appropriate Cache-Control headers
 *
 * Server-only module.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { cacheKeyFromRequest, isNoCacheRequest, invalidateTags, invalidatePattern } from '@/lib/cache/helpers'

// ── Types ───────────────────────────────────────────────────────────────────────

type RouteHandler = (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

export interface WithCacheOptions {
  /** TTL in seconds (default: 60) */
  ttl?: number
  /** Custom cache key from request */
  key?: (req: NextRequest) => string
  /** Tags for group invalidation */
  tags?: string[]
  /** Cache key prefix (default: 'resp') */
  prefix?: string
  /** Custom Cache-Control header value */
  cacheControl?: string
  /** Whether to cache non-200 responses (default: false) */
  cacheErrors?: boolean
}

interface CachedResponse {
  status: number
  headers: Record<string, string>
  body: string
  cachedAt: number
}

// ── Response Cache Wrapper ──────────────────────────────────────────────────────

/**
 * Wrap a GET route handler with response caching.
 *
 * @example
 * export const GET = withCache(
 *   { ttl: 60, tags: ['drills', 'category:shooting'] },
 *   async (req) => {
 *     const drills = await db.drill.findMany({ ... })
 *     return NextResponse.json(drills)
 *   }
 * )
 */
export function withCache(
  options: WithCacheOptions,
  handler: RouteHandler,
): RouteHandler {
  const {
    ttl = 60,
    key: keyFn,
    tags = [],
    prefix = 'resp',
    cacheControl: customCacheControl,
    cacheErrors = false,
  } = options

  return async (req, ctx) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      const response = await handler(req, ctx)
      // Invalidate related tags on mutations
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        if (tags.length > 0) {
          await invalidateTags(tags)
        }
      }
      return response
    }

    // Skip cache if ?nocache=1
    if (isNoCacheRequest(req)) {
      const response = await handler(req, ctx)
      response.headers.set('Cache-Control', 'no-store')
      response.headers.set('X-Cache', 'BYPASS')
      return response
    }

    // Generate cache key
    const cacheKey = keyFn
      ? `${prefix}:${keyFn(req)}`
      : `${prefix}:${cacheKeyFromRequest(req)}`

    // Check cache
    const cached = await cache.get<CachedResponse>(cacheKey)
    if (cached) {
      const response = new NextResponse(cached.body, {
        status: cached.status,
        headers: new Headers(cached.headers),
      })
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('X-Cache-Age', String(Math.round((Date.now() - cached.cachedAt) / 1000)))
      return response
    }

    // Execute handler
    const response = await handler(req, ctx)

    // Only cache successful responses (or errors if enabled)
    const status = response.status
    if ((status >= 200 && status < 300) || cacheErrors) {
      const body = await response.clone().text()
      const headers: Record<string, string> = {}
      response.headers.forEach((value, name) => {
        headers[name] = value
      })

      const cachedResponse: CachedResponse = {
        status,
        headers,
        body,
        cachedAt: Date.now(),
      }

      await cache.set(cacheKey, cachedResponse, ttl * 1000, tags)
    }

    // Set Cache-Control header
    const cc = customCacheControl || `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
    response.headers.set('Cache-Control', cc)
    response.headers.set('X-Cache', 'MISS')

    return response
  }
}

// ── Invalidation Helper for Mutations ───────────────────────────────────────────

/**
 * Create a mutation handler that invalidates cache after the mutation.
 *
 * @example
 * export const POST = withInvalidation(
 *   { tags: ['drills', 'drills:all'], patterns: ['resp:drills:*'] },
 *   async (req) => {
 *     const drill = await db.drill.create({ data: ... })
 *     return NextResponse.json(drill, { status: 201 })
 *   }
 * )
 */
export function withInvalidation(
  options: {
    tags?: string[]
    patterns?: string[]
  },
  handler: RouteHandler,
): RouteHandler {
  const { tags = [], patterns = [] } = options

  return async (req, ctx) => {
    const response = await handler(req, ctx)

    // Invalidate after successful mutation
    if (response.status >= 200 && response.status < 300) {
      const invalidations: Promise<void>[] = []

      if (tags.length > 0) {
        invalidations.push(invalidateTags(tags))
      }
      for (const pattern of patterns) {
        invalidations.push(invalidatePattern(pattern))
      }

      await Promise.allSettled(invalidations)
    }

    response.headers.set('X-Cache-Invalidated', 'true')
    return response
  }
}
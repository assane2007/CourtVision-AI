/**
 * withRateLimit — Higher-order function that wraps Next.js route handlers
 * with rate limiting, returning proper 429 responses when limits are exceeded.
 *
 * @example
 * ```ts
 * export const POST = withRateLimit({ max: 5, windowMs: 60_000 }, async (req) => {
 *   return NextResponse.json({ ok: true })
 * })
 * ```
 *
 * @example (using a preset)
 * ```ts
 * export const POST = withRateLimit('auth', async (req) => {
 *   return NextResponse.json({ ok: true })
 * })
 * ```
 */

import { NextResponse } from 'next/server'
import { rateLimiter, RATE_PRESETS } from './rate-limiter'
import type { RateLimitConfig } from './rate-limiter'

type RouteHandlerFn = (req: Request, context?: Record<string, unknown>) => Promise<NextResponse> | NextResponse

/**
 * Wrap a route handler with rate limiting.
 *
 * The rate limiter will:
 * - Extract identifier from IP (x-forwarded-for) or fallback to 'unknown'
 * - Apply the specified limit (preset or custom)
 * - Return 429 with Retry-After header when exceeded
 * - Attach X-RateLimit-* headers to successful responses
 */
export function withRateLimit(
  config: RateLimitConfig | keyof typeof RATE_PRESETS,
  handler: RouteHandlerFn,
): RouteHandlerFn {
  return async (req, context) => {
    // Extract identifier from IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    // Include the URL path for per-endpoint rate limiting
    const url = new URL(req.url)
    const identifier = `${ip}:${url.pathname}`

    const result = rateLimiter.limit(identifier, config)

    // Rate limited — return 429
    if (!result.allowed) {
      return result.response as unknown as NextResponse
    }

    // Call the handler
    const response = await handler(req, context)

    // Attach rate limit headers to the response
    const newHeaders = new Headers(response.headers)
    for (const [key, value] of Object.entries(result.headers)) {
      newHeaders.set(key, value)
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }
}
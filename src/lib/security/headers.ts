/**
 * CORS & Security Headers for production.
 *
 * Provides:
 * - securityHeaders() → standard security response headers
 * - withSecurityHeaders(handler) → wraps a route handler to add headers
 */

import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

// ── Types ────────────────────────────────────────────────────────────────────

type HandlerFn = (req: Request, context?: Record<string, unknown>) => Promise<NextResponse> | NextResponse

// ── Security Headers ─────────────────────────────────────────────────────────

/**
 * Returns the standard set of security headers to add to responses.
 */
export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'SAMEORIGIN',

    // Legacy XSS protection (older browsers)
    'X-XSS-Protection': '1; mode=block',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Restrict browser features
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',

    // Cross-origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',

    // Cache control for API responses
    'Cache-Control': 'no-store, max-age=0',

    // API versioning
    'X-API-Version': 'v1',
    'X-API-Deprecated': 'false',
  }

  // HSTS — only in production with HTTPS
  if (config.env.isProd) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }

  // Content Security Policy — only in production
  if (config.env.isProd) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  }

  return headers
}

/**
 * CORS headers for allowed origins.
 * In production, this should be configured to specific allowed domains.
 */
export function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = config.security.allowedOrigins

  // In development, allow all origins
  const isAllowed = config.env.isDev
    || !origin
    || allowedOrigins.includes(origin)

  if (!isAllowed) {
    return {}
  }

  const responseOrigin = (origin && allowedOrigins.includes(origin)) ? origin : (allowedOrigins[0] || '*')

  return {
    'Access-Control-Allow-Origin': responseOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Device-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours preflight cache
  }
}

// ── Handler Wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps a route handler to automatically add security headers to the response.
 *
 * @example
 * ```ts
 * export const GET = withSecurityHeaders(async (req) => {
 *   return NextResponse.json({ data: 'hello' })
 * })
 * ```
 */
export function withSecurityHeaders(handler: HandlerFn): HandlerFn {
  return async (req, context) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      const origin = req.headers.get('origin') || undefined
      const headers = {
        ...securityHeaders(),
        ...corsHeaders(origin),
      }
      return new NextResponse(null, { status: 204, headers })
    }

    const response = await handler(req, context)

    // Merge security headers into the response
    const newHeaders = new Headers(response.headers)
    const secHeaders = securityHeaders()

    // Add CORS headers
    const origin = req.headers.get('origin') || undefined
    const cors = corsHeaders(origin)

    for (const [key, value] of Object.entries({ ...secHeaders, ...cors })) {
      // Don't override headers the handler explicitly set
      if (!newHeaders.has(key)) {
        newHeaders.set(key, value)
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }
}
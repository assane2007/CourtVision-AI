import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// ── Routes that DON'T require authentication ─────────────────────────────────

const PUBLIC_PATHS = [
  '/api/health',
  '/api/privacy',
  '/api/auth',
  '/api/drills',  // seed drills visible before login
  '/manifest.json',
  '/icon-',
  '/sw.js',
  '/',
  '/monitoring', // Sentry tunnel route
]

// ── Suspicious User-Agent patterns ───────────────────────────────────────────

const SUSPICIOUS_UA_PATTERNS = [
  // Known bot/scanner signatures
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /hydra/i,
  /burpsuite/i,
  /zgrab/i,
  /httpx/i,
  // Generic scanner patterns
  /python-requests\/\d+\.\d+/i,
  /go-http-client/i,
  /java\/\d/i,
  /httpclient/i,
  /curl\//i, // curl is often used for scraping, but allow in dev
  /wget\//i,
  // Empty or missing UA (most legitimate browsers send one)
]

// ── Auth endpoint paths (stricter rate limiting) ─────────────────────────────

const AUTH_PATHS = [
  '/api/auth/signup',
  '/api/auth/reset-password',
  '/api/auth/2fa',
]

// ── Simple in-memory rate counter for middleware ─────────────────────────────

const rateCounters = new Map<string, { count: number; resetAt: number }>()

function middlewareRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = rateCounters.get(key)

  if (!entry || now > entry.resetAt) {
    rateCounters.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

// Cleanup timer for rate counters (variable referenced to prevent GC in Edge Runtime)
const _cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateCounters) {
    if (entry.resetAt < now) {
      rateCounters.delete(key)
    }
  }
}, 5 * 60 * 1000)
// Note: unref() is not available in Edge Runtime; timer will keep process alive

// ── Main Middleware ───────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next()

  // ── Block suspicious user agents ────────────────────────────────────────
  const userAgent = request.headers.get('user-agent') || ''

  if (userAgent) {
    // In development, allow curl and common tools
    const isDev = process.env.NODE_ENV !== 'production'

    for (const pattern of SUSPICIOUS_UA_PATTERNS) {
      // Skip curl/wget checks in dev
      if (isDev && (pattern.source === 'curl\\/' || pattern.source === 'wget\\/')) {
        continue
      }

      if (pattern.test(userAgent)) {
        logger.warn('Blocked request from suspicious user agent', 'middleware', {
          ua: userAgent.slice(0, 100),
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
          path: pathname,
        })
        return new NextResponse(
          JSON.stringify({ error: 'Request blocked' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
    }
  }

  // ── Allow public routes ─────────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return response
  }

  // ── Rate limit auth endpoints more strictly ─────────────────────────────
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateResult = middlewareRateLimit(`auth-mw:${ip}`, 10, 60_000) // 10/min

    if (!rateResult.allowed) {
      logger.warn('Auth rate limit exceeded in middleware', 'middleware', {
        ip,
        path: pathname,
      })
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)),
          },
        },
      )
    }
  }

  // ── For API routes (except public ones), check for session cookie ───────
  if (pathname.startsWith('/api/')) {
    const sessionToken = request.cookies.get('next-auth.session-token')
      || request.cookies.get('__Secure-next-auth.session-token')
    if (!sessionToken) {
      // Also accept our custom access token in Authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        logger.info('API request rejected: no session or access token', 'middleware', {
          path: pathname,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        })
        return new NextResponse(
          JSON.stringify({ error: 'Non autorisé' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and Sentry tunnel route internals
    '/((?!_next/static|_next/image|favicon.ico|icon-|sw.js).*)',
  ],
}
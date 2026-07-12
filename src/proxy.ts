import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
 // ── Routes that DON'T require authentication ─────────────────────────────────

const PUBLIC_PATHS = [
  '/api/health',
  '/api/privacy',
  '/api/auth',
  '/api/drills',
  '/manifest.json',
  '/icon-',
  '/sw.js',
  '/',
  '/monitoring',
]

// ── Main Proxy (replaces deprecated middleware) ──────────────────────────────
// Next.js 16 renamed the "middleware" file convention to "proxy".
// The function signature and config are identical.

export async function proxy(request: NextRequest) {
  const startTime = performance.now()

  // ── 1. Request ID for distributed tracing ────────────────────────────────
  const incomingId = request.headers.get('x-request-id')
  const requestId =
    incomingId && incomingId.length <= 128
      ? incomingId
      : `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  // ── 2. Refresh Supabase auth session ──────────────────────────────────────
  const { supabaseResponse, user } = await updateSession(request)

  // ── 3. Performance headers ────────────────────────────────────────────────
  supabaseResponse.headers.set('X-Request-ID', requestId)
  const durationMs = Math.round(performance.now() - startTime)
  supabaseResponse.headers.set('X-Response-Time', `${durationMs}ms`)

  const { pathname } = request.nextUrl

  // ── Allow public routes ───────────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return supabaseResponse
  }

  // ── For API routes (except public ones), check for Supabase session ───────
  if (pathname.startsWith('/api/')) {
    if (!user) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
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

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets (images, fonts, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)',
  ],
}
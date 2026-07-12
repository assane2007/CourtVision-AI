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

// ── Inject Supabase token from x-sb-token header ─────────────────────────────
// Required for Safari/iframe environments where third-party cookies are blocked.
function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? ''
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token')
  if (!token) return
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'))
  if (hasCookie) return
  const ref = getProjectRef()
  if (ref) {
    request.cookies.set(`sb-${ref}-auth-token`, token)
  }
}

// ── Main Middleware ───────────────────────────────────────────────────────────
// NOTE: Next.js 16 renamed this convention to "proxy" (src/proxy.ts).
// This file is kept for compatibility. The function name "middleware" is
// deprecated but still functional — it will print a one-time warning at startup.
// When the sandbox allows file deletion, migrate to src/proxy.ts exclusively.

export async function middleware(request: NextRequest) {
  const startTime = performance.now()

  // ── 1. Request ID for distributed tracing ────────────────────────────────
  const incomingId = request.headers.get('x-request-id')
  const requestId =
    incomingId && incomingId.length <= 128
      ? incomingId
      : `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  // ── 2. Inject token from header (Safari/iframe support) ───────────────────
  injectTokenFromHeader(request)

  // ── 3. Refresh Supabase auth session ──────────────────────────────────────
  const { supabaseResponse, user } = await updateSession(request)

  // ── 4. Performance headers ────────────────────────────────────────────────
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
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)',
  ],
}

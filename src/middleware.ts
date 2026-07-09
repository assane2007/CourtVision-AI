import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that DON'T require authentication
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
  '/api/sentry-test', // Debug endpoint
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // For API routes (except public ones), check for session cookie
  if (pathname.startsWith('/api/')) {
    // We can't fully validate the JWT in middleware (no secret access),
    // but we can ensure the session cookie exists
    const sessionToken = request.cookies.get('next-auth.session-token')
      || request.cookies.get('__Secure-next-auth.session-token')
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and Sentry tunnel route internals
    '/((?!_next/static|_next/image|favicon.ico|icon-|sw.js).*)',
  ],
}
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon-512.png|manifest.json|sw.js|drill-demos).*)',
  ],
}
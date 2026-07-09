import { NextResponse } from 'next/server'
import { revokeRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/revoke
 *
 * Revokes a refresh token so it can no longer be used.
 */
export async function POST(request: Request) {
  try {
    // Rate limit by client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateResult = rateLimit(`revoke:${ip}`, 10, 60 * 1000) // 10/min
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      )
    }

    const body = await request.json()
    const { refreshToken: token } = body as { refreshToken?: string }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 },
      )
    }

    const sanitizedToken = token.trim()

    // Quick signature/expiry check before DB lookup
    const payload = verifyRefreshToken(sanitizedToken)
    if (!payload) {
      // Still return success to avoid leaking info about the token
      logger.warn('Invalid token submitted for revocation', 'auth-revoke', { ip })
      return NextResponse.json({ success: true })
    }

    const revoked = await revokeRefreshToken(sanitizedToken)

    if (revoked) {
      logger.info('Refresh token revoked', 'auth-revoke', {
        playerId: payload.sub,
        jti: payload.jti,
        ip,
      })
    }

    // Always return success to avoid information leakage
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Unexpected error in revoke endpoint', 'auth-revoke', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
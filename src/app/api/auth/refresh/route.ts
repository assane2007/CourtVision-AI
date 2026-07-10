import { NextResponse } from 'next/server'
import { rotateRefreshToken, verifyRefreshTokenWithDb } from '@/lib/auth/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getClientIp } from '@/lib/security/rate-limit-middleware'

/**
 * POST /api/auth/refresh
 *
 * Rotates a refresh token and returns a new access + refresh pair.
 * This endpoint is public (the refresh token itself is the credential).
 */
export async function POST(request: Request) {
  try {
    // Rate limit by client IP
    const ip = getClientIp(request)
    const rateResult = rateLimit(`refresh:${ip}`, 10, 60 * 1000) // 10/min
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

    // Sanitize token input (just trim — don't strip characters from the JWT itself)
    const sanitizedToken = token.trim()

    // Verify the token is still valid and not revoked
    const verifyResult = await verifyRefreshTokenWithDb(sanitizedToken)
    if (!verifyResult.valid) {
      logger.warn('Refresh token verification failed', 'auth-refresh', {
        error: verifyResult.error,
        ip,
      })
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 },
      )
    }

    // Get user agent for audit trail
    const userAgent = request.headers.get('user-agent') || undefined

    // Rotate the token
    const result = await rotateRefreshToken(sanitizedToken, userAgent)

    if ('error' in result) {
      logger.warn('Refresh token rotation failed', 'auth-refresh', {
        error: result.error,
        ip,
      })
      return NextResponse.json(
        { error: result.error },
        { status: 401 },
      )
    }

    logger.info('Token pair issued via refresh', 'auth-refresh', {
      playerId: verifyResult.payload?.sub,
      ip,
    })

    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    })
  } catch (error) {
    logger.error('Unexpected error in refresh endpoint', 'auth-refresh', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
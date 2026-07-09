/**
 * Production-grade JWT system for CourtVision.
 *
 * Complements NextAuth — provides short-lived access tokens + long-lived
 * refresh tokens with rotation and revocation support.
 *
 * - signAccessToken(payload) → JWT, 15 min expiry
 * - signRefreshToken(payload) → JWT, 7d expiry, stored in DB
 * - verifyAccessToken(token) → decoded payload or null
 * - verifyRefreshToken(token) → decoded payload or null
 * - rotateRefreshToken(oldToken) → { accessToken, refreshToken }
 * - revokeRefreshToken(token)
 */

import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSigningKey(): string {
  // Use JWT_SECRET if set, otherwise fall back to NEXTAUTH_SECRET
  const key = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error('FATAL: JWT_SECRET or NEXTAUTH_SECRET must be set')
  }
  return key
}

/** Generate a unique JWT ID */
function generateJti(): string {
  return crypto.randomUUID()
}

/** Current time in seconds since epoch */
function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

// ── Base64URL encoding (no external JWT lib needed) ───────────────────────────

function base64urlEncode(data: string | Buffer): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlDecode(str: string): string {
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64').toString('utf-8')
}

// ── HMAC-SHA256 JWT implementation ───────────────────────────────────────────

type JwtHeader = { alg: string; typ: string }
type JwtPayload = Record<string, unknown>

function createHmac(key: string, data: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('base64url')
}

function encodeJwt(header: JwtHeader, payload: JwtPayload, key: string): string {
  const h = base64urlEncode(JSON.stringify(header))
  const p = base64urlEncode(JSON.stringify(payload))
  const signature = createHmac(key, `${h}.${p}`)
  return `${h}.${p}.${signature}`
}

/** @internal Decodes a JWT without verifying the signature. Used for debugging. */
function _decodeJwt(token: string): { header: JwtHeader; payload: JwtPayload; signature: string } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const header = JSON.parse(base64urlDecode(parts[0])) as JwtHeader
    const payload = JSON.parse(base64urlDecode(parts[1])) as JwtPayload
    return { header, payload, signature: parts[2] }
  } catch {
    return null
  }
}

function verifyJwtSignature(token: string, key: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const expectedSignature = createHmac(key, `${parts[0]}.${parts[1]}`)
  // Timing-safe comparison
  const sigBuf = Buffer.from(parts[2])
  const expectedBuf = Buffer.from(expectedSignature)

  if (sigBuf.length !== expectedBuf.length) return null
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

  try {
    return JSON.parse(base64urlDecode(parts[1])) as JwtPayload
  } catch {
    return null
  }
}

// ── Token type definitions ───────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string        // Player ID
  email: string
  name: string
  role: string
  jti: string
  iss: string
  iat: number
  exp: number
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string        // Player ID
  jti: string
  iss: string
  iat: number
  exp: number
  type: 'refresh'
}

const ISSUER = 'courtvision'
const ACCESS_TOKEN_TTL = 15 * 60         // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Sign a short-lived access token.
 */
export function signAccessToken(player: {
  id: string
  email: string
  name: string
  role?: string
}): string {
  const key = getSigningKey()
  const now = nowSec()

  const payload: AccessTokenPayload = {
    sub: player.id,
    email: player.email,
    name: player.name,
    role: player.role || 'user',
    jti: generateJti(),
    iss: ISSUER,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL,
    type: 'access',
  }

  return encodeJwt({ alg: 'HS256', typ: 'JWT' }, payload, key)
}

/**
 * Sign a long-lived refresh token and persist it in the DB.
 */
export async function signRefreshToken(
  playerId: string,
  userAgent?: string,
): Promise<string> {
  const key = getSigningKey()
  const now = nowSec()
  const jti = generateJti()

  const payload: RefreshTokenPayload = {
    sub: playerId,
    jti,
    iss: ISSUER,
    iat: now,
    exp: now + REFRESH_TOKEN_TTL,
    type: 'refresh',
  }

  const token = encodeJwt({ alg: 'HS256', typ: 'JWT' }, payload, key)

  // Persist to DB
  await db.refreshToken.create({
    data: {
      jti,
      playerId,
      token,
      expiresAt: new Date((now + REFRESH_TOKEN_TTL) * 1000),
      userAgent: userAgent || null,
    },
  })

  // Clean up old, expired refresh tokens for this player (keep last 5)
  try {
    const oldTokens = await db.refreshToken.findMany({
      where: {
        playerId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (oldTokens.length > 5) {
      const toDelete = oldTokens.slice(0, oldTokens.length - 5)
      await db.refreshToken.deleteMany({
        where: { id: { in: toDelete.map(t => t.id) } },
      })
    }
  } catch {
    // Non-critical — best-effort cleanup
  }

  return token
}

/**
 * Verify an access token. Returns decoded payload or null.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const key = getSigningKey()
  const payload = verifyJwtSignature(token, key)
  if (!payload) return null

  // Check expiry
  if (typeof payload.exp !== 'number' || nowSec() > payload.exp) return null
  // Check type
  if (payload.type !== 'access') return null
  // Check issuer
  if (payload.iss !== ISSUER) return null

  return payload as AccessTokenPayload
}

/**
 * Verify a refresh token. Returns decoded payload or null.
 * Does NOT check revocation — use verifyRefreshTokenWithDb for that.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const key = getSigningKey()
  const payload = verifyJwtSignature(token, key)
  if (!payload) return null

  if (typeof payload.exp !== 'number' || nowSec() > payload.exp) return null
  if (payload.type !== 'refresh') return null
  if (payload.iss !== ISSUER) return null

  return payload as RefreshTokenPayload
}

/**
 * Verify a refresh token AND check it hasn't been revoked in the DB.
 */
export async function verifyRefreshTokenWithDb(
  token: string,
): Promise<{ valid: boolean; payload: RefreshTokenPayload | null; error?: string }> {
  const payload = verifyRefreshToken(token)
  if (!payload) {
    return { valid: false, payload: null, error: 'Invalid or expired token' }
  }

  // Look up in DB
  const stored = await db.refreshToken.findUnique({
    where: { jti: payload.jti },
  })

  if (!stored) {
    logger.warn('Refresh token not found in DB', 'auth-jwt', { jti: payload.jti })
    return { valid: false, payload: null, error: 'Token not recognized' }
  }

  if (stored.revokedAt) {
    logger.warn('Revoked refresh token used', 'auth-jwt', {
      jti: payload.jti,
      playerId: payload.sub,
    })
    return { valid: false, payload: null, error: 'Token has been revoked' }
  }

  if (stored.expiresAt < new Date()) {
    return { valid: false, payload: null, error: 'Token has expired' }
  }

  // Verify the stored token matches
  if (stored.token !== token) {
    logger.error('Refresh token mismatch — possible tampering', 'auth-jwt', {
      jti: payload.jti,
      playerId: payload.sub,
    })
    return { valid: false, payload: null, error: 'Token mismatch' }
  }

  return { valid: true, payload }
}

/**
 * Rotate a refresh token: revoke the old one, issue a new pair.
 */
export async function rotateRefreshToken(
  oldToken: string,
  userAgent?: string,
): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
  // Verify old token
  const result = await verifyRefreshTokenWithDb(oldToken)
  if (!result.valid || !result.payload) {
    return { error: result.error || 'Invalid token' }
  }

  const { sub: playerId } = result.payload

  // Revoke the old token
  await revokeRefreshToken(oldToken)

  // Look up the player
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!player) {
    return { error: 'Player not found' }
  }

  // Issue new pair
  const accessToken = signAccessToken(player)
  const refreshToken = await signRefreshToken(player.id, userAgent)

  logger.info('Refresh token rotated', 'auth-jwt', { playerId })

  return { accessToken, refreshToken }
}

/**
 * Revoke a refresh token by marking it in the DB.
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  const payload = verifyRefreshToken(token)
  if (!payload) return false

  try {
    await db.refreshToken.update({
      where: { jti: payload.jti },
      data: { revokedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Revoke ALL refresh tokens for a player (e.g., on password change).
 */
export async function revokeAllRefreshTokens(playerId: string): Promise<number> {
  const result = await db.refreshToken.updateMany({
    where: {
      playerId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })
  return result.count
}
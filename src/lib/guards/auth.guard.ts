/**
 * Enhanced authentication guard.
 * Replaces with-auth.ts with richer features:
 * - JWT verification + session refresh
 * - Attaches full player object to context
 * - Supports different auth levels (basic, verified, 2fa)
 * - Returns standardized error responses via AppError
 *
 * This is a drop-in replacement for with-auth but returns richer types.
 * The original with-auth.ts remains untouched for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { toErrorResponse } from '@/lib/middleware/error-handler'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import type { AuthContext, AuthLevel } from '@/lib/types/service.types'
import type { Session } from 'next-auth'

// ── In-memory auth cache (60-second TTL) ───────────────────────────────────────

const authCache = new Map<string, { data: AuthContext; expiry: number }>()
const AUTH_CACHE_TTL = 60_000 // 60 seconds

function getCachedAuth(playerId: string): AuthContext | null {
  const cached = authCache.get(playerId)
  if (cached && cached.expiry > Date.now()) return cached.data
  if (cached) authCache.delete(playerId) // expired
  return null
}

function setCachedAuth(playerId: string, data: AuthContext): void {
  authCache.set(playerId, { data, expiry: Date.now() + AUTH_CACHE_TTL })
}

// ── Auth Context Builder ───────────────────────────────────────────────────────

/**
 * Build an AuthContext from a NextAuth session and player record.
 * Uses an in-memory cache with 60s TTL to avoid repeated DB queries.
 */
async function buildAuthContext(session: Session): Promise<AuthContext> {
  const playerId = session.user.id

  // Check cache first
  const cached = getCachedAuth(playerId)
  if (cached) return cached

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      twoFactorEnabled: true,
      accountDeleted: true,
    },
  })

  if (!player) {
    throw new AppError(ErrorCode.AUTH_REQUIRED, 'Compte introuvable')
  }

  if (player.accountDeleted) {
    throw new AppError(ErrorCode.ACCOUNT_DELETED, 'Ce compte a été supprimé')
  }

  // Determine auth level
  let authLevel: AuthLevel = 'basic'
  if (player.twoFactorEnabled) {
    authLevel = '2fa'
  } else if (player.emailVerified) {
    authLevel = 'verified'
  }

  const ctx: AuthContext = {
    playerId: player.id,
    email: player.email,
    name: player.name,
    role: player.role,
    authLevel,
  }

  setCachedAuth(playerId, ctx)

  return ctx
}

// ── Guard: Require Authentication ──────────────────────────────────────────────

/**
 * Get the authenticated session or throw AppError.
 * Use this in services that need auth context without the route wrapper.
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new AppError(ErrorCode.AUTH_REQUIRED, 'Non autorisé')
  }
  return buildAuthContext(session)
}

/**
 * Get the authenticated session or return null (no error).
 */
export async function getOptionalAuth(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  try {
    return await buildAuthContext(session)
  } catch {
    return null
  }
}

// ── Route Wrappers ──────────────────────────────────────────────────────────────

type AuthenticatedHandler<TCtx = void> = (
  req: NextRequest,
  auth: AuthContext,
  context: TCtx,
) => Promise<NextResponse>

/**
 * Wraps a route handler with authentication.
 * Provides an AuthContext instead of a raw Session.
 *
 * @example
 * export const GET = withAuthGuard(async (req, auth) => {
 *   return NextResponse.json({ playerId: auth.playerId, level: auth.authLevel })
 * })
 */
export function withAuthGuard<TCtx = void>(
  handler: AuthenticatedHandler<TCtx>,
  requiredLevel?: AuthLevel,
): (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        throw new AppError(ErrorCode.AUTH_REQUIRED, 'Non autorisé')
      }

      const auth = await buildAuthContext(session)

      // Check auth level if required
      if (requiredLevel) {
        const levels: AuthLevel[] = ['basic', 'verified', '2fa']
        const requiredIdx = levels.indexOf(requiredLevel)
        const currentIdx = levels.indexOf(auth.authLevel)
        if (currentIdx < requiredIdx) {
          if (requiredLevel === 'verified') {
            throw new AppError(ErrorCode.AUTH_EMAIL_NOT_VERIFIED, 'Vérifiez votre email pour accéder à cette ressource')
          }
          if (requiredLevel === '2fa') {
            throw new AppError(ErrorCode.AUTH_2FA_REQUIRED, 'L\'authentification à deux facteurs est requise')
          }
        }
      }

      return handler(req, auth, context as unknown as TCtx)
    } catch (error) {
      return toErrorResponse(error, 'auth-guard')
    }
  }
}

// ── Optional Auth Wrapper ───────────────────────────────────────────────────────

type OptionalAuthHandler<TCtx = void> = (
  req: NextRequest,
  auth: AuthContext | null,
  context: TCtx,
) => Promise<NextResponse>

/**
 * Wraps a route handler with optional authentication.
 * The handler always runs — auth is AuthContext if logged in, null otherwise.
 */
export function withOptionalAuthGuard<TCtx = void>(
  handler: OptionalAuthHandler<TCtx>,
): (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const auth = await getOptionalAuth()
      return handler(req, auth, context as unknown as TCtx)
    } catch (error) {
      return toErrorResponse(error, 'auth-guard')
    }
  }
}
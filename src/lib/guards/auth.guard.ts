/**
 * Enhanced authentication guard using Supabase Auth.
 *
 * - Validates Supabase session via getUser()
 * - Attaches full player object to context
 * - Supports different auth levels (basic, verified, 2fa)
 * - Returns standardized error responses via AppError
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { toErrorResponse } from '@/lib/middleware/error-handler'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import type { AuthContext, AuthLevel } from '@/lib/types/service.types'

type RouteContext = { params: Promise<Record<string, string>> }

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

/**
 * Invalidate the auth cache for a specific player.
 */
export function invalidateAuthCache(playerId: string): void {
  authCache.delete(playerId)
}

// ── Auth Context Builder ───────────────────────────────────────────────────────

/**
 * Build an AuthContext from a Supabase user and player record.
 * Uses an in-memory cache with 60s TTL to avoid repeated DB queries.
 */
async function buildAuthContext(supabaseUserId: string, _email?: string, _name?: string): Promise<AuthContext> {
  // Check cache first
  const cached = getCachedAuth(supabaseUserId)
  if (cached) return cached

  const player = await db.player.findUnique({
    where: { id: supabaseUserId },
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

  setCachedAuth(supabaseUserId, ctx)

  return ctx
}

// ── Guard: Require Authentication ──────────────────────────────────────────────

/**
 * Get the authenticated session or throw AppError.
 * Use this in services that need auth context without the route wrapper.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AppError(ErrorCode.AUTH_REQUIRED, 'Non autorisé')
  }

  return buildAuthContext(
    user.id,
    user.email ?? '',
    user.user_metadata?.name || user.email?.split('@')[0] || '',
  )
}

/**
 * Get the authenticated session or return null (no error).
 */
export async function getOptionalAuth(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null
  try {
    return await buildAuthContext(
      user.id,
      user.email ?? '',
      user.user_metadata?.name || user.email?.split('@')[0] || '',
    )
  } catch {
    return null
  }
}

// ── Route Wrappers ──────────────────────────────────────────────────────────────

type AuthenticatedHandler = (
  req: NextRequest,
  auth: AuthContext,
  context: RouteContext,
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
export function withAuthGuard(
  handler: AuthenticatedHandler,
  requiredLevel?: AuthLevel,
): (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const supabase = await createSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        throw new AppError(ErrorCode.AUTH_REQUIRED, 'Non autorisé')
      }

      const auth = await buildAuthContext(
        user.id,
        user.email ?? '',
        user.user_metadata?.name || user.email?.split('@')[0] || '',
      )

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

      return handler(req, auth, context)
    } catch (error) {
      return toErrorResponse(error, 'auth-guard')
    }
  }
}

// ── Optional Auth Wrapper ───────────────────────────────────────────────────────

type OptionalAuthHandler = (
  req: NextRequest,
  auth: AuthContext | null,
  context: RouteContext,
) => Promise<NextResponse>

/**
 * Wraps a route handler with optional authentication.
 * The handler always runs — auth is AuthContext if logged in, null otherwise.
 */
export function withOptionalAuthGuard(
  handler: OptionalAuthHandler,
): (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const auth = await getOptionalAuth()
      return handler(req, auth, context)
    } catch (error) {
      return toErrorResponse(error, 'auth-guard')
    }
  }
}
/**
 * @deprecated Prefer `withAuthGuard` / `requireAuth` from `@/lib/guards/auth.guard.ts`.
 * This module is kept for backward compatibility with the ~119 routes that import it.
 * New routes should use auth.guard.ts which provides auth levels, caching, and
 * standardized error handling via AppError.
 *
 * TODO: Unify with auth.guard.ts — migrate all callers to `withAuthGuard`, then
 * remove this file. See matching TODO in auth.guard.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, invalidateAuthCache } from '@/lib/guards/auth.guard';
import type { AuthContext } from '@/lib/types/service.types';

type RouteContext = { params: Promise<Record<string, string>> }

/**
 * A minimal session object compatible with the old NextAuth shape.
 * `user.id` is the Supabase user's `sub` (UUID).
 */
interface SupabaseSession {
  user: {
    id: string
    email: string
    name: string
  }
  expires: string
}

/**
 * Handler that receives an authenticated session.
 */
type AuthenticatedHandler = (
  req: NextRequest,
  session: SupabaseSession,
  context: RouteContext,
) => Promise<NextResponse>

/**
 * Handler that receives an optional session (may be null).
 */
type OptionalAuthHandler = (
  req: NextRequest,
  session: SupabaseSession | null,
  context: RouteContext,
) => Promise<NextResponse>

/**
 * Wraps a route handler with authentication.
 * Uses Supabase `getUser()` to validate the session cookie.
 * Returns 401 if no valid session.
 *
 * @example
 * // Simple route
 * export const GET = withAuth(async (req, session) => {
 *   return NextResponse.json({ id: session.user.id })
 * })
 *
 * @example
 * // Dynamic route
 * export const GET = withAuth(
 *   async (req, session, { params }) => {
 *     const { id } = await params
 *     // ...
 *   }
 * )
 */
export function withAuth(
  handler: AuthenticatedHandler,
): (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      // Delegate to the auth guard's core logic (Supabase validation + DB lookup + cache)
      const auth: AuthContext = await requireAuth()
      const session = authContextToSession(auth)
      return handler(req, session, context)
    } catch {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  }
}

/**
 * Wraps a route handler with admin authentication.
 * Requires valid Supabase session AND player role to be 'admin'.
 * Returns 401 if not authenticated, 403 if not admin.
 */
export function withAdmin(
  handler: AuthenticatedHandler,
): (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const auth: AuthContext = await requireAuth()
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      }
      const session = authContextToSession(auth)
      return handler(req, session, context)
    } catch {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  }
}

/**
 * Wraps a route handler with optional authentication.
 * The handler always runs — session is SupabaseSession if logged in, null otherwise.
 *
 * @example
 * export const GET = withOptionalAuth(async (req, session) => {
 *   if (session) {
 *     return NextResponse.json({ name: session.user.name })
 *   }
 *   return NextResponse.json({ name: 'Anonymous' })
 * })
 */
export function withOptionalAuth(
  handler: OptionalAuthHandler,
): (req: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const { getOptionalAuth } = await import('@/lib/guards/auth.guard')
      const auth = await getOptionalAuth()
      const session = auth ? authContextToSession(auth) : null
      return handler(req, session, context)
    } catch {
      return handler(req, null, context)
    }
  }
}

// Re-export invalidateAuthCache so callers of with-auth.ts don't need to switch imports
export { invalidateAuthCache }

export type { SupabaseSession }

// ── Internal Helpers ─────────────────────────────────────────────────────────────

/** Adapt the richer AuthContext back to the legacy SupabaseSession shape. */
function authContextToSession(auth: AuthContext): SupabaseSession {
  return {
    user: {
      id: auth.playerId,
      email: auth.email,
      name: auth.name,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }
}
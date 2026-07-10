import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const session: SupabaseSession = {
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
      },
      // Supabase access_token typically expires in 1 hour
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }

    return handler(req, session, context)
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
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { db } = await import('@/lib/db')
    const player = await db.player.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
    if (!player || player.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const session: SupabaseSession = {
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }

    return handler(req, session, context)
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
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return handler(req, null, context)
    }

    const session: SupabaseSession = {
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }

    return handler(req, session, context)
  }
}

export type { SupabaseSession }
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'

/**
 * Handler that receives an authenticated session.
 * TCtx is the Next.js route context (e.g. { params: Promise<{ id: string }> })
 * and defaults to void for routes without dynamic segments.
 */
type AuthenticatedHandler<TCtx = void> = (
  req: NextRequest,
  session: Session,
  context: TCtx,
) => Promise<NextResponse>

/**
 * Handler that receives an optional session (may be null).
 */
type OptionalAuthHandler<TCtx = void> = (
  req: NextRequest,
  session: Session | null,
  context: TCtx,
) => Promise<NextResponse>

/**
 * Wraps a route handler with authentication.
 * Requires `session.user.id` to be present — returns 401 otherwise.
 *
 * @example
 * // Simple route
 * export const GET = withAuth(async (req, session) => {
 *   return NextResponse.json({ id: session.user.id })
 * })
 *
 * @example
 * // Dynamic route
 * export const GET = withAuth<{ params: Promise<{ id: string }> }>(
 *   async (req, session, { params }) => {
 *     const { id } = await params
 *     // ...
 *   }
 * )
 */
export function withAuth<TCtx = void>(
  handler: AuthenticatedHandler<TCtx>,
): (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req, context) => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return handler(req, session, context as unknown as TCtx)
  }
}

/**
 * Wraps a route handler with admin authentication.
 * Requires `session.user.id` AND player role to be 'admin'.
 * Returns 401 if not authenticated, 403 if not admin.
 */
export function withAdmin<TCtx = void>(
  handler: AuthenticatedHandler<TCtx>,
): (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req, context) => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { db } = await import('@/lib/db')
    const player = await db.player.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!player || player.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    return handler(req, session, context as unknown as TCtx)
  }
}

/**
 * Wraps a route handler with optional authentication.
 * The handler always runs — session is `Session` if logged in, `null` otherwise.
 *
 * @example
 * export const GET = withOptionalAuth(async (req, session) => {
 *   if (session) {
 *     return NextResponse.json({ name: session.user.name })
 *   }
 *   return NextResponse.json({ name: 'Anonymous' })
 * })
 */
export function withOptionalAuth<TCtx = void>(
  handler: OptionalAuthHandler<TCtx>,
): (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req, context) => {
    const session = (await getServerSession(authOptions)) ?? null
    return handler(req, session, context as unknown as TCtx)
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

type AuthenticatedHandler = (
  req: NextRequest,
  context: { playerId: string; session: Awaited<ReturnType<typeof getServerSession>> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...extra: any[]
) => Promise<NextResponse> | NextResponse

interface WithAuthOptions {
  /** Rate limit key prefix (default: route-based from URL) */
  rateLimitKey?: string
  /** Max requests in window (default: no rate limit) */
  rateLimitMax?: number
  /** Rate limit window in ms (default: 60000) */
  rateLimitWindow?: number
  /** Allow unauthenticated access (default: false) */
  public?: boolean
  /** Require admin role (default: false) */
  adminOnly?: boolean
}

export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
) {
  return async function authenticatedHandler(
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...extra: any[]
  ): Promise<NextResponse> {
    try {
      const session = await getServerSession(authOptions)

      if (options.public) {
        // For public routes, pass null playerId
        const playerId = session?.user?.id ?? ''
        return handler(req, { playerId, session }, ...extra)
      }

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
      }

      const playerId = session.user.id

      // Rate limiting
      if (options.rateLimitMax) {
        const key = options.rateLimitKey || `auth:${playerId}`
        const rl = rateLimit(key, options.rateLimitMax, options.rateLimitWindow || 60000)
        if (!rl.success) {
          return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
        }
      }

      return handler(req, { playerId, session }, ...extra)
    } catch (error) {
      trackError(`withAuth error: ${req.method} ${req.nextUrl.pathname}`, error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
  }
}

/** Shorthand for GET with auth */
export function authGet(
  handler: AuthenticatedHandler,
  options?: WithAuthOptions
) {
  return withAuth(handler, options)
}

/** Shorthand for POST with auth */
export function authPost(
  handler: AuthenticatedHandler,
  options?: WithAuthOptions
) {
  return withAuth(handler, options)
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { trackError } from '@/lib/monitoring'

type AuthenticatedUser = { id: string; email: string; name?: string | null }

type AuthenticatedHandler = (
  req: NextRequest,
  user: AuthenticatedUser,
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
      return await handler(req, session.user as AuthenticatedUser)
    } catch (error) {
      trackError(`withAuth:${req.method} ${req.nextUrl.pathname}`, error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
  }
}
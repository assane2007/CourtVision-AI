import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'
import { toggleFavoriteSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { cacheInvalidatePattern } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// POST /api/drills/favorite — Toggle favorite on/off
export const POST = withAuth(async (req, session) => {
  try {
    const rateResult = rateLimit(`drills:favorite:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    // Check content-length before parsing body
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 1_000_000) {
      return NextResponse.json({ error: 'Requête trop volumineuse' }, { status: 413 })
    }

    const body = await req.json()
    const parsed = toggleFavoriteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { drillId } = parsed.data

    // Verify drill exists and is accessible to the user
    const drill = await db.drill.findFirst({
      where: {
        id: drillId,
        isActive: true,
        OR: [
          { playerId: null },
          { playerId: session.user.id },
        ],
      },
      select: { id: true },
    })

    if (!drill) {
      return NextResponse.json({ error: 'Exercice non trouvé' }, { status: 404 })
    }

    // Atomic toggle: try to delete first; if not found, create.
    // This avoids the check-then-act race condition.
    try {
      await db.drillFavorite.delete({
        where: { playerId_drillId: { playerId: session.user.id, drillId } },
      })
      cacheInvalidatePattern('drills:')
      return NextResponse.json({ favorited: false })
    } catch (error: unknown) {
      // P2025 = RecordNotFound → the favorite doesn't exist yet, so create it
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        await db.drillFavorite.create({
          data: { playerId: session.user.id, drillId },
        })
        cacheInvalidatePattern('drills:')
        return NextResponse.json({ favorited: true })
      }
      throw error // re-throw unexpected errors
    }
  } catch (error) {
    trackError('POST /api/drills/favorite', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
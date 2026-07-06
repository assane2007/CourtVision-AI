import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { toggleFavoriteSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/drills/favorite — Toggle favorite on/off
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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

    const existing = await db.drillFavorite.findUnique({
      where: { playerId_drillId: { playerId: session.user.id, drillId } }
    })

    if (existing) {
      await db.drillFavorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorited: false })
    } else {
      await db.drillFavorite.create({
        data: { playerId: session.user.id, drillId }
      })
      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('[POST /api/drills/favorite]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
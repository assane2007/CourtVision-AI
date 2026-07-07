import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { cacheInvalidatePattern } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// GET /api/drills/[id] — Single drill detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`drills:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { id } = await params

    const drill = await db.drill.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { playerId: null },
          { playerId: session.user.id },
        ],
      },
    })

    if (!drill) {
      return NextResponse.json({ error: 'Exercice non trouvé' }, { status: 404 })
    }

    // Check if user favorited this drill
    const fav = await db.drillFavorite.findUnique({
      where: { playerId_drillId: { playerId: session.user.id, drillId: id } },
    })

    return NextResponse.json({ drill, isFavorited: !!fav })
  } catch (error) {
    trackError('GET /api/drills/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/drills/[id] — Delete a custom drill (only the owner)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`drills:delete:${session.user.id}`, 20, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { id } = await params

    const drill = await db.drill.findUnique({
      where: { id },
      select: { id: true, playerId: true, isCustom: true },
    })

    if (!drill) {
      return NextResponse.json({ error: 'Exercice non trouvé' }, { status: 404 })
    }

    if (!drill.isCustom || drill.playerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez supprimer que vos propres exercices personnalisés' },
        { status: 403 }
      )
    }

    // Delete in a transaction: remove favorites, plan associations, then the drill
    await db.$transaction([
      db.drillFavorite.deleteMany({ where: { drillId: id } }),
      db.trainingPlanDrill.deleteMany({ where: { drillId: id } }),
      db.workoutSessionDrill.deleteMany({ where: { drillId: id } }),
      db.drill.delete({ where: { id } }),
    ])

    cacheInvalidatePattern('drills:')
    cacheInvalidatePattern('recommendations:')

    return NextResponse.json({ success: true, message: 'Exercice supprimé' })
  } catch (error) {
    trackError('DELETE /api/drills/[id]', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
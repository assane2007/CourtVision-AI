import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { cacheInvalidatePattern } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// GET /api/drills/[id] — Single drill detail
export const GET = withAuth(
  async (_req, session, { params }) => {
    try {
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
)

// DELETE /api/drills/[id] — Delete a custom drill (only the owner)
export const DELETE = withAuth(
  async (_req, session, { params }) => {
    try {
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
)
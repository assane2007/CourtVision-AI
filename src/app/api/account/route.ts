import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'

// Rate limit: 1 deletion per hour per user
const deleteRateLimit = (identifier: string) => rateLimit(identifier, 1, 60 * 60 * 1000)

export async function DELETE() {
  try {
    // ── Authentication check ────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const playerId = session.user.id

    // ── Rate limiting (1 per hour) ─────────────────────────────────
    const rateResult = deleteRateLimit(`account-delete:${playerId}`)
    if (!rateResult.success) {
      const retryMin = Math.ceil(rateResult.retryAfterMs / 60000)
      return NextResponse.json(
        { error: `Trop de requêtes. Réessayez dans ${retryMin} minute(s).` },
        { status: 429 }
      )
    }

    // ── Verify player exists ────────────────────────────────────────
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Compte introuvable' },
        { status: 404 }
      )
    }

    // ── Cascading deletion inside a transaction for atomicity ──────
    await db.$transaction(async (tx) => {
      // 1. XpLog entries
      await tx.xpLog.deleteMany({ where: { playerId } })

      // 2. AIChatMessage entries
      await tx.aIChatMessage.deleteMany({ where: { playerId } })

      // 3. ReactionScore entries
      await tx.reactionScore.deleteMany({ where: { playerId } })

      // 4. Achievement entries
      await tx.achievement.deleteMany({ where: { playerId } })

      // 5. WorkoutSessionDrill entries (via their sessions)
      const workoutSessions = await tx.workoutSession.findMany({
        where: { playerId },
        select: { id: true },
      })
      if (workoutSessions.length > 0) {
        const sessionIds = workoutSessions.map((s) => s.id)
        await tx.workoutSessionDrill.deleteMany({
          where: { sessionId: { in: sessionIds } },
        })
      }

      // 6. WorkoutSession entries
      await tx.workoutSession.deleteMany({ where: { playerId } })

      // 7. DrillFavorite entries
      await tx.drillFavorite.deleteMany({ where: { playerId } })

      // 8. TrainingPlanDrill entries (via their plans)
      const trainingPlans = await tx.trainingPlan.findMany({
        where: { playerId },
        select: { id: true },
      })
      if (trainingPlans.length > 0) {
        const planIds = trainingPlans.map((p) => p.id)
        await tx.trainingPlanDrill.deleteMany({
          where: { planId: { in: planIds } },
        })
      }

      // 9. TrainingPlan entries
      await tx.trainingPlan.deleteMany({ where: { playerId } })

      // 10. Drill entries (only custom ones where playerId matches)
      await tx.drill.deleteMany({
        where: { playerId, isCustom: true },
      })

      // 11. Player record itself
      await tx.player.delete({
        where: { id: playerId },
      })
    })

    return NextResponse.json(
      {
        message:
          'Votre compte et toutes vos données ont été supprimés conformément au RGPD (Article 17).',
      },
      { status: 200 }
    )
  } catch (error) {
    trackError('[DELETE /api/account]', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
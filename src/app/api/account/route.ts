import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

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

    // ── Cascading deletion (respecting FK constraints) ──────────────
    // 1. XpLog entries
    await db.xpLog.deleteMany({ where: { playerId } })

    // 2. AIChatMessage entries
    await db.aIChatMessage.deleteMany({ where: { playerId } })

    // 3. ReactionScore entries
    await db.reactionScore.deleteMany({ where: { playerId } })

    // 4. Achievement entries
    await db.achievement.deleteMany({ where: { playerId } })

    // 5. WorkoutSessionDrill entries (via their sessions)
    const workoutSessions = await db.workoutSession.findMany({
      where: { playerId },
      select: { id: true },
    })
    if (workoutSessions.length > 0) {
      const sessionIds = workoutSessions.map((s) => s.id)
      await db.workoutSessionDrill.deleteMany({
        where: { sessionId: { in: sessionIds } },
      })
    }

    // 6. WorkoutSession entries
    await db.workoutSession.deleteMany({ where: { playerId } })

    // 7. DrillFavorite entries
    await db.drillFavorite.deleteMany({ where: { playerId } })

    // 8. TrainingPlanDrill entries (via their plans)
    const trainingPlans = await db.trainingPlan.findMany({
      where: { playerId },
      select: { id: true },
    })
    if (trainingPlans.length > 0) {
      const planIds = trainingPlans.map((p) => p.id)
      await db.trainingPlanDrill.deleteMany({
        where: { planId: { in: planIds } },
      })
    }

    // 9. TrainingPlan entries
    await db.trainingPlan.deleteMany({ where: { playerId } })

    // 10. Drill entries (only custom ones where playerId matches)
    await db.drill.deleteMany({
      where: { playerId, isCustom: true },
    })

    // 11. Player record itself
    await db.player.delete({
      where: { id: playerId },
    })

    return NextResponse.json(
      {
        message:
          'Votre compte et toutes vos données ont été supprimés conformément au RGPD (Article 17).',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[DELETE /api/account] Error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    // Rate limit: 5 req / hour
    const rl = rateLimit(`export:${playerId}`, 5, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans une heure.' }, { status: 429 })
    }

    // Fetch all player data in parallel
    const [
      player,
      sessions,
      achievements,
      reactionScores,
      aiChatMessages,
      trainingPlans,
      favorites,
      xpLogs,
    ] = await Promise.all([
      // Player profile (exclude password)
      db.player.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          email: true,
          name: true,
          position: true,
          level: true,
          goals: true,
          onboarding: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          xp: true,
          xpLevel: true,
          weeklyGoalSessions: true,
          weeklyGoalReps: true,
          preferredRestSec: true,
          soundEnabled: true,
          hapticsEnabled: true,
          language: true,
          notifStreak: true,
          notifChallenge: true,
          notifAchievement: true,
        },
      }),

      // All sessions with drill details
      db.workoutSession.findMany({
        where: { playerId },
        include: {
          drills: {
            include: {
              drill: {
                select: {
                  name: true,
                  nameFr: true,
                  category: true,
                  difficulty: true,
                  icon: true,
                },
              },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),

      // All achievements
      db.achievement.findMany({
        where: { playerId },
        orderBy: { unlockedAt: 'desc' },
      }),

      // All reaction scores
      db.reactionScore.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      }),

      // All AI chat messages
      db.aIChatMessage.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      }),

      // All training plans with drills
      db.trainingPlan.findMany({
        where: { playerId },
        include: {
          drills: {
            include: {
              drill: {
                select: {
                  name: true,
                  nameFr: true,
                  category: true,
                  icon: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // All favorites
      db.drillFavorite.findMany({
        where: { playerId },
        include: {
          drill: {
            select: {
              name: true,
              nameFr: true,
              category: true,
              icon: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // All XP logs
      db.xpLog.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      player,
      sessions,
      achievements,
      reactionScores,
      aiChatMessages,
      trainingPlans,
      favorites,
      xpLogs,
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const safeName = player.name.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').trim()
    const fileName = `courtvision-export-${safeName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    trackError('GET /api/player/export', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
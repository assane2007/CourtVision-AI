import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { rateLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/with-auth';

export const GET = withAuth(async (request, session) => {
  try {

    const playerId = session.user.id
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'

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
      devices,
    ] = await Promise.all([
      // Player profile (exclude password)
      db.player.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          email: true,
          name: true,
          bio: true,
          position: true,
          level: true,
          goals: true,
          onboarding: true,
          avatar: true,
          city: true,
          country: true,
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
          notifSocial: true,
          notifMessage: true,
          emailVerified: true,
          twoFactorEnabled: true,
          profilePublic: true,
          showOnLeaderboard: true,
          showActivity: true,
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

      // Devices
      db.device.findMany({
        where: { playerId },
        select: { id: true, name: true, type: true, os: true, lastActive: true, createdAt: true },
        orderBy: { lastActive: 'desc' },
      }),
    ])

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    const safeName = player.name.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').trim()
    const dateStr = new Date().toISOString().split('T')[0]

    if (format === 'csv') {
      // Generate CSV
      const lines: string[] = []

      // Player profile CSV
      lines.push('=== PROFILE ===')
      lines.push('Field,Value')
      lines.push(`Name,"${player.name}"`)
      lines.push(`Email,"${player.email}"`)
      lines.push(`Position,"${player.position}"`)
      lines.push(`Level,"${player.level}"`)
      lines.push(`XP,${player.xp}`)
      lines.push(`Level,${player.xpLevel}`)
      lines.push(`Member Since,"${player.createdAt}"`)
      lines.push('')

      // Sessions CSV
      lines.push('=== SESSIONS ===')
      lines.push('ID,Date,Duration(sec),Total Score,Total Reps,Drills Count')
      for (const s of sessions) {
        const dur = s.endedAt ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000) : 0
        lines.push(`${s.id},"${s.startedAt.toISOString()}",${dur},${s.totalScore},${s.totalReps},${s.totalDrills}`)
      }
      lines.push('')

      // Achievements CSV
      lines.push('=== ACHIEVEMENTS ===')
      lines.push('ID,Type,Title,Unlocked At')
      for (const a of achievements) {
        lines.push(`${a.id},"${a.type}","${a.title.replace(/"/g, '""')}","${a.unlockedAt?.toISOString() || ''}"`)
      }
      lines.push('')

      // XP Log CSV
      lines.push('=== XP LOG ===')
      lines.push('ID,Amount,Source,Created At')
      for (const x of xpLogs) {
        lines.push(`${x.id},${x.amount},"${x.source}","${x.createdAt.toISOString()}"`)
      }

      const csvContent = lines.join('\n')
      const fileName = `courtvision-export-${safeName.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.csv`

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    }

    // Default: JSON export (GDPR-compliant, includes all data)
    const exportData = {
      exportDate: new Date().toISOString(),
      gdpr: 'This export contains all your personal data as per GDPR Article 20 (Right to Data Portability).',
      player,
      sessions,
      achievements,
      reactionScores,
      aiChatMessages,
      trainingPlans,
      favorites: favorites.map((f) => ({
        drillId: f.drillId,
        drill: f.drill,
        addedAt: f.createdAt,
      })),
      xpLogs,
      devices,
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const fileName = `courtvision-export-${safeName.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.json`

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
})

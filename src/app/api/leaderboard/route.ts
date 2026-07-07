import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { getLevelFromXp } from '@/lib/xp'

type Period = 'all' | 'month' | 'week'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') ?? 'all') as Period

    // Rate limit: 30 req / 15 min
    const rl = rateLimit(`leaderboard:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const playerId = session.user.id

    // Date filter based on period
    let dateFilter: { startedAt?: { gte: Date } } = {}
    if (period === 'week') {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      dateFilter = { startedAt: { gte: oneWeekAgo } }
    } else if (period === 'month') {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      dateFilter = { startedAt: { gte: oneMonthAgo } }
    }

    // Fetch all players with their XP and session counts
    const players = await db.player.findMany({
      select: {
        id: true,
        name: true,
        xp: true,
        xpLevel: true,
        position: true,
        sessions: {
          select: {
            totalScore: true,
            totalReps: true,
            totalDrills: true,
            startedAt: true,
          },
          where: dateFilter.startedAt ? { startedAt: dateFilter.startedAt } : undefined,
        },
      },
    })

    // Build leaderboard with computed stats
    const leaderboard = players
      .map((p) => {
        const sessions = p.sessions
        const totalSessions = sessions.length
        const totalReps = sessions.reduce((s, ses) => s + ses.totalReps, 0)
        const totalScore = sessions.reduce((s, ses) => s + ses.totalScore, 0)
        const avgScore = totalSessions > 0 ? Math.round((totalScore / totalSessions) * 10) / 10 : 0

        // For period-based, use XP gained in period (approximate with session count * avg)
        let sortXp = p.xp
        if (period !== 'all') {
          // Use score-based ranking for periods
          sortXp = Math.round(totalScore)
        }

        return {
          playerId: p.id,
          name: p.name,
          xp: p.xp,
          xpLevel: p.xpLevel,
          totalSessions,
          avgScore,
          position: p.position,
          sortXp,
        }
      })
      .sort((a, b) => b.sortXp - a.sortXp)

    // Assign ranks
    const ranked = leaderboard.map((p, i) => ({
      ...p,
      rank: i + 1,
    }))

    // Top 20
    const top20 = ranked.slice(0, 20)

    // Find current player rank
    const currentPlayerRank = ranked.find((p) => p.playerId === playerId)

    // For the "friends" section (just the current player context)
    const friends = currentPlayerRank
      ? [
          {
            ...currentPlayerRank,
            isCurrentUser: true,
          },
        ]
      : []

    // Anonymize names for other players (show first name only)
    const anonymized = top20.map((p) => ({
      rank: p.rank,
      name: p.playerId === playerId
        ? p.name
        : p.name.split(' ')[0] || 'Joueur',
      xp: p.xp,
      xpLevel: p.xpLevel,
      totalSessions: p.totalSessions,
      avgScore: p.avgScore,
      position: p.position,
      isCurrentUser: p.playerId === playerId,
    }))

    return NextResponse.json({
      leaderboard: anonymized,
      friends,
      playerRank: currentPlayerRank?.rank ?? null,
      totalPlayers: ranked.length,
    })
  } catch (error) {
    trackError('GET /api/leaderboard', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withCache } from '@/lib/cache'

type Period = 'all' | 'month' | 'week'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawPeriod = searchParams.get('period') ?? 'all'
    const validPeriods: Period[] = ['all', 'month', 'week']
    const period: Period = validPeriods.includes(rawPeriod as Period) ? (rawPeriod as Period) : 'all'

    // Rate limit: 30 req / 15 min
    const rl = rateLimit(`leaderboard:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const playerId = session.user.id

    // Date filter based on period
    let periodFilter: Date | undefined
    if (period === 'week') {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      periodFilter = oneWeekAgo
    } else if (period === 'month') {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      periodFilter = oneMonthAgo
    }

    // Cache ONLY global leaderboard data (no per-user fields inside closure)
    const globalData = await withCache(`leaderboard:global:${period}`, 5 * 60 * 1000, async () => {
      const players = await db.player.findMany({
        take: 20,
        orderBy: { xp: 'desc' },
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
            where: periodFilter ? {
              startedAt: { gte: periodFilter },
            } : undefined,
            orderBy: { totalScore: 'desc' },
            take: 100,
          },
        },
      })

      const leaderboard = players
        .map((p) => {
          const sessions = p.sessions
          const totalSessions = sessions.length
          const totalScore = sessions.reduce((s, ses) => s + ses.totalScore, 0)
          const avgScore = totalSessions > 0 ? Math.round((totalScore / totalSessions) * 10) / 10 : 0

          let sortXp = p.xp
          if (period !== 'all') {
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
        .map((p, i) => ({ ...p, rank: i + 1 }))

      const totalPlayers = await db.player.count()

      // Return only global data — no per-user fields
      return { leaderboard, totalPlayers }
    })

    // Compute per-user fields OUTSIDE the cache
    const { leaderboard: ranked, totalPlayers } = globalData

    let playerRank: number | null = null
    const currentPlayerRanked = ranked.find((p) => p.playerId === playerId)
    if (currentPlayerRanked) {
      playerRank = currentPlayerRanked.rank
    } else {
      // Player not in top 20 — count how many have higher XP
      const currentPlayer = await db.player.findUnique({
        where: { id: playerId },
        select: { xp: true },
      })
      if (currentPlayer) {
        playerRank = await db.player.count({
          where: { xp: { gt: currentPlayer.xp } },
        }) + 1
      }
    }

    // Per-user friends section (just the current player context)
    const friends = currentPlayerRanked
      ? [{ ...currentPlayerRanked, isCurrentUser: true }]
      : []

    // Anonymize names for other players (show first name only)
    const anonymized = ranked.map((p) => ({
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
      playerRank,
      totalPlayers,
    })
  } catch (error) {
    trackError('GET /api/leaderboard', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
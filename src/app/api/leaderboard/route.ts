import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { trackError } from '@/lib/monitoring';
import { withCache } from '@/lib/cache';

type Period = 'all' | 'month' | 'week'

interface LeaderboardEntry {
  rank: number
  name: string
  xp: number
  xpLevel: number
  totalSessions: number
  avgScore: number
  position: string
  isCurrentUser: boolean
}

export const GET = withAuth(async (request, session) => {
  try {
    const { searchParams } = new URL(request.url)
    const rawPeriod = searchParams.get('period') ?? 'all'
    const validPeriods: Period[] = ['all', 'month', 'week']
    const period: Period = validPeriods.includes(rawPeriod as Period) ? (rawPeriod as Period) : 'all'
    const teamId = searchParams.get('teamId')

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

    // Team filter: if teamId is provided, only show team members
    let teamMemberIds: string[] | null = null
    if (teamId) {
      const teamMembers = await db.teamMember.findMany({
        where: { teamId },
        select: { playerId: true },
      })
      teamMemberIds = teamMembers.map(m => m.playerId)
      if (teamMemberIds.length === 0) {
        return NextResponse.json({ leaderboard: [], friends: [], playerRank: null, totalPlayers: 0, teamName: null })
      }
    }

    // Cache ONLY global leaderboard data (no per-user fields inside closure)
    const cacheKey = teamId ? `leaderboard:team:${teamId}:${period}` : `leaderboard:global:${period}`
    const globalData = await withCache(cacheKey, 5 * 60 * 1000, async () => {
      const players = await db.player.findMany({
        where: teamMemberIds ? { id: { in: teamMemberIds } } : undefined,
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

      const [totalPlayers, teamInfo] = await Promise.all([
        teamMemberIds
          ? Promise.resolve(teamMemberIds.length)
          : db.player.count(),
        teamId
          ? db.team.findUnique({ where: { id: teamId }, select: { name: true } })
          : Promise.resolve(null),
      ])

      // Return only global data — no per-user fields
      return { leaderboard, totalPlayers, teamName: teamInfo?.name || null }
    })

    // Compute per-user fields OUTSIDE the cache
    const { leaderboard: ranked, totalPlayers, teamName } = globalData

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

    // Per-user friends section: fetch accepted friends and rank them by XP
    const acceptedFriendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: playerId, status: 'accepted' },
          { recipientId: playerId, status: 'accepted' },
        ],
      },
      select: { requesterId: true, recipientId: true },
    })

    const friendIds = new Set<string>()
    for (const f of acceptedFriendships) {
      if (f.requesterId !== playerId) friendIds.add(f.requesterId)
      if (f.recipientId !== playerId) friendIds.add(f.recipientId)
    }

    let friends: LeaderboardEntry[] = []
    if (friendIds.size > 0) {
      const friendPlayers = await db.player.findMany({
        where: { id: { in: Array.from(friendIds) } },
        select: {
          id: true,
          name: true,
          xp: true,
          xpLevel: true,
          position: true,
          sessions: {
            select: { totalScore: true },
            where: periodFilter ? { startedAt: { gte: periodFilter } } : undefined,
            take: 100,
          },
        },
      })

      friends = friendPlayers
        .map((p) => {
          const totalScore = p.sessions.reduce((s, ses) => s + ses.totalScore, 0)
          const avgScore = p.sessions.length > 0
            ? Math.round((totalScore / p.sessions.length) * 10) / 10
            : 0
          return {
            rank: 0, // will be assigned after sort
            name: p.name,
            xp: p.xp,
            xpLevel: p.xpLevel,
            totalSessions: p.sessions.length,
            avgScore,
            position: p.position,
            isCurrentUser: false,
          }
        })
        .sort((a, b) => b.xp - a.xp)
        .map((p, i) => ({ ...p, rank: i + 1 }))

      // Insert current player into friends list if they exist in global ranking
      if (currentPlayerRanked) {
        const me = {
          rank: 0,
          name: currentPlayerRanked.name,
          xp: currentPlayerRanked.xp,
          xpLevel: currentPlayerRanked.xpLevel,
          totalSessions: currentPlayerRanked.totalSessions,
          avgScore: currentPlayerRanked.avgScore,
          position: currentPlayerRanked.position,
          isCurrentUser: true,
        }
        friends.push(me)
        friends.sort((a, b) => b.xp - a.xp)
        friends = friends.map((p, i) => ({ ...p, rank: i + 1 }))
      }
    } else if (currentPlayerRanked) {
      friends = [{ ...currentPlayerRanked, isCurrentUser: true, rank: 1 }]
    }

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
      ...(teamName && { teamName }),
    })
  } catch (error) {
    trackError('GET /api/leaderboard', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
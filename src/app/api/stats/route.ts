import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/stats — Comprehensive player stats with optimized queries
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id
    const now = new Date()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // ── Parallel aggregate queries ──────────────────────────────────────

    const [
      totalSessions,
      totalRepsResult,
      avgScoreResult,
      weekSessions,
      allSessions,
      sessionDrills,
    ] = await Promise.all([
      // Total session count
      db.workoutSession.count({ where: { playerId } }),

      // Total reps
      db.workoutSession.aggregate({
        where: { playerId },
        _sum: { totalReps: true },
      }),

      // Average score
      db.workoutSession.aggregate({
        where: { playerId },
        _avg: { totalScore: true },
      }),

      // Sessions this week
      db.workoutSession.count({
        where: { playerId, startedAt: { gte: oneWeekAgo } },
      }),

      // All sessions for daily breakdown (last 30 days max for efficiency)
      db.workoutSession.findMany({
        where: {
          playerId,
          startedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          startedAt: true,
          totalReps: true,
          totalScore: true,
          totalDrills: true,
        },
        orderBy: { startedAt: 'asc' },
      }),

      // All session drills for category breakdown
      db.workoutSessionDrill.findMany({
        where: { session: { playerId } },
        include: { drill: { select: { category: true } } },
      }),
    ])

    // ── Build daily stats (last 7 days) ────────────────────────────────

    const dailyMap = new Map<string, { sessions: number; reps: number; score: number }>()

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const key = day.toISOString().split('T')[0]
      dailyMap.set(key, { sessions: 0, reps: 0, score: 0 })
    }

    // Populate from fetched sessions
    for (const ses of allSessions) {
      const key = new Date(ses.startedAt).toISOString().split('T')[0]
      const day = dailyMap.get(key)
      if (day) {
        day.sessions++
        day.reps += ses.totalReps
        day.score += ses.totalScore
      }
    }

    const dailyStats = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      sessions: data.sessions,
      reps: data.reps,
      score: data.sessions > 0 ? Math.round((data.score / data.sessions) * 10) / 10 : 0,
    }))

    // ── Category performance ───────────────────────────────────────────

    const categoryMap: Record<string, { count: number; totalScore: number }> = {}
    for (const sd of sessionDrills) {
      const cat = sd.drill.category
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, totalScore: 0 }
      categoryMap[cat].count++
      categoryMap[cat].totalScore += sd.score
    }

    const categories = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      drills: data.count,
      avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 0,
    }))

    // ── Streak calculation ─────────────────────────────────────────────

    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    // Get unique training days (sorted desc for streak)
    const trainingDays = new Set(
      allSessions.map(s => new Date(s.startedAt).toISOString().split('T')[0])
    )
    const sortedDays = Array.from(trainingDays).sort().reverse() // newest first

    // Current streak: check consecutive days from today/yesterday
    const checkDate = new Date(today)
    for (let i = 0; i < 365; i++) {
      const dayStr = checkDate.toISOString().split('T')[0]
      if (trainingDays.has(dayStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (i === 0) {
        // Today might not have a session yet — check from yesterday
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      } else {
        break
      }
    }

    // Best streak: check all consecutive days
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prev = new Date(sortedDays[i - 1])
        const curr = new Date(sortedDays[i])
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak)
    }

    // ── Achievements (lightweight) ─────────────────────────────────────

    const achievementCount = await db.achievement.count({ where: { playerId } })

    return NextResponse.json({
      totalSessions,
      totalReps: totalRepsResult._sum.totalReps || 0,
      avgScore: avgScoreResult._avg.totalScore
        ? Math.round(avgScoreResult._avg.totalScore * 10) / 10
        : 0,
      weekSessions,
      dailyStats,
      categories,
      currentStreak,
      bestStreak,
      achievementCount,
    })
  } catch (error) {
    console.error('[GET /api/stats]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
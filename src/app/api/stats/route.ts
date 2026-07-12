import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { db } from '@/lib/db';
import { withCache } from '@/lib/cache';
import { rateLimit } from '@/lib/rate-limit';
import { calculateStreak } from '@/lib/streak';
import { trackError } from '@/lib/monitoring';

// GET /api/stats — Comprehensive player stats with optimized queries
// Query params: ?days=7 (default 7, max 30) — controls dailyStats range
export const GET = withAuth(async (request, session) => {
  try {
    const rl = rateLimit(`stats:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const rawDays = parseInt(searchParams.get('days') ?? '7', 10)
    const days = Math.min(Math.max(rawDays, 1), 30) // clamp 1–30

    const playerId = session.user.id
    const now = new Date()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // ── Parallel aggregate queries (cached 1 min per user) ─────────────

    const result = await withCache(`stats:${playerId}:${days}`, 60_000, async () => {
      const [
        totalSessions,
        totalRepsResult,
        avgScoreResult,
        weekSessions,
        allSessions,
        sessionDrills,
        achievementCount,
        weekDurationResult,
        uniqueDrillsResult,
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

        // All sessions for daily breakdown (fetch up to 30 days, then slice)
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
            totalDurationSec: true,
          },
          orderBy: { startedAt: 'asc' },
        }),

        // All session drills for category breakdown
        db.workoutSessionDrill.findMany({
          where: { session: { playerId } },
          include: { drill: { select: { category: true } } },
          take: 10000,
        }),

        // Achievement count
        db.achievement.count({ where: { playerId } }),

        // Weekly training duration in seconds
        db.workoutSession.aggregate({
          where: { playerId, startedAt: { gte: oneWeekAgo } },
          _sum: { totalDurationSec: true },
        }),

        // Unique drills completed (distinct drillId)
        db.workoutSessionDrill.findMany({
          where: { session: { playerId } },
          select: { drillId: true },
          distinct: ['drillId'],
        }),
      ])

      // ── Build daily stats (last N days based on query param) ────────────

      const dailyMap = new Map<string, { sessions: number; reps: number; score: number; durationSec: number }>()

      // Initialize last N days
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now)
        day.setDate(day.getDate() - i)
        day.setHours(0, 0, 0, 0)
        const key = day.toISOString().split('T')[0]
        dailyMap.set(key, { sessions: 0, reps: 0, score: 0, durationSec: 0 })
      }

      // Populate from fetched sessions
      for (const ses of allSessions) {
        const key = new Date(ses.startedAt).toISOString().split('T')[0]
        const day = dailyMap.get(key)
        if (day) {
          day.sessions++
          day.reps += ses.totalReps
          day.score += ses.totalScore
          day.durationSec += ses.totalDurationSec ?? 0
        }
      }

      const dailyStats = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        sessions: data.sessions,
        reps: data.reps,
        score: data.sessions > 0 ? Math.round((data.score / data.sessions) * 10) / 10 : 0,
        durationMin: Math.round((data.durationSec / 60) * 10) / 10,
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
      const { current: currentStreak, best: bestStreak } = calculateStreak(
        allSessions.map((s) => s.startedAt),
      )

      // ── Achievements (lightweight — already fetched in parallel above) ─

      return {
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
        weeklyTrainingHours: Math.round(((weekDurationResult._sum.totalDurationSec ?? 0) / 3600) * 10) / 10,
        drillsCompleted: uniqueDrillsResult.length,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    trackError('GET /api/stats', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
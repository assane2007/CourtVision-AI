import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rateResult = rateLimit(`quests:${session.user.email}`, 30, 60000)
    if (!rateResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const playerId = session.user.id!

    // ── Today's date range ───────────────────────────────────────────
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // ── Week start (Monday) ─────────────────────────────────────────
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - diffToMonday)
    weekStart.setHours(0, 0, 0, 0)

    // ── Fetch today's data ──────────────────────────────────────────
    const [todaySessions, todayDrills, todayRepsResult, weekSessions] = await Promise.all([
      // Sessions today
      db.workoutSession.count({
        where: { playerId, startedAt: { gte: todayStart, lte: todayEnd } },
      }),

      // Drills today (for score check)
      db.workoutSessionDrill.findMany({
        where: {
          session: { playerId, startedAt: { gte: todayStart, lte: todayEnd } },
        },
        select: { score: true },
      }),

      // Total reps today
      db.workoutSession.aggregate({
        where: { playerId, startedAt: { gte: todayStart, lte: todayEnd } },
        _sum: { totalReps: true },
      }),

      // Sessions this week
      db.workoutSession.count({
        where: { playerId, startedAt: { gte: weekStart } },
      }),
    ])

    const todayTotalReps = todayRepsResult._sum.totalReps || 0
    const score80PlusCount = todayDrills.filter(d => d.score >= 80).length

    // ── Build daily quests ──────────────────────────────────────────
    const daily = [
      {
        id: 'session_today',
        title: 'Fais 1 séance',
        description: 'Complète une séance d\'entraînement aujourd\'hui',
        progress: Math.min(todaySessions, 1),
        target: 1,
        completed: todaySessions >= 1,
        xpReward: 25,
      },
      {
        id: 'reps_20',
        title: '20 répétitions',
        description: 'Fais 20 reps dans tes séances',
        progress: Math.min(todayTotalReps, 20),
        target: 20,
        completed: todayTotalReps >= 20,
        xpReward: 15,
      },
      {
        id: 'score_80',
        title: 'Score 80+',
        description: 'Obtiens un score de 80 ou plus',
        progress: Math.min(score80PlusCount, 1),
        target: 1,
        completed: score80PlusCount >= 1,
        xpReward: 30,
      },
    ]

    // ── Build weekly quests ─────────────────────────────────────────
    const weekly = [
      {
        id: 'sessions_3_week',
        title: '3 séances cette semaine',
        description: 'Complète 3 séances cette semaine',
        progress: Math.min(weekSessions, 3),
        target: 3,
        completed: weekSessions >= 3,
        xpReward: 75,
      },
    ]

    return NextResponse.json({ daily, weekly })
  } catch (error) {
    console.error('[GET /api/quests]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
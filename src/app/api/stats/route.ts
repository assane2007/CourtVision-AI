import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const totalSessions = await db.workoutSession.count({ where: { playerId } })

    const totalReps = await db.workoutSession.aggregate({
      where: { playerId },
      _sum: { totalReps: true },
    })

    const avgScore = await db.workoutSession.aggregate({
      where: { playerId },
      _avg: { totalScore: true },
    })

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weekSessions = await db.workoutSession.count({
      where: { playerId, startedAt: { gte: oneWeekAgo } }
    })

    const dailyStats: { date: string; sessions: number; reps: number; score: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date()
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const nextDay = new Date(day)
      nextDay.setDate(nextDay.getDate() + 1)

      const daySessions = await db.workoutSession.findMany({
        where: { playerId, startedAt: { gte: day, lt: nextDay } },
      })

      dailyStats.push({
        date: day.toISOString().split('T')[0],
        sessions: daySessions.length,
        reps: daySessions.reduce((s, ses) => s + ses.totalReps, 0),
        score: daySessions.length > 0
          ? daySessions.reduce((s, ses) => s + ses.totalScore, 0) / daySessions.length
          : 0,
      })
    }

    const sessionDrills = await db.workoutSessionDrill.findMany({
      where: { session: { playerId } },
      include: { drill: true },
    })

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

    const achievements = await db.achievement.findMany({
      where: { playerId },
      orderBy: { unlockedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      totalSessions,
      totalReps: totalReps._sum.totalReps || 0,
      avgScore: avgScore._avg.totalScore ? Math.round(avgScore._avg.totalScore * 10) / 10 : 0,
      weekSessions,
      dailyStats,
      categories,
      achievements,
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
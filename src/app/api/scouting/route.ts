import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

// ── Radar chart axis mapping: DB categories → radar axis ────────────────────
const RADAR_AXES = [
  { key: 'shooting', label: 'TIR', dbCategories: ['shooting'] },
  { key: 'dribble', label: 'DRIBBLE', dbCategories: ['ball_handling', 'pocket_ball'] },
  { key: 'vitesse', label: 'VITESSE', dbCategories: ['speed_change'] },
  { key: 'defense', label: 'DÉFENSE', dbCategories: ['defense'] },
  { key: 'placement', label: 'PLACEMENT', dbCategories: ['footwork'] },
  { key: 'endurance', label: 'ENDURANCE', dbCategories: ['conditioning'] },
] as const

// ── Grade thresholds ───────────────────────────────────────────────────────
function getGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

// ── Trend calculation from last 3 scores ───────────────────────────────────
function getTrend(scores: number[]): 'up' | 'down' | 'stable' {
  if (scores.length < 2) return 'stable'
  const recent = scores.slice(-3)
  if (recent.length < 2) return 'stable'
  const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
  const secondHalf = recent.slice(Math.floor(recent.length / 2))
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  const diff = avgSecond - avgFirst
  if (diff > 3) return 'up'
  if (diff < -3) return 'down'
  return 'stable'
}

// GET /api/scouting
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Rate limit: 30 requests per 15 minutes
    const rateResult = rateLimit(`scouting:get:${session.user.email}`, 30, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const playerId = session.user.id

    // Fetch player data
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { name: true, position: true, xp: true, xpLevel: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    // Fetch all session drills with their category
    const sessionDrills = await db.workoutSessionDrill.findMany({
      where: { session: { playerId } },
      include: {
        drill: { select: { category: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Fetch total sessions
    const totalWorkouts = await db.workoutSession.count({
      where: { playerId },
    })

    // Fetch last session date
    const lastSession = await db.workoutSession.findFirst({
      where: { playerId },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    })

    // ── Build per-category stats ──────────────────────────────────────
    const categories: {
      name: string
      key: string
      avgScore: number
      totalReps: number
      totalSessions: number
      trend: 'up' | 'down' | 'stable'
      lastScores: number[]
    }[] = []

    let totalAllReps = 0

    for (const axis of RADAR_AXES) {
      const matchingDrills = sessionDrills.filter((sd) =>
        axis.dbCategories.includes(sd.drill.category),
      )

      const totalScore = matchingDrills.reduce((sum, sd) => sum + sd.score, 0)
      const totalReps = matchingDrills.reduce((sum, sd) => sum + sd.reps, 0)
      const totalSessions = new Set(matchingDrills.map((sd) => sd.sessionId)).size
      const avgScore =
        matchingDrills.length > 0
          ? Math.round((totalScore / matchingDrills.length) * 10) / 10
          : 0

      // Extract individual drill scores sorted by time for trend
      const lastScores = matchingDrills
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((sd) => Math.round(sd.score * 10) / 10)

      const trend = getTrend(lastScores)

      categories.push({
        name: axis.label,
        key: axis.key,
        avgScore,
        totalReps,
        totalSessions,
        trend,
        lastScores,
      })

      totalAllReps += totalReps
    }

    // ── Overall score: average of all category scores ─────────────────
    const filledCategories = categories.filter((c) => c.avgScore > 0)
    const overallScore =
      filledCategories.length > 0
        ? Math.round(
            (filledCategories.reduce((s, c) => s + c.avgScore, 0) /
              filledCategories.length) *
              10,
          ) / 10
        : 0
    const overallGrade = getGrade(overallScore)

    // ── Compute level average for comparison ──────────────────────────
    // We use the player's own level as a benchmark.
    // For a simple approach: we look at all players at this level and compute their average per category.
    // Since we may have very few players, we provide a reasonable default based on level.
    const levelBenchmarks: Record<number, number> = {
      1: 25,
      2: 30,
      3: 35,
      4: 40,
      5: 45,
      6: 50,
      7: 55,
      8: 60,
      9: 65,
      10: 68,
      11: 71,
      12: 74,
      13: 77,
      14: 80,
      15: 83,
      16: 85,
      17: 88,
      18: 90,
      19: 92,
      20: 95,
    }
    const levelAvg =
      levelBenchmarks[player.xpLevel] ?? Math.min(25 + player.xpLevel * 3, 95)

    return NextResponse.json({
      player: {
        name: player.name,
        level: player.xpLevel,
        xp: player.xp,
        xpLevel: player.xpLevel,
      },
      categories,
      overallGrade,
      overallScore,
      totalWorkouts,
      totalReps: totalAllReps,
      lastActive: lastSession?.startedAt?.toISOString() ?? null,
      levelAvg,
    })
  } catch (error) {
    console.error('[GET /api/scouting]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
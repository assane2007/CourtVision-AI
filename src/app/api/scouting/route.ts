import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withCache } from '@/lib/cache'

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

    return withCache(`scouting:${playerId}`, 3 * 60 * 1000, async () => {
      // Fetch player data
      const player = await db.player.findUnique({
        where: { id: playerId },
        select: { name: true, position: true, xp: true, xpLevel: true },
      })

      if (!player) {
        return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
      }

      // ── Compute level average for comparison (needed early for estimates) ──
      const levelBenchmarks: Record<number, number> = {
        1: 25, 2: 30, 3: 35, 4: 40, 5: 45,
        6: 50, 7: 55, 8: 60, 9: 65, 10: 68,
        11: 71, 12: 74, 13: 77, 14: 80, 15: 83,
        16: 85, 17: 88, 18: 90, 19: 92, 20: 95,
      }
      const levelAvg =
        levelBenchmarks[player.xpLevel] ?? Math.min(25 + player.xpLevel * 3, 95)

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
        estimated: boolean
      }[] = []

      let totalAllReps = 0

      for (const axis of RADAR_AXES) {
        const matchingDrills = sessionDrills.filter((sd) =>
          (axis.dbCategories as readonly string[]).includes(sd.drill.category),
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

        // For new users with no data, use level-based benchmark estimate
        const isEstimated = matchingDrills.length === 0
        const displayScore = isEstimated
          ? Math.round(levelAvg * 0.6 * 10) / 10
          : avgScore

        categories.push({
          name: axis.label,
          key: axis.key,
          avgScore: displayScore,
          totalReps,
          totalSessions,
          trend,
          lastScores,
          estimated: isEstimated,
        })

        totalAllReps += totalReps
      }

      // ── Overall score: average of all category scores (real only) ─────
      const realCategories = categories.filter((c) => !c.estimated)
      const overallScore =
        realCategories.length > 0
          ? Math.round(
              (realCategories.reduce((s, c) => s + c.avgScore, 0) /
                realCategories.length) *
                10,
            ) / 10
          : 0
      const overallGrade = getGrade(overallScore)

      const hasEstimatedCategories = categories.some((c) => c.estimated)

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
        hasEstimatedCategories,
      })
    })
  } catch (error) {
    trackError('GET /api/scouting', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
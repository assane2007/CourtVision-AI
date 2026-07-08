import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { withCache } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// GET /api/records — Personal records per drill for authenticated user
export const GET = withAuth(async (_req, session) => {
  try {
    const playerId = session.user.id

    const rl = rateLimit(`records:get:${playerId}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    // Get all session drill entries for this player, ordered chronologically (cached 2 min per user)
    const result = await withCache(`records:${playerId}`, 2 * 60 * 1000, async () => {
      const allDrillEntries = await db.workoutSessionDrill.findMany({
        where: {
          session: { playerId },
        },
        include: {
          drill: {
            select: {
              id: true,
              name: true,
              nameFr: true,
              category: true,
              icon: true,
              difficulty: true,
            },
          },
          session: {
            select: {
              id: true,
              startedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 1000, // Safety limit to prevent unbounded memory usage
      })

      if (allDrillEntries.length === 0) {
        return { records: [], summary: { totalDrills: 0, avgPersonalBest: 0, mostImprovedDrill: null, totalTrainingMs: 0 } }
      }

      // Get the most recent session ID for "new record" detection
      const latestSession = await db.workoutSession.findFirst({
        where: { playerId },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      })

      const latestSessionId = latestSession?.id ?? ''

      // Group entries by drillId
      const drillMap = new Map<string, typeof allDrillEntries>()

      for (const entry of allDrillEntries) {
        const existing = drillMap.get(entry.drillId) ?? []
        existing.push(entry)
        drillMap.set(entry.drillId, existing)
      }

      // Build records
      interface DrillRecord {
        drillId: string
        drillName: string
        drillNameFr: string
        drillCategory: string
        drillIcon: string
        drillDifficulty: string
        bestScore: number
        bestReps: number
        fastestTimeMs: number
        totalSessions: number
        lastCompleted: Date
        scoreTrend: number[]
        avgScore: number
        isNewRecord: boolean
        avgDurationMs: number
      }

      const records: DrillRecord[] = []

      for (const [drillId, entries] of drillMap) {
        const drill = entries[0].drill

        // Best score (highest)
        let bestScore = 0
        let bestScoreEntry = entries[0]
        for (const e of entries) {
          if (e.score > bestScore) {
            bestScore = e.score
            bestScoreEntry = e
          }
        }

        // Best reps (most in a single set)
        let bestReps = 0
        for (const e of entries) {
          if (e.reps > bestReps) {
            bestReps = e.reps
          }
        }

        // Fastest time (lowest durationMs, skip 0)
        let fastestTime = Infinity
        for (const e of entries) {
          if (e.durationMs > 0 && e.durationMs < fastestTime) {
            fastestTime = e.durationMs
          }
        }

        // Total sessions completed (unique session count)
        const uniqueSessionIds = new Set(entries.map(e => e.sessionId))
        const totalSessions = uniqueSessionIds.size

        // Last completed date
        const lastEntry = entries[entries.length - 1]
        const lastCompleted = lastEntry.session.startedAt

        // Score trend — last 5 scores as array (chronological, last 5)
        const scores = entries.map(e => e.score)
        const last5Scores = scores.slice(-5)

        // Average score
        const totalScore = entries.reduce((sum, e) => sum + e.score, 0)
        const avgScore = Math.round((totalScore / entries.length) * 10) / 10

        // Is new record? (best score was set in the most recent session)
        const isNewRecord = bestScoreEntry.sessionId === latestSessionId

        // Average duration (skip 0)
        const durationsWithTime = entries.filter(e => e.durationMs > 0).map(e => e.durationMs)
        const avgDurationMs = durationsWithTime.length > 0
          ? Math.round(durationsWithTime.reduce((a, b) => a + b, 0) / durationsWithTime.length)
          : 0

        records.push({
          drillId,
          drillName: drill.name,
          drillNameFr: drill.nameFr,
          drillCategory: drill.category,
          drillIcon: drill.icon,
          drillDifficulty: drill.difficulty,
          bestScore,
          bestReps,
          fastestTimeMs: fastestTime === Infinity ? 0 : fastestTime,
          totalSessions,
          lastCompleted,
          scoreTrend: last5Scores,
          avgScore,
          isNewRecord,
          avgDurationMs,
        })
      }

      // Sort by best score descending
      records.sort((a, b) => b.bestScore - a.bestScore)

      // ── Summary calculations ──
      const totalDrills = records.length
      const avgPersonalBest = totalDrills > 0
        ? Math.round((records.reduce((sum, r) => sum + r.bestScore, 0) / totalDrills) * 10) / 10
        : 0

      // Most improved drill (biggest score increase between first and last score)
      let mostImprovedDrill: typeof records[0] | null = null
      let maxImprovement = -Infinity

      for (const record of records) {
        const entries = drillMap.get(record.drillId)
        if (entries && entries.length >= 2) {
          const firstScore = entries[0].score
          const lastScore = entries[entries.length - 1].score
          const improvement = lastScore - firstScore
          if (improvement > maxImprovement) {
            maxImprovement = improvement
            mostImprovedDrill = record
          }
        }
      }

      // Total training time
      const totalTrainingMs = allDrillEntries.reduce((sum, e) => sum + e.durationMs, 0)

      return {
        records,
        summary: {
          totalDrills,
          avgPersonalBest,
          mostImprovedDrill,
          totalTrainingMs,
        },
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    trackError('GET /api/records', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
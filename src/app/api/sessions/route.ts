import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { cacheInvalidatePattern } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'
import { awardXp } from '@/lib/award-xp'
import { calculateWorkoutXp, calculateStreakXp } from '@/lib/xp'
import { calculateStreak } from '@/lib/streak'
import { withAuth } from '@/lib/with-auth'

// POST /api/sessions — Create a new workout session with drill results
// XP is awarded SERVER-SIDE based on validated drill scores.
export const POST = withAuth(async (req: NextRequest, session) => {
  try {

    const rateResult = rateLimit(`sessions:post:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    // Check content-length before parsing body
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 1_000_000) {
      return NextResponse.json({ error: 'Requête trop volumineuse' }, { status: 413 })
    }

    const body = await req.json()
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { drillScores, notes } = parsed.data
    const playerId = session.user.id

    // Verify all drill IDs exist and are accessible
    const drillIds = drillScores.map(d => d.drillId)
    const accessibleDrills = await db.drill.findMany({
      where: {
        id: { in: drillIds },
        isActive: true,
        OR: [
          { playerId: null },
          { playerId },
        ],
      },
      select: { id: true },
    })

    const accessibleIds = new Set(accessibleDrills.map(d => d.id))
    const invalidIds = drillIds.filter(id => !accessibleIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `${invalidIds.length} exercice(s) introuvable(s) ou inaccessible(s)` },
        { status: 400 }
      )
    }

    // ── Compute totals from SERVER-VALIDATED drill scores ────────────────
    const totalScore = drillScores.reduce((sum, d) => sum + d.score, 0)
    const totalReps = drillScores.reduce((sum, d) => sum + d.reps, 0)
    const totalDurationMs = drillScores.reduce((sum, d) => sum + d.durationMs, 0)
    const avgScore = Math.round((totalScore / drillScores.length) * 10) / 10

    // ── Check for personal bests (server-side, using DB records) ────────
    // Fetch all personal bests in a single grouped query (avoids N+1)
    const personalBests = await db.workoutSessionDrill.groupBy({
      by: ['drillId'],
      where: { drillId: { in: drillIds }, session: { playerId } },
      _max: { score: true },
      orderBy: { drillId: 'asc' },
    })
    const bestMap = Object.fromEntries(personalBests.map(b => [b.drillId, b._max.score]))

    let isPersonalBest = false
    for (const ds of drillScores) {
      const prevBest = bestMap[ds.drillId] ?? 0
      if (ds.score > prevBest) {
        isPersonalBest = true
        break // At least one drill is a personal best
      }
    }

    // ── Create the workout session ───────────────────────────────────────
    const workoutSession = await db.workoutSession.create({
      data: {
        playerId,
        totalScore: Math.round(totalScore * 10) / 10,
        totalReps,
        totalDrills: drillScores.length,
        notes,
        endedAt: new Date(),
        drills: {
          create: drillScores.map(d => ({
            drillId: d.drillId,
            reps: d.reps,
            score: Math.round(d.score * 10) / 10,
            durationMs: d.durationMs,
            formFeedback: d.formFeedback || '{}',
          })),
        },
      },
      include: {
        drills: { include: { drill: { select: { id: true, nameFr: true, icon: true, category: true } } } },
      },
    })

    // ── Award XP SERVER-SIDE from validated scores ───────────────────────
    const durationSec = Math.round(totalDurationMs / 1000)
    const workoutRewards = calculateWorkoutXp(avgScore, totalReps, durationSec, isPersonalBest)
    const allRewards = [...workoutRewards]

    // Check streak and award streak XP
    const allPlayerSessions = await db.workoutSession.findMany({
      where: { playerId },
      select: { startedAt: true },
      orderBy: { startedAt: 'asc' },
    })
    const streakData = calculateStreak(allPlayerSessions.map(s => s.startedAt))
    if (streakData.current > 1) {
      allRewards.push(calculateStreakXp(streakData.current))
    }

    const xpResult = await awardXp(playerId, allRewards)

    // Invalidate caches that depend on session data
    cacheInvalidatePattern('stats:')
    cacheInvalidatePattern('records:')
    cacheInvalidatePattern('recommendations:')
    cacheInvalidatePattern('achievements:')
    cacheInvalidatePattern('leaderboard:')

    return NextResponse.json({
      session: workoutSession,
      xpAwarded: xpResult
        ? { xpGained: xpResult.xpGained, leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel }
        : null,
    }, { status: 201 })
  } catch (error) {
    trackError('POST /api/sessions', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// GET /api/sessions — List user's workout sessions (paginated)
export const GET = withAuth(async (req: NextRequest, session) => {
  try {

    const rl = rateLimit(`sessions:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
    const cursor = searchParams.get('cursor')
    const page = parseInt(searchParams.get('page') || '0', 10)

    // Support both cursor-based and page-based pagination
    // If ?page=1&limit=20 is used, convert to offset-based query
    if (page > 0 && !cursor) {
      const skip = (page - 1) * limit
      const [sessions, total] = await Promise.all([
        db.workoutSession.findMany({
          where: { playerId: session.user.id },
          include: {
            drills: {
              include: {
                drill: { select: { id: true, nameFr: true, icon: true, category: true } },
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip,
        }),
        db.workoutSession.count({ where: { playerId: session.user.id } }),
      ])

      return NextResponse.json({
        sessions,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      })
    }

    const sessions = await db.workoutSession.findMany({
      where: { playerId: session.user.id },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const nextCursor = sessions.length === limit ? sessions[sessions.length - 1].id : null

    return NextResponse.json({
      sessions,
      nextCursor,
      count: sessions.length,
    })
  } catch (error) {
    trackError('GET /api/sessions', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

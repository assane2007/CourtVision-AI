import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSessionSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { cacheInvalidatePattern } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// POST /api/sessions — Create a new workout session with drill results
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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

    // Verify all drill IDs exist and are accessible
    const drillIds = drillScores.map(d => d.drillId)
    const accessibleDrills = await db.drill.findMany({
      where: {
        id: { in: drillIds },
        isActive: true,
        OR: [
          { playerId: null },
          { playerId: session.user.id },
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

    const totalScore = drillScores.reduce((sum, d) => sum + d.score, 0)
    const totalReps = drillScores.reduce((sum, d) => sum + d.reps, 0)
    const totalDurationMs = drillScores.reduce((sum, d) => sum + d.durationMs, 0)

    const workoutSession = await db.workoutSession.create({
      data: {
        playerId: session.user.id,
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

    // Invalidate caches that depend on session data
    cacheInvalidatePattern('stats:')
    cacheInvalidatePattern('records:')
    cacheInvalidatePattern('recommendations:')
    cacheInvalidatePattern('achievements:')

    return NextResponse.json(workoutSession, { status: 201 })
  } catch (error) {
    trackError('POST /api/sessions', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/sessions — List user's workout sessions (paginated)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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
}
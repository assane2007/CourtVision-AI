import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createPlanSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// GET /api/plans — List user's training plans
export const GET = withAuth(async (request, session) => {
  try {

    const rl = rateLimit(`plans:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const plans = await db.trainingPlan.findMany({
      where: { playerId: session.user.id },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true, difficulty: true, durationSec: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { drills: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ plans })
  } catch (error) {
    trackError('GET /api/plans', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// POST /api/plans — Create a training plan
export const POST = withAuth(async (req: NextRequest, session) => {
  try {

    const rateResult = rateLimit(`plans:post:${session.user.email}`, 20, 15 * 60 * 1000)
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
    const parsed = createPlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { name, description, isPublic, drillIds } = parsed.data

    // Verify all drill IDs exist and are accessible
    let validDrillIds: string[] = []
    if (drillIds && drillIds.length > 0) {
      const drills = await db.drill.findMany({
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
      validDrillIds = drills.map(d => d.id)
    }

    const plan = await db.trainingPlan.create({
      data: {
        playerId: session.user.id,
        name,
        description,
        isPublic: isPublic ?? false,
        drills: {
          create: validDrillIds.map((drillId, index) => ({
            drillId,
            order: index,
          })),
        },
      },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    trackError('POST /api/plans', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updatePlanSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// GET /api/plans/[id] — Single plan with drills
export const GET = withAuth(async (_request, session, { params }) => {
  try {

    const rl = rateLimit(`plans:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { id } = await params

    const plan = await db.trainingPlan.findFirst({
      where: {
        id,
        OR: [
          { playerId: session.user.id },
          { isPublic: true },
        ],
      },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true, difficulty: true, durationSec: true, targetReps: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    trackError('GET /api/plans/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// PATCH /api/plans/[id] — Update plan
export const PATCH = withAuth(async (_request, session, { params }) => {
  try {

    const rateResult = rateLimit(`plans:patch:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    const { id } = await params

    const existing = await db.trainingPlan.findFirst({
      where: { id, playerId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 })
    }

    const body = await _request.json()
    const parsed = updatePlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const { drillIds, ...updateData } = parsed.data

    // If drill IDs provided, replace all plan drills
    if (drillIds !== undefined) {
      const validDrills = await db.drill.findMany({
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
      const validIds = validDrills.map(d => d.id)

      await db.$transaction([
        db.trainingPlanDrill.deleteMany({ where: { planId: id } }),
        ...validIds.map((drillId, index) =>
          db.trainingPlanDrill.create({
            data: { planId: id, drillId, order: index },
          })
        ),
      ])
    }

    const plan = await db.trainingPlan.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
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

    return NextResponse.json({ plan })
  } catch (error) {
    trackError('PATCH /api/plans/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// DELETE /api/plans/[id] — Delete plan
export const DELETE = withAuth(async (_request, session, { params }) => {
  try {

    const rateResult = rateLimit(`plans:delete:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    const { id } = await params

    const existing = await db.trainingPlan.findFirst({
      where: { id, playerId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 })
    }

    await db.trainingPlan.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Plan supprimé' })
  } catch (error) {
    trackError('DELETE /api/plans/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

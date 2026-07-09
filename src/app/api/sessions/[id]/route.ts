import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { endSessionSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// GET /api/sessions/[id] — Single session with drill details
export const GET = withAuth(async (request, session, { params }) => {
  try {

    const rl = rateLimit(`sessions:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { id } = await params

    const sessionData = await db.workoutSession.findFirst({
      where: { id, playerId: session.user.id },
      include: {
        drills: {
          include: {
            drill: { select: { id: true, nameFr: true, icon: true, category: true, difficulty: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!sessionData) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    return NextResponse.json(sessionData)
  } catch (error) {
    trackError('GET /api/sessions/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// PATCH /api/sessions/[id] — End/update a session (e.g., add final score, notes)
export const PATCH = withAuth(async (request, session, { params }) => {
  try {

    const rateResult = rateLimit(`sessions:patch:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    const { id } = await params

    // Verify ownership
    const existing = await db.workoutSession.findFirst({
      where: { id, playerId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = endSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const updated = await db.workoutSession.update({
      where: { id },
      data: {
        ...(parsed.data.totalScore !== undefined && { totalScore: parsed.data.totalScore }),
        ...(parsed.data.totalReps !== undefined && { totalReps: parsed.data.totalReps }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        endedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    trackError('PATCH /api/sessions/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// DELETE /api/sessions/[id] — Delete a session
export const DELETE = withAuth(async (request, session, { params }) => {
  try {

    const rateResult = rateLimit(`sessions:delete:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    const { id } = await params

    const existing = await db.workoutSession.findFirst({
      where: { id, playerId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 })
    }

    await db.workoutSession.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Séance supprimée' })
  } catch (error) {
    trackError('DELETE /api/sessions/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

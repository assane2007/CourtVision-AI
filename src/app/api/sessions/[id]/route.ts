import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { endSessionSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'

// GET /api/sessions/[id] — Single session with drill details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
}

// PATCH /api/sessions/[id] — End/update a session (e.g., add final score, notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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

    const body = await req.json()
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
}

// DELETE /api/sessions/[id] — Delete a session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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
}
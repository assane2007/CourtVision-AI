import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// GET /api/ai/workout/saved — List saved/generated workouts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id
    const url = new URL(req.url)
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

    const workouts = await db.generatedWorkout.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      workouts: workouts.map(w => {
        let reasoning: Record<string, unknown> = {}
        let focusAreas: string[] = []
        let drillIds: string[] = []
        try { reasoning = JSON.parse(w.aiReasoning) } catch { /* ignore */ }
        try { focusAreas = JSON.parse(w.focusAreas) } catch { /* ignore */ }
        try { drillIds = JSON.parse(w.drillIds) } catch { /* ignore */ }

        return {
          id: w.id,
          title: w.title,
          description: w.description,
          difficulty: w.difficulty,
          durationMin: w.durationMin,
          focusAreas,
          drillIds,
          drills: (reasoning as { drills?: unknown[] })?.drills || [],
          warmup: (reasoning as { warmup?: string })?.warmup || '',
          cooldown: (reasoning as { cooldown?: string })?.cooldown || '',
          expectedOutcome: (reasoning as { expectedOutcome?: string })?.expectedOutcome || '',
          isUsed: w.isUsed,
          createdAt: w.createdAt,
        }
      }),
      total: await db.generatedWorkout.count({ where: { playerId } }),
    })
  } catch (error) {
    trackError('GET /api/ai/workout/saved', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/ai/workout/saved — Mark workout as used or rate it
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id
    const body = await req.json()
    const { id, isUsed } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const workout = await db.generatedWorkout.findFirst({
      where: { id, playerId },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Entraînement non trouvé' }, { status: 404 })
    }

    const updated = await db.generatedWorkout.update({
      where: { id },
      data: { isUsed: typeof isUsed === 'boolean' ? isUsed : true },
    })

    return NextResponse.json({ id: updated.id, isUsed: updated.isUsed })
  } catch (error) {
    trackError('PATCH /api/ai/workout/saved', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/ai/workout/saved — Delete a generated workout
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const workout = await db.generatedWorkout.findFirst({
      where: { id, playerId },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Entraînement non trouvé' }, { status: 404 })
    }

    await db.generatedWorkout.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/ai/workout/saved', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
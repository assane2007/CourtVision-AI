import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`live:score:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: sessionId } = await params
    const body = await request.json()
    const { score, reps } = body

    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Score invalide' }, { status: 400 })
    }

    const participant = await db.liveParticipant.findUnique({
      where: { liveSessionId_playerId: { liveSessionId: sessionId, playerId: session.user.id } },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Pas participant' }, { status: 403 })
    }

    const updated = await db.liveParticipant.update({
      where: { id: participant.id },
      data: {
        score: Math.max(participant.score, score),
        reps: Math.max(participant.reps, reps || 0),
      },
    })

    return NextResponse.json({
      score: updated.score,
      reps: updated.reps,
    })
  } catch (error) {
    trackError('PUT /api/live/[id]/score', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
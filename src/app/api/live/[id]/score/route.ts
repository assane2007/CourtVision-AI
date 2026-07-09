import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'
import { liveScoreUpdateSchema, getZodErrorMessage } from '@/lib/validations'

export const PUT = withAuth(async (_request, session, { params }) => {
  try {

    const rl = rateLimit(`live:score:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: sessionId } = await params
    const body = await request.json()
    const parsed = liveScoreUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const { score, reps } = parsed.data

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
        reps: Math.max(participant.reps, reps),
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
})

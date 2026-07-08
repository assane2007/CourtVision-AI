import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`live:join:${session.user.id}`, 20, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: sessionId } = await params
    const liveSession = await db.liveSession.findUnique({ where: { id: sessionId } })

    if (!liveSession) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    if (liveSession.status === 'ended') {
      return NextResponse.json({ error: 'Session terminée' }, { status: 400 })
    }

    const participantCount = await db.liveParticipant.count({ where: { liveSessionId: sessionId } })
    if (participantCount >= liveSession.maxViewers && liveSession.hostId !== session.user.id) {
      return NextResponse.json({ error: 'Session pleine' }, { status: 400 })
    }

    const existing = await db.liveParticipant.findUnique({
      where: { liveSessionId_playerId: { liveSessionId: sessionId, playerId: session.user.id } },
    })

    if (existing) {
      return NextResponse.json({ message: 'Déjà participant', participantId: existing.id })
    }

    const participant = await db.liveParticipant.create({
      data: { liveSessionId: sessionId, playerId: session.user.id },
    })

    // Start session if first participant joins
    if (liveSession.status === 'waiting' && (participantCount + 1) >= 1) {
      await db.liveSession.update({
        where: { id: sessionId },
        data: { status: 'active', startedAt: new Date() },
      })
    }

    return NextResponse.json({ participantId: participant.id }, { status: 201 })
  } catch (error) {
    trackError('POST /api/live/[id]/join', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: sessionId } = await params
    await db.liveParticipant.deleteMany({
      where: { liveSessionId: sessionId, playerId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/live/[id]/join', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
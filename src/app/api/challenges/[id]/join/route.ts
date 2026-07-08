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

    const rl = rateLimit(`challenges:join:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: challengeId } = await params
    const playerId = session.user.id

    const challenge = await db.challenge.findUnique({ where: { id: challengeId } })
    if (!challenge) {
      return NextResponse.json({ error: 'Défi introuvable' }, { status: 404 })
    }

    const existing = await db.challengeParticipant.findUnique({
      where: { challengeId_playerId: { challengeId, playerId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Déjà participant' }, { status: 409 })
    }

    const participant = await db.challengeParticipant.create({
      data: { challengeId, playerId },
      include: {
        player: { select: { id: true, name: true, avatar: true } },
      },
    })

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    trackError('POST /api/challenges/[id]/join', error)
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

    const { id: challengeId } = await params
    await db.challengeParticipant.deleteMany({
      where: { challengeId, playerId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/challenges/[id]/join', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
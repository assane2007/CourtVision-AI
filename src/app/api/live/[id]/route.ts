import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_request, session, { params }) => {
  try {

    const { id } = await params
    const liveSession = await db.liveSession.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        participants: {
          include: {
            player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
          },
          orderBy: { score: 'desc' },
        },
      },
    })

    if (!liveSession) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    const isParticipant = liveSession.participants.some(p => p.playerId === session.user.id)
    const isHost = liveSession.hostId === session.user.id

    const rankings = liveSession.participants.map(p => ({
      playerId: p.player.id,
      name: p.player.name,
      avatar: p.player.avatar,
      xpLevel: p.player.xpLevel,
      score: p.score,
      reps: p.reps,
      isCurrentPlayer: p.playerId === session.user.id,
    })).sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, rank: i + 1 }))

    return NextResponse.json({
      session: {
        id: liveSession.id,
        title: liveSession.title,
        drillId: liveSession.drillId,
        status: liveSession.status,
        maxViewers: liveSession.maxViewers,
        host: liveSession.host,
        isHost,
        isParticipant,
        participantCount: liveSession.participants.length,
        rankings,
        startedAt: liveSession.startedAt,
        endedAt: liveSession.endedAt,
        createdAt: liveSession.createdAt,
      },
    })
  } catch (error) {
    trackError('GET /api/live/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_request, session, { params }) => {
  try {

    const { id } = await params
    const liveSession = await db.liveSession.findUnique({ where: { id } })
    if (!liveSession || liveSession.hostId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const updated = await db.liveSession.update({
      where: { id },
      data: { status: 'ended', endedAt: new Date() },
      include: {
        participants: {
          include: {
            player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
          },
        },
      },
    })

    const rankings = updated.participants.map(p => ({
      playerId: p.player.id,
      name: p.player.name,
      avatar: p.player.avatar,
      xpLevel: p.player.xpLevel,
      score: p.score,
      reps: p.reps,
    })).sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, rank: i + 1 }))

    return NextResponse.json({ success: true, rankings })
  } catch (error) {
    trackError('DELETE /api/live/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

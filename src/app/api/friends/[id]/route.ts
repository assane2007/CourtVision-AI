import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (request, session, { params }) => {
  try {

    const { id: otherPlayerId } = await params
    const playerId = session.user.id

    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: playerId, recipientId: otherPlayerId },
          { requesterId: otherPlayerId, recipientId: playerId },
        ],
      },
      select: { id: true, status: true, requesterId: true, createdAt: true },
    })

    return NextResponse.json({
      friendshipId: friendship?.id || null,
      status: friendship?.status || 'none',
      isRequester: friendship?.requesterId === playerId || false,
      createdAt: friendship?.createdAt || null,
    })
  } catch (error) {
    trackError('GET /api/friends/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (request, session, { params }) => {
  try {

    const rl = rateLimit(`friends:delete:${session.user.id}`, 20, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: otherPlayerId } = await params
    const playerId = session.user.id

    // Find the friendship between current user and the target player
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: playerId, recipientId: otherPlayerId },
          { requesterId: otherPlayerId, recipientId: playerId },
        ],
      },
    })
    if (!friendship) {
      return NextResponse.json({ error: 'Amitié introuvable' }, { status: 404 })
    }

    await db.friendship.delete({ where: { id: friendship.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/friends/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

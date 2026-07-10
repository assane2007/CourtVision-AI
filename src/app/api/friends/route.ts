import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'
import { friendsPatchSchema, friendsSendSchema, getZodErrorMessage } from '@/lib/validations'

export const GET = withAuth(async (request, session) => {
  try {

    const rl = rateLimit(`friends:list:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const playerId = session.user.id
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all' // all, friends, sent, received, blocked
    const search = searchParams.get('search') || ''

    // Search players
    if (search) {
      const players = await db.player.findMany({
        where: {
          id: { not: playerId },
          OR: [
            { name: { contains: search } },
          ],
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          xpLevel: true,
          position: true,
        },
        take: 20,
      })

      // Get friendship status for each
      const friendships = await db.friendship.findMany({
        where: {
          OR: [
            { requesterId: playerId, recipientId: { in: players.map(p => p.id) } },
            { recipientId: playerId, requesterId: { in: players.map(p => p.id) } },
          ],
        },
        select: { id: true, requesterId: true, recipientId: true, status: true },
      })

      const results = players.map(p => {
        const f = friendships.find(fr =>
          (fr.requesterId === p.id && fr.recipientId === playerId) ||
          (fr.recipientId === p.id && fr.requesterId === playerId)
        )
        return {
          ...p,
          friendshipStatus: f?.status || null,
        }
      })

      return NextResponse.json({ players: results })
    }

    // Tab-based listing
    const where: Record<string, unknown> = {}

    if (tab === 'friends') {
      where.status = 'accepted'
      where.OR = [
        { requesterId: playerId },
        { recipientId: playerId },
      ]
    } else if (tab === 'sent') {
      where.requesterId = playerId
      where.status = 'pending'
    } else if (tab === 'received') {
      where.recipientId = playerId
      where.status = 'pending'
    } else if (tab === 'blocked') {
      where.OR = [
        { requesterId: playerId, status: 'blocked' },
        { recipientId: playerId, status: 'blocked' },
      ]
    } else {
      where.OR = [
        { requesterId: playerId },
        { recipientId: playerId },
      ]
    }

    const [friendships, counts] = await Promise.all([
      db.friendship.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, avatar: true, xpLevel: true, position: true } },
          recipient: { select: { id: true, name: true, avatar: true, xpLevel: true, position: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      db.friendship.groupBy({
        by: ['status'],
        where: {
          OR: [
            { requesterId: playerId },
            { recipientId: playerId },
          ],
          status: { in: ['accepted', 'pending', 'blocked'] },
        },
        _count: true,
      }),
    ])

    const friends = friendships.map(f => {
      const isRequester = f.requesterId === playerId
      const otherPlayer = isRequester ? f.recipient : f.requester
      return {
        id: f.id,
        playerId: otherPlayer.id,
        name: otherPlayer.name,
        avatar: otherPlayer.avatar,
        xpLevel: otherPlayer.xpLevel,
        position: otherPlayer.position,
        status: f.status,
        isRequester,
        createdAt: f.createdAt,
      }
    })

    const countMap: Record<string, number> = {}
    for (const c of counts) {
      if (c.status === 'accepted') {
        countMap.friends = (countMap.friends || 0) + c._count
      } else if (c.status === 'pending') {
        countMap.pending = (countMap.pending || 0) + c._count
      } else if (c.status === 'blocked') {
        countMap.blocked = (countMap.blocked || 0) + c._count
      }
    }

    return NextResponse.json({
      friends,
      counts: {
        friends: countMap.friends || 0,
        pending: countMap.pending || 0,
        blocked: countMap.blocked || 0,
      },
    })
  } catch (error) {
    trackError('GET /api/friends', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, session) => {
  try {

    const rl = rateLimit(`friends:send:${session.user.id}`, 20, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = friendsSendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }
    const { recipientId } = parsed.data

    if (!recipientId || recipientId === session.user.id) {
      return NextResponse.json({ error: 'Destinataire invalide' }, { status: 400 })
    }

    const recipient = await db.player.findUnique({ where: { id: recipientId } })
    if (!recipient) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    // Check existing
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, recipientId },
          { requesterId: recipientId, recipientId: session.user.id },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'accepted') return NextResponse.json({ error: 'Déjà amis' }, { status: 409 })
      if (existing.status === 'blocked') return NextResponse.json({ error: 'Action non disponible' }, { status: 403 })
      if (existing.status === 'pending') return NextResponse.json({ error: 'Demande déjà envoyée' }, { status: 409 })
    }

    const friendship = await db.friendship.create({
      data: {
        requesterId: session.user.id,
        recipientId,
        status: 'pending',
      },
      include: {
        recipient: { select: { id: true, name: true, avatar: true, xpLevel: true, position: true } },
      },
    })

    // Create notification
    await db.notification.create({
      data: {
        playerId: recipientId,
        type: 'friend_request',
        title: 'Nouvelle demande d\'ami',
        body: `${session.user.name} veut être votre ami(e)`,
        data: JSON.stringify({ friendshipId: friendship.id, requesterId: session.user.id, requesterName: session.user.name }),
      },
    })

    return NextResponse.json({ friendship }, { status: 201 })
  } catch (error) {
    trackError('POST /api/friends', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest, session) => {
  try {

    const body = await request.json()
    const parsed = friendsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const { friendshipId, action } = parsed.data

    const friendship = await db.friendship.findUnique({ where: { id: friendshipId } })
    if (!friendship) {
      return NextResponse.json({ error: 'Ami introuvable' }, { status: 404 })
    }

    const playerId = session.user.id
    const isRecipient = friendship.recipientId === playerId
    const isRequester = friendship.requesterId === playerId

    if (!isRecipient && !isRequester) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    let newStatus: string
    if (action === 'accept') {
      if (friendship.status !== 'pending') {
        return NextResponse.json({ error: 'Demande non en attente' }, { status: 400 })
      }
      newStatus = 'accepted'
    } else if (action === 'decline') {
      newStatus = 'declined'
    } else {
      newStatus = 'blocked'
    }

    const updated = await db.friendship.update({
      where: { id: friendshipId },
      data: { status: newStatus },
    })

    // Notification for accept
    if (action === 'accept') {
      const otherId = isRequester ? friendship.recipientId : friendship.requesterId
      await db.notification.create({
        data: {
          playerId: otherId,
          type: 'friend_request',
          title: 'Demande acceptée',
          body: `${session.user.name} a accepté votre demande d'ami`,
          data: JSON.stringify({ friendshipId, accepted: true }),
          isRead: true,
        },
      })
    }

    return NextResponse.json({ friendship: updated })
  } catch (error) {
    trackError('PATCH /api/friends', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

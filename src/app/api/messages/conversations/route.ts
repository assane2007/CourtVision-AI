import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (request: Request, session) => {
  try {

    const rl = rateLimit(`messages:convos:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const memberships = await db.conversationMember.findMany({
      where: { playerId: session.user.id },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                player: { select: { id: true, name: true, avatar: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, content: true, type: true, senderId: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    })

    let conversations = memberships.map(m => {
      const conv = m.conversation
      const otherMembers = conv.members.filter(cm => cm.playerId !== session.user.id)
      const otherPlayer = otherMembers[0]?.player
      const lastMessage = conv.messages[0]

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name || otherPlayer?.name || 'Conversation',
        avatar: conv.avatar || otherPlayer?.avatar || null,
        otherPlayer: otherPlayer ? { id: otherPlayer.id, name: otherPlayer.name, avatar: otherPlayer.avatar } : null,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          type: lastMessage.type,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          isOwn: lastMessage.senderId === session.user.id,
        } : null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: 0, // Will compute below
      }
    })

    // Batch all unread counts in a single query (avoids N+1)
    const allUnread = await db.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map(c => c.id) },
        senderId: { not: session.user.id },
        isRead: false,
      },
      _count: { id: true },
    })
    const unreadMap = Object.fromEntries(allUnread.map(u => [u.conversationId, u._count.id]))

    // Apply unread counts to conversations
    for (const conv of conversations) {
      const membership = memberships.find(m => m.conversationId === conv.id)
      if (membership) {
        conv.unreadCount = unreadMap[conv.id] || 0
      }
    }

    // Search filter
    if (search) {
      conversations = conversations.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    return NextResponse.json({ conversations })
  } catch (error) {
    trackError('GET /api/messages/conversations', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, session) => {
  try {

    const rl = rateLimit(`messages:create:${session.user.id}`, 10, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { recipientId } = body

    if (!recipientId || recipientId === session.user.id) {
      return NextResponse.json({ error: 'Destinataire invalide' }, { status: 400 })
    }

    const recipient = await db.player.findUnique({ where: { id: recipientId } })
    if (!recipient) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    // Check for existing DM
    const existingMembership = await db.conversationMember.findFirst({
      where: { playerId: session.user.id },
      include: {
        conversation: {
          include: {
            members: { where: { playerId: recipientId } },
          },
        },
      },
    })

    if (existingMembership && existingMembership.conversation.members.length > 0) {
      return NextResponse.json({
        conversationId: existingMembership.conversation.id,
        exists: true,
      })
    }

    const conversation = await db.conversation.create({
      data: { type: 'dm' },
    })

    await db.conversationMember.createMany({
      data: [
        { conversationId: conversation.id, playerId: session.user.id },
        { conversationId: conversation.id, playerId: recipientId },
      ],
    })

    return NextResponse.json({ conversationId: conversation.id, exists: false }, { status: 201 })
  } catch (error) {
    trackError('POST /api/messages/conversations', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

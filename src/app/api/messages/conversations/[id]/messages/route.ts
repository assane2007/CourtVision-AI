import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (request, session, { params }) => {
  try {

    const { id: conversationId } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(Number(searchParams.get('limit')) || 40, 100)

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_playerId: { conversationId, playerId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    })

    const hasMore = messages.length > limit
    if (hasMore) messages.pop()

    return NextResponse.json({
      messages: messages.reverse().map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        metadata: JSON.parse(m.metadata || '{}'),
        isRead: m.isRead,
        createdAt: m.createdAt,
        isOwn: m.senderId === session.user.id,
        sender: { id: m.sender.id, name: m.sender.name, avatar: m.sender.avatar },
      })),
      nextCursor: hasMore ? messages[0]?.id : null,
    })
  } catch (error) {
    trackError('GET /api/messages/conversations/[id]/messages', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const POST = withAuth(async (request, session, { params }) => {
  try {

    const rl = rateLimit(`messages:send:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: conversationId } = await params
    const body = await request.json()
    const { content, type, metadata } = body

    if (!content?.trim() && type !== 'workout') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_playerId: { conversationId, playerId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        content: content?.trim() || '',
        type: type || 'text',
        metadata: JSON.stringify(metadata || {}),
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    // Notify other members
    const otherMembers = await db.conversationMember.findMany({
      where: { conversationId, playerId: { not: session.user.id } },
    })
    for (const member of otherMembers) {
      await db.notification.create({
        data: {
          playerId: member.playerId,
          type: 'system',
          title: 'Nouveau message',
          body: `${session.user.name}: ${(content || '').trim().slice(0, 80)}`,
          data: JSON.stringify({ conversationId, messageId: message.id, senderName: session.user.name }),
        },
      })
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        metadata: JSON.parse(message.metadata),
        createdAt: message.createdAt,
        isOwn: true,
        sender: message.sender,
      },
    }, { status: 201 })
  } catch (error) {
    trackError('POST /api/messages/conversations/[id]/messages', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

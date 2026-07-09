import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_request, session, { params }) => {
  try {

    const { id: conversationId } = await params

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_playerId: { conversationId, playerId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: { player: { select: { id: true, name: true, avatar: true } } },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const otherMember = conversation.members.find(m => m.playerId !== session.user.id)

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        avatar: conversation.avatar,
        otherPlayer: otherMember ? { id: otherMember.player.id, name: otherMember.player.name, avatar: otherMember.player.avatar } : null,
      },
    })
  } catch (error) {
    trackError('GET /api/messages/conversations/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (_request, session, { params }) => {
  try {

    const { id: conversationId } = await params

    await db.conversationMember.updateMany({
      where: {
        conversationId,
        playerId: session.user.id,
      },
      data: { lastReadAt: new Date() },
    })

    // Mark messages as read
    await db.message.updateMany({
      where: {
        conversationId,
        senderId: { not: session.user.id },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('PATCH /api/messages/conversations/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

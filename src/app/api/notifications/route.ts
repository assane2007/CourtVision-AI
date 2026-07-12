import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (request, session) => {
  try {

    const rl = rateLimit(`notifications:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50)
    const unreadOnly = searchParams.get('unread') === 'true'

    const where: Record<string, unknown> = { playerId: session.user.id }
    if (unreadOnly) where.isRead = false

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({
        where: { playerId: session.user.id, isRead: false },
      }),
    ])

    const hasMore = notifications.length > limit
    if (hasMore) notifications.pop()

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: JSON.parse(n.data || '{}'),
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
      unreadCount,
    })
  } catch (error) {
    trackError('GET /api/notifications', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest, session) => {
  try {

    const body = await request.json()
    const { notificationId, markAll } = body

    if (markAll !== undefined && typeof markAll !== 'boolean') {
      return NextResponse.json({ error: 'markAll must be a boolean' }, { status: 400 })
    }

    if (notificationId !== undefined && typeof notificationId !== 'string') {
      return NextResponse.json({ error: 'notificationId must be a string' }, { status: 400 })
    }

    if (markAll) {
      await db.notification.updateMany({
        where: { playerId: session.user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId requis' }, { status: 400 })
    }

    const notification = await db.notification.findUnique({ where: { id: notificationId } })
    if (!notification || notification.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('PATCH /api/notifications', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

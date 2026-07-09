import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const POST = withAuth<{ id: string }>(async (_request: Request, session, { params }) => {
  try {

    const rl = rateLimit(`feed:like:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: postId } = await params
    const playerId = session.user.id

    const post = await db.feedPost.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
    }

    const existing = await db.feedPostLike.findUnique({
      where: { postId_playerId: { postId, playerId } },
    })

    if (existing) {
      // Unlike
      await db.feedPostLike.delete({ where: { id: existing.id } })
      await db.feedPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      })

      // Notify post owner
      if (post.playerId !== playerId) {
        await db.notification.create({
          data: {
            playerId: post.playerId,
            type: 'like',
            title: 'Like retiré',
            body: `${session.user.name} a retiré son like`,
            data: JSON.stringify({ postId, likerId: playerId }),
            isRead: true,
          },
        })
      }

      return NextResponse.json({ liked: false, likesCount: Math.max(0, post.likesCount - 1) })
    } else {
      // Like
      await db.feedPostLike.create({
        data: { postId, playerId },
      })
      await db.feedPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      })

      if (post.playerId !== playerId) {
        await db.notification.create({
          data: {
            playerId: post.playerId,
            type: 'like',
            title: 'Nouveau like',
            body: `${session.user.name} a aimé votre post`,
            data: JSON.stringify({ postId, likerId: playerId, likerName: session.user.name }),
          },
        })
      }

      return NextResponse.json({ liked: true, likesCount: post.likesCount + 1 })
    }
  } catch (error) {
    trackError('POST /api/feed/[id]/like', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

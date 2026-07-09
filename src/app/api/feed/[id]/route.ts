import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth<{ id: string }>(async (_request: Request, session, { params }) => {
  try {

    const { id } = await params
    const [post, isLiked] = await Promise.all([
      db.feedPost.findUnique({
        where: { id },
        include: {
          player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
          session: { select: { id: true, totalScore: true, totalReps: true, totalDrills: true, totalDurationSec: true } },
        },
      }),
      db.feedPostLike.findUnique({
        where: { postId_playerId: { postId: id, playerId: session.user.id } },
      }),
    ])

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        type: post.type,
        imageUrls: JSON.parse(post.imageUrls || '[]'),
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isLiked: !!isLiked,
        createdAt: post.createdAt,
        player: post.player,
        session: post.session || undefined,
      },
    })
  } catch (error) {
    trackError('GET /api/feed/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const DELETE = withAuth<{ id: string }>(async (_request: Request, session, { params }) => {
  try {

    const { id } = await params
    const post = await db.feedPost.findUnique({ where: { id } })
    if (!post || post.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await db.feedPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/feed/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const post = await db.feedPost.findUnique({
      where: { id },
      include: {
        player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        session: { select: { id: true, totalScore: true, totalReps: true, totalDrills: true, totalDurationSec: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
    }

    const isLiked = await db.feedPostLike.findUnique({
      where: { postId_playerId: { postId: id, playerId: session.user.id } },
    })

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
}
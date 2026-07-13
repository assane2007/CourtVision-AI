import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { rateLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/with-auth';

export const GET = withAuth(async (request, session, { params }) => {
  try {

    const { id: postId } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams?.get('cursor')
    const limit = Math.min(Number(searchParams?.get('limit')) || 20, 50)

    const comments = await db?.comment?.findMany({
      where: { postId },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        player: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: {
            player: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 5,
        },
        _count: { select: { replies: true } },
      },
    })

    const hasMore = comments?.length > limit
    if (hasMore) comments?.pop()

    const enriched = comments?.map(c => ({
      id: c?.id,
      content: c?.content,
      likesCount: c?.likesCount,
      createdAt: c?.createdAt,
      player: c?.player,
      replies: c?.replies,
      totalReplies: c?._count?.replies,
    }))

    return NextResponse?.json({
      comments: enriched,
      nextCursor: hasMore ? comments?.[comments?.length - 1]?.id : null,
    });
  } catch (error) {
    trackError('GET /api/feed/[id]/comments', error)
    return NextResponse?.json({ error: 'Erreur serveur' }, { status: 500 });
  }
})

export const POST = withAuth(async (request, session, { params }) => {
  try {

    const rl = rateLimit(`feed:comment:${session?.user?.id}`, 30, 15 * 60 * 1000)
    if (!rl?.success) {
      return NextResponse?.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    const { id: postId } = await params
    const body = await request?.json()
    const { content, replyToId } = body

    if (!content?.trim()) {
      return NextResponse?.json({ error: 'Commentaire requis' }, { status: 400 });
    }

    const post = await db?.feedPost?.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse?.json({ error: 'Post introuvable' }, { status: 404 });
    }

    if (replyToId) {
      // Reply to a comment
      const parentComment = await db?.comment?.findUnique({ where: { id: replyToId } })
      if (!parentComment || parentComment?.postId !== postId) {
        return NextResponse?.json({ error: 'Commentaire introuvable' }, { status: 404 });
      }

      const reply = await db?.commentReply?.create({
        data: {
          commentId: replyToId,
          playerId: session?.user?.id,
          content: content?.trim(),
        },
        include: {
          player: { select: { id: true, name: true, avatar: true } },
        },
      })

      return NextResponse?.json({ reply }, { status: 201 });
    }

    const comment = await db?.comment?.create({
      data: {
        postId,
        playerId: session?.user?.id,
        content: content?.trim(),
      },
      include: {
        player: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Update post comment count
    await db?.feedPost?.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    })

    // Notify post owner
    if (post?.playerId !== session?.user?.id) {
      await db?.notification?.create({
        data: {
          playerId: post?.playerId,
          type: 'comment',
          title: 'Nouveau commentaire',
          body: `${session?.user?.name}: ${content?.trim()?.slice(0, 80)}`,
          data: JSON.stringify({ postId, commentId: comment?.id, commenterName: session?.user?.name }),
        },
      })
    }

    return NextResponse?.json({ comment }, { status: 201 });
  } catch (error) {
    trackError('POST /api/feed/[id]/comments', error)
    return NextResponse?.json({ error: 'Erreur serveur' }, { status: 500 });
  }
})

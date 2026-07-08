import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`feed:list:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
    const type = searchParams.get('type') // text, workout, achievement, challenge, video

    const where: Record<string, unknown> = {}
    if (type) where.type = type

    const posts = await db.feedPost.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        session: { select: { id: true, totalScore: true, totalReps: true, totalDrills: true, totalDurationSec: true } },
      },
    })

    // Batch get likes and comment counts
    const postIds = posts.map(p => p.id)
    const myLikes = await db.feedPostLike.findMany({
      where: { postId: { in: postIds }, playerId: session.user.id },
      select: { postId: true },
    })
    const likedSet = new Set(myLikes.map(l => l.postId))

    const enriched = posts.map(p => ({
      id: p.id,
      content: p.content,
      type: p.type,
      imageUrls: JSON.parse(p.imageUrls || '[]'),
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      isLiked: likedSet.has(p.id),
      createdAt: p.createdAt,
      player: p.player,
      session: p.session || undefined,
    }))

    const hasMore = posts.length > limit
    if (hasMore) enriched.pop()

    return NextResponse.json({
      posts: enriched,
      nextCursor: hasMore ? posts[posts.length - 2]?.id : null,
    })
  } catch (error) {
    trackError('GET /api/feed', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`feed:create:${session.user.id}`, 10, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { content, type, sessionId, imageUrls } = body

    if (!content && !sessionId) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
    }

    const validTypes = ['text', 'workout', 'achievement', 'challenge', 'video']
    const postType = validTypes.includes(type) ? type : 'text'

    const post = await db.feedPost.create({
      data: {
        playerId: session.user.id,
        content: content?.trim() || '',
        type: postType,
        sessionId: sessionId || null,
        imageUrls: JSON.stringify(imageUrls || []),
      },
      include: {
        player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        session: { select: { id: true, totalScore: true, totalReps: true, totalDrills: true, totalDurationSec: true } },
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    trackError('POST /api/feed', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
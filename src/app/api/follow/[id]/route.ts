import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: playerId } = await params

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, followers, following

    if (type === 'followers' || type === 'all') {
      const followers = await db.follow.findMany({
        where: { followingId: playerId },
        include: {
          follower: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      if (type === 'followers') {
        const enriched = await Promise.all(followers.map(async (f) => ({
          playerId: f.followerId,
          ...f.follower,
          isFollowing: f.followerId === session.user.id ? false : !!(await db.follow.findUnique({
            where: { followerId_followingId: { followerId: session.user.id, followingId: f.followerId } },
          })),
          followedAt: f.createdAt,
        })))

        return NextResponse.json({ followers: enriched })
      }
    }

    if (type === 'following' || type === 'all') {
      const following = await db.follow.findMany({
        where: { followerId: playerId },
        include: {
          following: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      const enriched = following.map(f => ({
        playerId: f.followingId,
        ...f.following,
        isFollowing: true,
        followedAt: f.createdAt,
      }))

      if (type === 'following') {
        return NextResponse.json({ following: enriched })
      }
    }

    // type === 'all'
    const followers = await db.follow.findMany({
      where: { followingId: playerId },
      include: { follower: { select: { id: true, name: true, avatar: true, xpLevel: true } } },
      take: 50,
    })
    const following = await db.follow.findMany({
      where: { followerId: playerId },
      include: { following: { select: { id: true, name: true, avatar: true, xpLevel: true } } },
      take: 50,
    })

    return NextResponse.json({
      followersCount: await db.follow.count({ where: { followingId: playerId } }),
      followingCount: await db.follow.count({ where: { followerId: playerId } }),
      followers: followers.map(f => ({ playerId: f.followerId, ...f.follower })),
      following: following.map(f => ({ playerId: f.followingId, ...f.following })),
    })
  } catch (error) {
    trackError('GET /api/follow/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
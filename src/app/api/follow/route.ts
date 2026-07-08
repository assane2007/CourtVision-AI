import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`follow:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { followingId } = body

    if (!followingId || followingId === session.user.id) {
      return NextResponse.json({ error: 'Joueur invalide' }, { status: 400 })
    }

    const target = await db.player.findUnique({ where: { id: followingId } })
    if (!target) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId } },
    })

    if (existing) {
      // Unfollow
      await db.follow.delete({ where: { id: existing.id } })
      return NextResponse.json({ following: false })
    } else {
      // Follow
      await db.follow.create({
        data: { followerId: session.user.id, followingId },
      })

      await db.notification.create({
        data: {
          playerId: followingId,
          type: 'follow',
          title: 'Nouvel abonné',
          body: `${session.user.name} vous suit`,
          data: JSON.stringify({ followerId: session.user.id, followerName: session.user.name }),
        },
      })

      return NextResponse.json({ following: true })
    }
  } catch (error) {
    trackError('POST /api/follow', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const followingId = searchParams.get('playerId')

    if (!followingId) {
      return NextResponse.json({ error: 'playerId requis' }, { status: 400 })
    }

    const isFollowing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId } },
    })

    return NextResponse.json({ isFollowing: !!isFollowing })
  } catch (error) {
    trackError('GET /api/follow', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
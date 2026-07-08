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

    const rl = rateLimit(`live:list:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    const where: Record<string, unknown> = {}
    if (status === 'active') {
      where.status = { in: ['waiting', 'active'] }
    }

    const sessions = await db.liveSession.findMany({
      where,
      include: {
        host: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        maxViewers: s.maxViewers,
        viewerCount: s._count.participants,
        host: s.host,
        isHost: s.hostId === session.user.id,
        startedAt: s.startedAt,
        createdAt: s.createdAt,
      })),
    })
  } catch (error) {
    trackError('GET /api/live', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`live:create:${session.user.id}`, 3, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { title, drillId, maxViewers } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
    }

    const liveSession = await db.liveSession.create({
      data: {
        hostId: session.user.id,
        title: title.trim(),
        drillId: drillId || null,
        maxViewers: maxViewers || 10,
        status: 'waiting',
      },
      include: {
        host: { select: { id: true, name: true, avatar: true, xpLevel: true } },
      },
    })

    return NextResponse.json({ session: liveSession }, { status: 201 })
  } catch (error) {
    trackError('POST /api/live', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
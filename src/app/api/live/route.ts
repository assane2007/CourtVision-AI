import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'
import { createLiveSessionSchema, getZodErrorMessage } from '@/lib/validations'

export const GET = withAuth(async (request, session) => {
  try {

    const rl = rateLimit(`live:list:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    const where: Record<string, unknown> = {}
    if (status === 'active') {
      // Discovery mode: show all active/waiting sessions from any user
      where.status = { in: ['waiting', 'active'] }
    } else {
      // Non-active history: only show user's own sessions
      where.hostId = session.user.id
      if (status === 'completed' || status === 'ended') {
        where.status = { in: ['completed', 'ended'] }
      }
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
})

export const POST = withAuth(async (request: NextRequest, session) => {
  try {

    const rl = rateLimit(`live:create:${session.user.id}`, 3, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = createLiveSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const { title, drillId, maxViewers } = parsed.data

    const liveSession = await db.liveSession.create({
      data: {
        hostId: session.user.id,
        title,
        drillId: drillId ?? null,
        maxViewers,
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
})

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

    const rl = rateLimit(`teams:list:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const myTeams = searchParams.get('my') === 'true'

    const where: Record<string, unknown> = {}
    if (myTeams) {
      where.members = { some: { playerId: session.user.id } }
    } else {
      where.isPublic = true
    }

    const teams = await db.team.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true, challenges: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Add memberCount and if current user is a member
    const enriched = teams.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      logo: t.logo,
      sport: t.sport,
      isPublic: t.isPublic,
      maxMembers: t.maxMembers,
      memberCount: t._count.members,
      challengeCount: t._count.challenges,
      owner: t.owner,
      createdAt: t.createdAt,
    }))

    return NextResponse.json({ teams: enriched })
  } catch (error) {
    trackError('GET /api/teams', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`teams:create:${session.user.id}`, 5, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { name, description, logo, isPublic, maxMembers } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nom d\'équipe requis (min 2 caractères)' }, { status: 400 })
    }

    const team = await db.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        logo: logo || null,
        isPublic: isPublic !== false,
        maxMembers: maxMembers || 15,
        ownerId: session.user.id,
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Add owner as member
    await db.teamMember.create({
      data: {
        teamId: team.id,
        playerId: session.user.id,
        role: 'owner',
      },
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    trackError('POST /api/teams', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_request, session, { params }) => {
  try {

    const { id } = await params
    const team = await db.team.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        members: {
          include: {
            player: { select: { id: true, name: true, avatar: true, xpLevel: true, position: true, xp: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        challenges: {
          include: {
            challenge: {
              select: { id: true, title: true, type: true, targetValue: true, unit: true, startDate: true, endDate: true, xpReward: true },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { members: true, challenges: true } },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
    }

    // Aggregate member XP
    const totalXp = team.members.reduce((sum, m) => sum + m.player.xp, 0)
    const avgLevel = team.members.length > 0
      ? Math.round(team.members.reduce((sum, m) => sum + m.player.xpLevel, 0) / team.members.length)
      : 0

    // Leaderboard: members ranked by XP
    const leaderboard = team.members
      .map(m => ({
        playerId: m.player.id,
        name: m.player.name,
        avatar: m.player.avatar,
        xp: m.player.xp,
        xpLevel: m.player.xpLevel,
        position: m.player.position,
        role: m.role,
      }))
      .sort((a, b) => b.xp - a.xp)

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        logo: team.logo,
        sport: team.sport,
        isPublic: team.isPublic,
        maxMembers: team.maxMembers,
        owner: team.owner,
        memberCount: team._count.members,
        challengeCount: team._count.challenges,
        totalXp,
        avgLevel,
        members: team.members.map(m => ({
          id: m.id,
          playerId: m.player.id,
          name: m.player.name,
          avatar: m.player.avatar,
          xpLevel: m.player.xpLevel,
          position: m.player.position,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        leaderboard,
        challenges: team.challenges.map(tc => tc.challenge),
        createdAt: team.createdAt,
      },
    })
  } catch (error) {
    trackError('GET /api/teams/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (_request, session, { params }) => {
  try {

    const { id } = await params
    const team = await db.team.findUnique({ where: { id } })
    if (!team || team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await _request.json()
    const { name, description, logo, isPublic, maxMembers } = body

    const updated = await db.team.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(logo !== undefined && { logo }),
        ...(isPublic !== undefined && { isPublic }),
        ...(maxMembers && { maxMembers }),
      },
    })

    return NextResponse.json({ team: updated })
  } catch (error) {
    trackError('PATCH /api/teams/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_request, session, { params }) => {
  try {

    const { id } = await params
    const team = await db.team.findUnique({ where: { id } })
    if (!team || team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await db.team.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/teams/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

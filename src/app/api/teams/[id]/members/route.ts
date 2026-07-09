import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_request, session, { params }) => {
  try {

    const { id: teamId } = await params
    const team = await db.team.findUnique({ where: { id: teamId }, select: { maxMembers: true } })
    if (!team) {
      return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
    }

    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
        player: { select: { id: true, name: true, avatar: true, xpLevel: true, position: true, xp: true } },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json({
      members: members.map(m => ({
        id: m.id,
        playerId: m.player.id,
        name: m.player.name,
        avatar: m.player.avatar,
        xpLevel: m.player.xpLevel,
        position: m.player.position,
        xp: m.player.xp,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (error) {
    trackError('GET /api/teams/[id]/members', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const POST = withAuth(async (_request, session, { params }) => {
  try {

    const rl = rateLimit(`teams:join:${session.user.id}`, 20, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: teamId } = await params
    const body = await request.json()
    const targetPlayerId = body.playerId || session.user.id

    const team = await db.team.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
    }

    // Only owner can invite others, otherwise joining yourself
    if (targetPlayerId !== session.user.id && team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Seul le propriétaire peut inviter' }, { status: 403 })
    }

    // Check member count and existing membership in parallel
    const [memberCount, existing] = await Promise.all([
      db.teamMember.count({ where: { teamId } }),
      db.teamMember.findUnique({
        where: { teamId_playerId: { teamId, playerId: targetPlayerId } },
      }),
    ])
    if (memberCount >= team.maxMembers) {
      return NextResponse.json({ error: 'Équipe pleine' }, { status: 400 })
    }
    if (existing) {
      return NextResponse.json({ error: 'Déjà membre' }, { status: 409 })
    }

    const member = await db.teamMember.create({
      data: {
        teamId,
        playerId: targetPlayerId,
        role: team.ownerId === targetPlayerId ? 'owner' : 'member',
      },
      include: {
        player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    trackError('POST /api/teams/[id]/members', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_request, session, { params }) => {
  try {

    const { id: teamId } = await params
    const { searchParams } = new URL(request.url)
    const targetPlayerId = searchParams.get('playerId') || session.user.id

    const team = await db.team.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 })
    }

    // Can remove yourself, or owner can remove others
    if (targetPlayerId !== session.user.id && team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Owner can't leave (must delete team)
    if (targetPlayerId === team.ownerId) {
      return NextResponse.json({ error: 'Le propriétaire ne peut pas quitter' }, { status: 400 })
    }

    const member = await db.teamMember.findUnique({
      where: { teamId_playerId: { teamId, playerId: targetPlayerId } },
    })
    if (!member) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
    }

    await db.teamMember.delete({ where: { id: member.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('DELETE /api/teams/[id]/members', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

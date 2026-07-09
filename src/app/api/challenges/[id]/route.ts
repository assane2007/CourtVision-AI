import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_request, session, { params }) => {
  try {

    const { id } = await params
    const challenge = await db.challenge.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true, xpLevel: true } },
        participants: {
          include: {
            player: { select: { id: true, name: true, avatar: true, xpLevel: true } },
          },
          orderBy: { currentValue: 'desc' },
          take: 100,
        },
        teamChallenges: {
          include: { team: { select: { id: true, name: true, logo: true } } },
        },
      },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'Défi introuvable' }, { status: 404 })
    }

    const participation = await db.challengeParticipant.findUnique({
      where: { challengeId_playerId: { challengeId: id, playerId: session.user.id } },
    })

    const leaderboard = challenge.participants
      .map(p => ({
        playerId: p.player.id,
        name: p.player.name,
        avatar: p.player.avatar,
        xpLevel: p.player.xpLevel,
        currentValue: p.currentValue,
        targetValue: challenge.targetValue,
        completed: p.completed,
        completedAt: p.completedAt,
        rank: p.rank,
      }))
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((p, i) => ({ ...p, rank: p.rank || i + 1 }))

    const progressPercent = participation
      ? Math.min(100, Math.round((participation.currentValue / challenge.targetValue) * 100))
      : 0

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        targetValue: challenge.targetValue,
        unit: challenge.unit,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        isPublic: challenge.isPublic,
        xpReward: challenge.xpReward,
        creator: challenge.creator,
        participantCount: challenge.participants.length,
        teams: challenge.teamChallenges.map(tc => tc.team),
        leaderboard,
        myParticipation: participation ? {
          currentValue: participation.currentValue,
          completed: participation.completed,
          completedAt: participation.completedAt,
          progressPercent,
        } : null,
        createdAt: challenge.createdAt,
      },
    })
  } catch (error) {
    trackError('GET /api/challenges/[id]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

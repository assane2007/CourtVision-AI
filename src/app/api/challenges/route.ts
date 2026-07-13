import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { rateLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/with-auth';

export const GET = withAuth(async (request, session) => {
  try {

    const rl = rateLimit(`challenges:list:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'active'
    const now = new Date()

    const where: Record<string, unknown> = { isPublic: true }

    if (tab === 'active') {
      where.startDate = { lte: now }
      where.endDate = { gte: now }
    } else if (tab === 'upcoming') {
      where.startDate = { gt: now }
    } else if (tab === 'completed') {
      where.endDate = { lt: now }
    } else if (tab === 'my') {
      where.creatorId = session.user.id
    }

    const challenges = await db.challenge.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Batch-fetch participation status for all challenges at once (avoids N+1)
    const challengeIds = challenges.map(c => c.id)
    const participations = await db.challengeParticipant.findMany({
      where: {
        challengeId: { in: challengeIds },
        playerId: session.user.id,
      },
      select: { challengeId: true, currentValue: true, completed: true },
    })
    const participationMap = new Map(participations.map(p => [p.challengeId, p]))

    const enriched = challenges.map(c => {
      const participation = participationMap.get(c.id)

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        targetValue: c.targetValue,
        unit: c.unit,
        startDate: c.startDate,
        endDate: c.endDate,
        isPublic: c.isPublic,
        xpReward: c.xpReward,
        creator: c.creator,
        participantCount: c._count.participants,
        isJoined: !!participation,
        myProgress: participation?.currentValue || 0,
        isCompleted: participation?.completed || false,
        createdAt: c.createdAt,
      }
    })

    return NextResponse.json({ challenges: enriched })
  } catch (error) {
    trackError('GET /api/challenges', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, session) => {
  try {

    const rl = rateLimit(`challenges:create:${session.user.id}`, 5, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { title, description, type, targetValue, unit, startDate, endDate, isPublic, xpReward, teamId } = body

    if (!title || !description || !type || !targetValue || !startDate || !endDate) {
      return NextResponse.json({ error: 'Tous les champs requis' }, { status: 400 })
    }

    const validTypes = ['drill_score', 'total_reps', 'streak', 'speed', 'custom']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de défi invalide' }, { status: 400 })
    }

    const challenge = await db.challenge.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        type,
        targetValue: Number(targetValue),
        unit: unit || 'reps',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isPublic: isPublic !== false,
        xpReward: xpReward || 100,
        creatorId: session.user.id,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Link to team if provided
    if (teamId) {
      const teamExists = await db.team.findUnique({ where: { id: teamId } })
      if (teamExists) {
        await db.teamChallenge.create({
          data: { teamId, challengeId: challenge.id },
        })
      }
    }

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (error) {
    trackError('POST /api/challenges', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

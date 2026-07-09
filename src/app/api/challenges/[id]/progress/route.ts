import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth<{ id: string }>(async (_request: Request, session, { params }) => {
  try {

    const { id: challengeId } = await params
    const participation = await db.challengeParticipant.findUnique({
      where: { challengeId_playerId: { challengeId, playerId: session.user.id } },
    })

    if (!participation) {
      return NextResponse.json({ error: 'Pas encore participant' }, { status: 404 })
    }

    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      select: { targetValue: true, unit: true, endDate: true },
    })

    return NextResponse.json({
      currentValue: participation.currentValue,
      completed: participation.completed,
      completedAt: participation.completedAt,
      progressPercent: challenge ? Math.min(100, Math.round((participation.currentValue / challenge.targetValue) * 100)) : 0,
      targetValue: challenge?.targetValue,
      unit: challenge?.unit,
    })
  } catch (error) {
    trackError('GET /api/challenges/[id]/progress', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const PUT = withAuth<{ id: string }>(async (_request: Request, session, { params }) => {
  try {

    const rl = rateLimit(`challenges:progress:${session.user.id}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const { id: challengeId } = await params
    const body = await request.json()
    const { value } = body

    if (typeof value !== 'number' || value < 0) {
      return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })
    }

    const participation = await db.challengeParticipant.findUnique({
      where: { challengeId_playerId: { challengeId, playerId: session.user.id } },
    })

    if (!participation) {
      // Auto-join
      const challenge = await db.challenge.findUnique({ where: { id: challengeId } })
      if (!challenge) return NextResponse.json({ error: 'Défi introuvable' }, { status: 404 })

      const completed = value >= challenge.targetValue
      const newParticipation = await db.challengeParticipant.create({
        data: {
          challengeId,
          playerId: session.user.id,
          currentValue: value,
          completed,
          completedAt: completed ? new Date() : null,
        },
      })

      return NextResponse.json({
        currentValue: newParticipation.currentValue,
        completed: newParticipation.completed,
        progressPercent: Math.min(100, Math.round((value / challenge.targetValue) * 100)),
      })
    }

    const newValue = Math.max(participation.currentValue, value)
    const challenge = await db.challenge.findUnique({ where: { id: challengeId } })
    const completed = !participation.completed && challenge && newValue >= challenge.targetValue

    const updated = await db.challengeParticipant.update({
      where: { id: participation.id },
      data: {
        currentValue: newValue,
        ...(completed && { completed: true, completedAt: new Date() }),
      },
    })

    return NextResponse.json({
      currentValue: updated.currentValue,
      completed: updated.completed,
      progressPercent: challenge ? Math.min(100, Math.round((updated.currentValue / challenge.targetValue) * 100)) : 0,
    })
  } catch (error) {
    trackError('PUT /api/challenges/[id]/progress', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

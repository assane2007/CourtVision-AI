import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { shareSchema, getZodErrorMessage } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Rate limit: 10 req / 15 min
    const rl = rateLimit(`share:${session.user.id}`, 10, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = shareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const { sessionId } = parsed.data

    let sessionData: {
      startedAt: Date
      totalScore: number
      totalReps: number
      totalDrills: number
    } | null = null

    if (sessionId) {
      // Verify the session belongs to the user
      sessionData = await db.workoutSession.findFirst({
        where: { id: sessionId, playerId: session.user.id },
        select: {
          startedAt: true,
          totalScore: true,
          totalReps: true,
          totalDrills: true,
        },
      })
    }

    const dateStr = sessionData
      ? new Date(sessionData.startedAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })

    const score = sessionData ? Math.round(sessionData.totalScore) : 0
    const reps = sessionData?.totalReps ?? 0
    const drills = sessionData?.totalDrills ?? 0

    const shareText = [
      '🏀 CourtVision AI',
      `Séance du ${dateStr}`,
      `Score: ${score}/100`,
      `Reps: ${reps}`,
      `Exercices: ${drills}`,
      'Rejoins-moi!',
    ].join('\n')

    const shareUrl = 'https://courtvision.ai'

    return NextResponse.json({
      shareText,
      shareUrl,
    })
  } catch (error) {
    trackError('POST /api/share', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { formatDate } from '@/lib/date-utils'

export const POST = withAuth(async (request, session) => {
  try {
    const rl = rateLimit(`share:${session.user.id}`, 10, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { sessionId, postToFeed, content } = body

    let sessionData: {
      startedAt: Date
      totalScore: number
      totalReps: number
      totalDrills: number
    } | null = null

    if (sessionId) {
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

    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    const dateStr = sessionData
      ? formatDate(sessionData.startedAt, 'fr', dateOptions)
      : formatDate(new Date(), 'fr', dateOptions)

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

    // Optionally post to feed
    let feedPost = null
    if (postToFeed) {
      const postContent = content || `Séance du ${dateStr} — Score: ${score}/100, ${reps} reps, ${drills} exercices. 🏀`
      feedPost = await db.feedPost.create({
        data: {
          playerId: session.user.id,
          content: postContent,
          type: 'workout',
          sessionId: sessionId || null,
        },
        include: {
          player: { select: { id: true, name: true, avatar: true } },
        },
      })
    }

    return NextResponse.json({
      shareText,
      shareUrl,
      feedPost,
    })
  } catch (error) {
    trackError('POST /api/share', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
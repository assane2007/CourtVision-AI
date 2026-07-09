import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { reactionSchema, getZodErrorMessage } from '@/lib/validations'
import { trackError } from '@/lib/monitoring'
import { awardXp } from '@/lib/award-xp'

// ─── GET /api/reaction ─────────────────────────────────────────────────────────
// Returns player's reaction history (last 20 sessions) + personal bests per type

export const GET = withAuth(async (req, session) => {
  const rl = rateLimit(`reaction:get:${session.user.id}`, 30, 15 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429 },
    )
  }

  try {
    // Get last 20 scores, grouped by creation batch (all scores from same second)
    const recentScores = await db.reactionScore.findMany({
      where: { playerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 200, // enough to cover ~20 games of 10 rounds each
    })

    // Group into game sessions (scores within 2 seconds of each other)
    const games: {
      id: string
      type: string
      avgMs: number
      accuracy: number
      bestMs: number
      rounds: number
      createdAt: string
    }[] = []

    let currentGroup: typeof recentScores = []
    let lastTime = 0

    for (const score of recentScores) {
      const timeDiff = lastTime ? Math.abs(score.createdAt.getTime() - lastTime) : 0
      if (timeDiff > 2000 && currentGroup.length > 0) {
        // Push the group
        const type = currentGroup[0].type
        const avgMs = Math.round(currentGroup.reduce((s, r) => s + r.reactionMs, 0) / currentGroup.length)
        const accuracy = Math.round((currentGroup.filter(r => r.correct).length / currentGroup.length) * 100)
        const bestMs = Math.min(...currentGroup.map(r => r.reactionMs))
        games.push({
          id: currentGroup[0].id,
          type,
          avgMs,
          accuracy,
          bestMs,
          rounds: currentGroup.length,
          createdAt: currentGroup[0].createdAt.toISOString(),
        })
        currentGroup = []
      }
      currentGroup.push(score)
      lastTime = score.createdAt.getTime()
    }

    // Push last group
    if (currentGroup.length > 0) {
      const type = currentGroup[0].type
      const avgMs = Math.round(currentGroup.reduce((s, r) => s + r.reactionMs, 0) / currentGroup.length)
      const accuracy = Math.round((currentGroup.filter(r => r.correct).length / currentGroup.length) * 100)
      const bestMs = Math.min(...currentGroup.map(r => r.reactionMs))
      games.push({
        id: currentGroup[0].id,
        type,
        avgMs,
        accuracy,
        bestMs,
        rounds: currentGroup.length,
        createdAt: currentGroup[0].createdAt.toISOString(),
      })
    }

    // Personal bests per type — use aggregate to avoid loading all rows
    const personalBestsRaw = await db.reactionScore.groupBy({
      by: ['type'],
      where: { playerId: session.user.id, correct: true },
      _min: { reactionMs: true },
    })

    const personalBests: Record<string, number> = {}
    for (const row of personalBestsRaw) {
      if (row._min.reactionMs !== null) {
        personalBests[row.type] = row._min.reactionMs
      }
    }

    return NextResponse.json({
      history: games.slice(0, 20),
      personalBests,
    })
  } catch (error) {
    trackError('GET /api/reaction', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// ─── POST /api/reaction ────────────────────────────────────────────────────────
// Save a reaction game result

export const POST = withAuth(async (req, session) => {
  const rl = rateLimit(session.user.id, 10, 15 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429 },
    )
  }

  try {
    const body = await req.json()
    const parsed = reactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const { type, rounds } = parsed.data

    // Calculate aggregate stats
    const totalMs = rounds.reduce((s, r) => s + r.reactionMs, 0)
    const avgMs = Math.round(totalMs / rounds.length)
    const correctCount = rounds.filter(r => r.correct).length
    const accuracy = Math.round((correctCount / rounds.length) * 100)

    // Save each round
    await db.reactionScore.createMany({
      data: rounds.map((round) => ({
        playerId: session.user!.id,
        type,
        reactionMs: round.reactionMs,
        correct: round.correct,
      })),
    })

    // Award XP if average reaction time is under 400ms
    let xpAwarded = 0
    if (avgMs < 400 && accuracy >= 70) {
      xpAwarded = avgMs < 250 ? 30 : avgMs < 300 ? 20 : 10
      const result = await awardXp(session.user.id, [
        {
          amount: xpAwarded,
          source: 'challenge' as const,
          description: `Reaction Trainer: ${type} — ${avgMs}ms moyen`,
        },
      ])
      xpAwarded = result?.xpGained ?? 0
    }

    return NextResponse.json({
      success: true,
      avgMs,
      accuracy,
      rounds: rounds.length,
      bestMs: Math.min(...rounds.map(r => r.reactionMs)),
      xpAwarded,
    })
  } catch (error) {
    trackError('POST /api/reaction', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
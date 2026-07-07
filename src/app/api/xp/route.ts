import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getZodErrorMessage } from '@/lib/validations'
import {
  calculateWorkoutXp,
  calculateStreakXp,
  type XpReward,
} from '@/lib/xp'
import { awardXp } from '@/lib/award-xp'

// Zod schemas for XP POST body
const workoutXpSchema = z.object({
  source: z.literal('workout'),
  score: z.number().min(0).max(100),
  reps: z.number().int().min(0).max(999),
  durationSec: z.number().min(0).max(3600).optional(),
  isPersonalBest: z.boolean().optional(),
})

const streakXpSchema = z.object({
  source: z.literal('streak'),
  streakDays: z.number().int().min(1).max(30),
})

const xpPostSchema = z.discriminatedUnion('source', [workoutXpSchema, streakXpSchema])

// POST /api/xp — Award workout or streak XP to the current user.
// Achievement and challenge XP are awarded server-side via awardXp() directly.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rateResult = rateLimit(`xp:post:${session.user.email}`, 20, 15 * 60 * 1000)
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans 15 minutes.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = xpPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const playerId = session.user.id
    let rewards: XpReward[] = []

    if (parsed.data.source === 'workout') {
      const { score, reps, durationSec, isPersonalBest } = parsed.data
      rewards = calculateWorkoutXp(score, reps, Math.max(0, Math.round(durationSec || 0)), !!isPersonalBest)
    } else if (parsed.data.source === 'streak') {
      rewards = [calculateStreakXp(parsed.data.streakDays)]
    }

    const result = await awardXp(playerId, rewards)
    if (!result) {
      return NextResponse.json({ error: 'Impossible d\'accorder le XP' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    trackError('POST /api/xp', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/xp — Get XP history for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rl = rateLimit(`xp:get:${session.user.id}`, 30, 15 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const playerId = session.user.id
    const url = new URL(req.url)
    const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10)
    const limit = Number.isNaN(rawLimit) ? 20 : Math.min(50, Math.max(1, rawLimit))

    const [player, xpLogs] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: { xp: true, xpLevel: true },
      }),
      db.xpLog.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ])

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      xp: player.xp,
      level: player.xpLevel,
      logs: xpLogs,
    })
  } catch (error) {
    trackError('GET /api/xp', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
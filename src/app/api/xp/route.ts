import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import {
  calculateWorkoutXp,
  calculateStreakXp,
  getAchievementXp,
  getChallengeXp,
  getTotalXp,
  getLevelFromXp,
  type XpReward,
} from '@/lib/xp'

// POST /api/xp — Award XP to the current user
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

    // Validate source type
    const validSources = ['workout', 'streak', 'achievement', 'challenge', 'bonus']
    if (!body.source || !validSources.includes(body.source)) {
      return NextResponse.json({ error: 'Source de XP invalide' }, { status: 400 })
    }

    const playerId = session.user.id
    let rewards: XpReward[] = []

    switch (body.source) {
      case 'workout': {
        const { score, reps, durationSec, isPersonalBest } = body
        if (typeof score !== 'number' || typeof reps !== 'number') {
          return NextResponse.json({ error: 'Paramètres manquants: score, reps' }, { status: 400 })
        }
        rewards = calculateWorkoutXp(
          score,
          Math.max(0, Math.min(999, Math.round(reps))),
          Math.max(0, Math.round(durationSec || 0)),
          !!isPersonalBest,
        )
        break
      }
      case 'streak': {
        const { streakDays } = body
        if (typeof streakDays !== 'number' || streakDays < 1) {
          return NextResponse.json({ error: 'streakDays invalide' }, { status: 400 })
        }
        rewards = [calculateStreakXp(Math.min(streakDays, 30))]
        break
      }
      case 'achievement':
        rewards = [getAchievementXp()]
        break
      case 'challenge':
        rewards = [getChallengeXp()]
        break
      default:
        return NextResponse.json({ error: 'Source non supportée' }, { status: 400 })
    }

    const totalXp = getTotalXp(rewards)
    if (totalXp <= 0) {
      return NextResponse.json({ error: 'Aucun XP à accorder' }, { status: 400 })
    }

    // Get current player
    const player = await db.player.findUnique({ where: { id: playerId } })
    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    const oldLevel = getLevelFromXp(player.xp)
    const newXp = player.xp + totalXp
    const newLevel = getLevelFromXp(newXp)

    // Create XP log entries and update player in a transaction
    await db.$transaction([
      // Update player XP and level
      db.player.update({
        where: { id: playerId },
        data: { xp: newXp, xpLevel: newLevel },
      }),
      // Create XP log entries
      ...rewards.map((reward) =>
        db.xpLog.create({
          data: {
            playerId,
            amount: reward.amount,
            source: reward.source,
            description: reward.description,
          },
        }),
      ),
    ])

    return NextResponse.json({
      xpGained: totalXp,
      newTotalXp: newXp,
      oldLevel,
      newLevel,
      leveledUp: newLevel > oldLevel,
      rewards,
    })
  } catch (error) {
    console.error('[POST /api/xp]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/xp — Get XP history for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const playerId = session.user.id
    const url = new URL(req.url)
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

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
    console.error('[GET /api/xp]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
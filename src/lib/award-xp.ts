/**
 * Server-only XP awarding function.
 * Other API routes (achievements, reaction, sessions) should import this
 * instead of making HTTP calls to /api/xp.
 */
import { db } from '@/lib/db'
import { getTotalXp, getLevelFromXp, type XpReward } from '@/lib/xp'
import { trackError } from '@/lib/monitoring'

export interface AwardXpResult {
  xpGained: number
  newTotalXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
  rewards: XpReward[]
}

/**
 * Award XP to a player. This is the SINGLE authoritative function
 * for XP changes — do NOT expose achievement/challenge sources via
 * the public API.
 */
export async function awardXp(
  playerId: string,
  rewards: XpReward[],
): Promise<AwardXpResult | null> {
  try {
    const totalXp = getTotalXp(rewards)
    if (totalXp <= 0) return null

    const player = await db.player.findUnique({ where: { id: playerId } })
    if (!player) return null

    const oldLevel = getLevelFromXp(player.xp)
    const newXp = player.xp + totalXp
    const newLevel = getLevelFromXp(newXp)

    await db.$transaction([
      db.player.update({
        where: { id: playerId },
        data: { xp: newXp, xpLevel: newLevel },
      }),
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

    return {
      xpGained: totalXp,
      newTotalXp: newXp,
      oldLevel,
      newLevel,
      leveledUp: newLevel > oldLevel,
      rewards,
    }
  } catch (error) {
    trackError('awardXp', error)
    return null
  }
}
/**
 * Server-only XP awarding function.
 * Other API routes (achievements, reaction, sessions) should import this
 * instead of making HTTP calls to /api/xp.
 */
import { db } from '@/lib/db';
import { getTotalXp, getLevelFromXp, type XpReward } from '@/lib/xp';
import { trackError } from '@/lib/monitoring';

export interface AwardXpResult {
  xpGained: number
  newTotalXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
  rewards: XpReward[]
}

/**
 * Award XP to a player atomically using `increment` to prevent
 * lost-update race conditions under concurrency.
 *
 * This is the SINGLE authoritative function for XP changes.
 */
export async function awardXp(
  playerId: string,
  rewards: XpReward[],
): Promise<AwardXpResult | null> {
  try {
    const totalXp = getTotalXp(rewards)
    if (totalXp <= 0) return null

    // Read current player for old level calculation
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { xp: true, xpLevel: true },
    })
    if (!player) return null

    const oldLevel = getLevelFromXp(player.xp)

    // Atomic increment + create XP logs in a single transaction
    await db.$transaction([
      db.player.update({
        where: { id: playerId },
        data: { xp: { increment: totalXp } },
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

    // Re-read to get the new total (after atomic increment)
    const updated = await db.player.findUnique({
      where: { id: playerId },
      select: { xp: true },
    })
    if (!updated) return null

    const newLevel = getLevelFromXp(updated.xp)

    // Update level if it changed (separate write, acceptable — level is derived)
    if (newLevel !== oldLevel) {
      await db.player.update({
        where: { id: playerId },
        data: { xpLevel: newLevel },
      })
    }

    return {
      xpGained: totalXp,
      newTotalXp: updated.xp,
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
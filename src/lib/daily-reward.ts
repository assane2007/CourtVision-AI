import { db } from '@/lib/db';
import { awardXp } from '@/lib/award-xp';

export async function claimDailyLoginReward(playerId: string): Promise<{ awarded: boolean; xp: number }> {
  const today = new Date().toISOString().split('T')[0]

  // Check if already claimed today
  const existing = await db.dailyLogin.findUnique({
    where: { playerId_date: { playerId, date: today } },
  })

  if (existing) return { awarded: false, xp: 0 }

  // Award XP and record
  const xpAmount = 10
  await db.dailyLogin.create({
    data: { playerId, date: today, xpAwarded: xpAmount },
  })
  await awardXp(playerId, [
    { amount: xpAmount, source: 'bonus', description: 'Récompense de connexion quotidienne 🎁' },
  ])

  return { awarded: true, xp: xpAmount }
}
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type TierRequirement = 'pro' | 'elite'

export async function requireSubscription(
  userId: string,
  requiredTier: TierRequirement,
) {
  const player = await db.player.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, subscriptionExpiresAt: true },
  })

  if (!player) return false

  const tierLevels: Record<string, number> = { free: 0, pro: 1, elite: 2 }
  const requiredLevel = tierLevels[requiredTier] ?? 0
  const userLevel = tierLevels[player.subscriptionStatus ?? 'free'] ?? 0

  if (userLevel < requiredLevel) return false

  // Check expiration
  if (player.subscriptionExpiresAt && new Date(player.subscriptionExpiresAt) < new Date()) {
    return false
  }

  return true
}

export function subscriptionError(requiredTier: TierRequirement) {
  const tierNames: Record<string, string> = { pro: 'Pro', elite: 'Elite' }
  return NextResponse.json(
    { error: `Abonnement ${tierNames[requiredTier]} requis`, requiredTier },
    { status: 403 },
  )
}
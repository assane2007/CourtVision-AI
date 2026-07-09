/**
 * Subscription guard — checks if a player has an active subscription
 * of the required tier.
 *
 * Usage in routes:
 *   export const POST = requireSubscription('pro', async (req, auth) => { ... })
 *
 * Usage in services:
 *   await checkSubscription(auth.playerId, 'elite')
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toErrorResponse, AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { requireAuth } from './auth.guard'
import type { AuthContext } from '@/lib/types/service.types'
import type { SubscriptionTier } from '@/lib/types/api.types'
import { logger } from '@/lib/logger'

// ── Tier Hierarchy ──────────────────────────────────────────────────────────────

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  elite: 2,
}

const TIER_NAMES: Record<string, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  elite: 'Élite',
}

// ── Core Check ─────────────────────────────────────────────────────────────────

/**
 * Check if a player has an active subscription at the required tier level.
 * Throws SUBSCRIPTION_REQUIRED if not.
 */
export async function checkSubscription(
  playerId: string,
  requiredTier: SubscriptionTier,
): Promise<{
  tier: SubscriptionTier
  expiresAt: Date | null
  isEligible: true
}> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
    },
  })

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  const currentTier = (player.subscriptionStatus as SubscriptionTier) ?? 'free'
  const requiredLevel = TIER_LEVELS[requiredTier]
  const currentLevel = TIER_LEVELS[currentTier] ?? 0

  if (currentLevel < requiredLevel) {
    throw new AppError(
      ErrorCode.SUBSCRIPTION_REQUIRED,
      `Abonnement ${TIER_NAMES[requiredTier]} requis. Votre plan actuel: ${TIER_NAMES[currentTier]}.`,
    )
  }

  // Check expiration
  if (player.subscriptionExpiresAt && new Date(player.subscriptionExpiresAt) < new Date()) {
    // Downgrade to free
    await db.player.update({
      where: { id: playerId },
      data: { subscriptionStatus: 'free' },
    })

    logger.warn('Subscription expired, downgraded to free', 'subscription-guard', { playerId })
    throw new AppError(
      ErrorCode.SUBSCRIPTION_REQUIRED,
      `Votre abonnement ${TIER_NAMES[currentTier]} a expiré. Renouvelez-le pour continuer.`,
    )
  }

  return {
    tier: currentTier,
    expiresAt: player.subscriptionExpiresAt,
    isEligible: true,
  }
}

// ── Route Wrapper ───────────────────────────────────────────────────────────────

type SubscriptionHandler<TCtx = void> = (
  req: NextRequest,
  auth: AuthContext,
  subscription: { tier: SubscriptionTier; expiresAt: Date | null },
  context: TCtx,
) => Promise<NextResponse>

/**
 * Wraps a route handler with subscription tier check.
 * Authenticates the player first, then checks subscription.
 *
 * @example
 * // Require Pro subscription
 * export const POST = requireSubscription('pro', async (req, auth, sub) => {
 *   return NextResponse.json({ tier: sub.tier })
 * })
 *
 * // Require Elite subscription with dynamic params
 * export const GET = requireSubscription<{ params: Promise<{ id: string }> }>(
 *   'elite',
 *   async (req, auth, sub, { params }) => {
 *     const { id } = await params
 *     // ...
 *   }
 * )
 */
export function requireSubscription<TCtx = void>(
  requiredTier: 'pro' | 'elite',
  handler: SubscriptionHandler<TCtx>,
): (req: NextRequest, context?: TCtx) => Promise<NextResponse> {
  return async (req, context) => {
    try {
      const auth = await requireAuth()
      const subscription = await checkSubscription(auth.playerId, requiredTier)
      return handler(req, auth, subscription, context as TCtx)
    } catch (error) {
      return toErrorResponse(error, 'subscription-guard')
    }
  }
}

/**
 * Get the current subscription tier for a player (no throw).
 */
export async function getPlayerTier(playerId: string): Promise<SubscriptionTier> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { subscriptionStatus: true, subscriptionExpiresAt: true },
  })

  if (!player) return 'free'

  // Check expiration
  if (player.subscriptionExpiresAt && new Date(player.subscriptionExpiresAt) < new Date()) {
    return 'free'
  }

  return (player.subscriptionStatus as SubscriptionTier) ?? 'free'
}
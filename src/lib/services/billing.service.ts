/**
 * Billing service — subscription management and Stripe integration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '@/lib/db'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { logger } from '@/lib/logger'
import type { SubscriptionTier } from '@/lib/types/api.types'

// ── Plan Configuration ──────────────────────────────────────────────────────────

export interface PlanConfig {
  id: SubscriptionTier
  name: string
  priceMonthEur: number
  priceYearEur: number
  features: string[]
}

export const PLANS: Record<string, PlanConfig> = {
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthEur: 9.99,
    priceYearEur: 79.99,
    features: [
      'Analyses de forme IA illimitées',
      'Plans d\'entraînement personnalisés',
      'Prédictions de performance',
      'Export vidéo HD',
      'Support prioritaire',
    ],
  },
  elite: {
    id: 'elite',
    name: 'Élite',
    priceMonthEur: 19.99,
    priceYearEur: 159.99,
    features: [
      'Tout ce qui est dans Pro',
      'Coach IA vocal en temps réel',
      'Analyse vidéo avancée avec IA',
      'Comparaisons vidéo multi-joueurs',
      'Accès anticipé aux nouvelles fonctionnalités',
      'Badge Élite exclusif',
    ],
  },
}

// ── Subscription Management ─────────────────────────────────────────────────────

/**
 * Get the current subscription status for a player.
 */
export async function getSubscriptionStatus(playerId: string) {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      stripeCustomerId: true,
      subscriptionId: true,
    },
  })

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  // Check if expired
  let isActive = true
  if (player.subscriptionExpiresAt && new Date(player.subscriptionExpiresAt) < new Date()) {
    isActive = false
    // Auto-downgrade in background
    if (player.subscriptionStatus !== 'free') {
      await db.player.update({
        where: { id: playerId },
        data: { subscriptionStatus: 'free' },
      }).catch(() => { /* non-critical */ })
    }
  }

  return {
    tier: player.subscriptionStatus as SubscriptionTier,
    expiresAt: player.subscriptionExpiresAt,
    stripeCustomerId: player.stripeCustomerId,
    isActive,
    plan: PLANS[player.subscriptionStatus] ?? null,
  }
}

/**
 * Create a Stripe checkout session for subscription purchase.
 */
export async function createCheckoutSession(
  playerId: string,
  planId: 'pro' | 'elite',
  isAnnual = false,
) {
  const plan = PLANS[planId]
  if (!plan) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Plan invalide')
  }

  // In production, this would create a Stripe checkout session
  // For now, simulate the flow
  logger.info('Checkout session created', 'billing.service', {
    playerId,
    planId,
    isAnnual,
  })

  return {
    url: '/stripe/mock-checkout', // Would be Stripe checkout URL in production
    planId,
    price: isAnnual ? plan.priceYearEur : plan.priceMonthEur,
    isAnnual,
  }
}

/**
 * Activate a subscription (called by Stripe webhook).
 */
export async function activateSubscription(params: {
  playerId: string
  tier: SubscriptionTier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  expiresAt: Date
}): Promise<void> {
  await db.player.update({
    where: { id: params.playerId },
    data: {
      subscriptionStatus: params.tier,
      subscriptionExpiresAt: params.expiresAt,
      ...(params.stripeCustomerId && { stripeCustomerId: params.stripeCustomerId }),
      ...(params.stripeSubscriptionId && { subscriptionId: params.stripeSubscriptionId }),
    },
  })

  logger.info('Subscription activated', 'billing.service', {
    playerId: params.playerId,
    tier: params.tier,
    expiresAt: params.expiresAt,
  })
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(playerId: string): Promise<void> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { subscriptionStatus: true },
  })

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  if (player.subscriptionStatus === 'free') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Aucun abonnement actif à annuler')
  }

  // In production, cancel with Stripe
  // For now, just downgrade to free
  await db.player.update({
    where: { id: playerId },
    data: { subscriptionStatus: 'free' },
  })

  logger.info('Subscription cancelled', 'billing.service', { playerId })
}

/**
 * Handle Stripe webhook events.
 */
export async function handleWebhook(eventType: string, payload: unknown): Promise<void> {
  logger.info('Stripe webhook received', 'billing.service', { eventType })

  switch (eventType) {
    case 'checkout.session.completed': {
      const data = payload as any
      const playerId = data?.metadata?.playerId
      const customerId = data?.customer
      const subscriptionId = data?.subscription

      if (playerId && customerId) {
        // In production, fetch subscription details from Stripe
        await activateSubscription({
          playerId,
          tier: 'pro', // Would be determined from Stripe price
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const data = payload as any
      const playerId = data?.metadata?.playerId
      if (playerId) {
        await db.player.update({
          where: { id: playerId },
          data: { subscriptionStatus: 'free' },
        })
      }
      break
    }

    default:
      logger.warn('Unhandled webhook event', 'billing.service', { eventType })
  }
}
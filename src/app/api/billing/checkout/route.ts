import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent, trackError } from '@/lib/monitoring'

const VALID_PLANS = ['pro', 'elite'] as const

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Rate limit: 5 attempts per 15 minutes
    const rl = rateLimit(`billing:checkout:${session.user.id}`, 5, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 },
      )
    }

    // Parse and validate body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('planId' in body) ||
      typeof (body as Record<string, unknown>).planId !== 'string' ||
      !(VALID_PLANS as readonly string[]).includes((body as Record<string, unknown>).planId as string)
    ) {
      return NextResponse.json(
        { error: 'planId invalide. Valeurs acceptées: pro, elite' },
        { status: 400 },
      )
    }

    const planId = (body as { planId: string }).planId

    // Log the checkout attempt
    trackEvent('billing:checkout_initiated', {
      userId: session.user.id,
      planId,
    })

    // ── Mock Stripe integration ──────────────────────────────────────────────
    // In production, this would:
    //   1. Create a Stripe Checkout Session via stripe.checkout.sessions.create()
    //   2. Pass the plan's Stripe price ID (e.g., price_xxx for pro, price_yyy for elite)
    //   3. Return the session.url for client-side redirect
    // ──────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      url: `/api/billing/success?plan=${planId}`,
    })
  } catch (err) {
    trackError('billing:checkout', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
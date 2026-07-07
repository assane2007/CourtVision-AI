import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent, trackError } from '@/lib/monitoring'
import { db } from '@/lib/db'

const VALID_PLANS = ['pro', 'elite'] as const

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`billing:success:${session.user.id}`, 5, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const plan = req.nextUrl.searchParams.get('plan')

    if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) {
      return NextResponse.json(
        { error: 'Plan invalide' },
        { status: 400 },
      )
    }

    // ── TODO: This is a mock for development only ──────────────────────────
    // In production, this endpoint MUST:
    //   1. Verify the Stripe Checkout Session via stripe.checkout.sessions.retrieve(sessionId)
    //   2. Confirm payment_status === 'paid'
    //   3. Update the user's subscription in the database
    //   4. Set subscription plan, stripe_customer_id, current_period_end, etc.
    //
    // NEVER grant premium in production without cryptographic payment verification.
    // ────────────────────────────────────────────────────────────────────────

    // Prevent premium granting in production
    if (process.env.NODE_ENV === 'production') {
      trackError('GET /api/billing/success', new Error('Billing mock called in production'))
      return NextResponse.json(
        { error: 'Le paiement est en cours de vérification.' },
        { status: 503 },
      )
    }

    // Check if user already has an active subscription to prevent duplicate grants
    // (When a real subscription model is added, check current_period_end > now)
    const existingPlayer = await db.player.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })
    if (!existingPlayer) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    // Log the success event
    trackEvent('billing:checkout_success', {
      userId: session.user.id,
      plan,
    })

    return NextResponse.json({
      success: true,
      plan,
    })
  } catch (err) {
    trackError('GET /api/billing/success', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { trackEvent, trackError } from '@/lib/monitoring'

const VALID_PLANS = ['pro', 'elite'] as const

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const plan = req.nextUrl.searchParams.get('plan')

    if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) {
      return NextResponse.json(
        { error: 'Plan invalide' },
        { status: 400 },
      )
    }

    // Log the success event
    trackEvent('billing:checkout_success', {
      userId: session.user.id,
      plan,
    })

    // ── Mock Stripe verification ──────────────────────────────────────────────
    // In production, this would:
    //   1. Verify the Stripe Checkout Session via stripe.checkout.sessions.retrieve(sessionId)
    //   2. Confirm payment_status === 'paid'
    //   3. Update the user's subscription in the database
    //   4. Set subscription plan, stripe_customer_id, current_period_end, etc.
    // ──────────────────────────────────────────────────────────────────────────

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
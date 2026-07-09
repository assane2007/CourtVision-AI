import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import Stripe from 'stripe'
import { withAuth } from '@/lib/with-auth'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
  : null

export const POST = withAuth(async (request: Request, session) => {
  try {
    // Auth check

    // Rate limit
    const rl = rateLimit(session.user.id, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    // If Stripe is not configured, return a demo URL
    if (!stripe) {
      return NextResponse.json({
        url: `${process.env.NEXTAUTH_URL || ''}/?demo_portal=1`,
      })
    }

    // Fetch player
    const player = await db.player.findUnique({ where: { id: session.user.id } })
    if (!player || !player.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Aucun abonnement trouvé' },
        { status: 404 },
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: player.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL || ''}/?portal_return=1`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    trackError('POST /api/stripe/portal', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

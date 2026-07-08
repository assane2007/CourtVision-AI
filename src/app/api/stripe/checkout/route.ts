import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
  : null

const PRICE_MAP: Record<string, string> = {
  pro_monthly: 'price_pro_monthly',
  pro_annual: 'price_pro_annual',
  elite_monthly: 'price_elite_monthly',
  elite_annual: 'price_elite_annual',
}

export async function POST(req: Request) {
  // Auth check
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Rate limit
  const rl = rateLimit(session.user.id, 5, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  // Validate body
  let body: { priceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = z.object({ priceId: z.string().max(100) }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'priceId requis (max 100)' }, { status: 400 })
  }
  const priceId = parsed.data.priceId

  if (!PRICE_MAP[priceId]) {
    return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
  }

  // If Stripe is not configured, return a demo URL
  if (!stripe) {
    return NextResponse.json({
      url: `${process.env.NEXTAUTH_URL || ''}/?demo_checkout=1&plan=${priceId}`,
    })
  }

  // Fetch player from DB
  const player = await db.player.findUnique({ where: { id: session.user.id } })
  if (!player) {
    return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
  }

  // Create or retrieve Stripe customer
  let customerId = player.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: player.email,
      name: player.name,
      metadata: { playerId: player.id },
    })
    customerId = customer.id
    await db.player.update({
      where: { id: player.id },
      data: { stripeCustomerId: customerId },
    })
  }

  // Determine the tier from priceId
  const tier = priceId.includes('pro') ? 'pro' : 'elite'

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICE_MAP[priceId],
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL || ''}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL || ''}/?checkout=cancelled`,
    metadata: {
      playerId: player.id,
      tier,
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
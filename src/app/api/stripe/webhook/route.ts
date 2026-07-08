import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  // If Stripe is not configured, acknowledge but do nothing
  if (!stripe) {
    return NextResponse.json({ received: true, message: 'Stripe not configured' })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event

  try {
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const playerId = session.metadata?.playerId
        const tier = session.metadata?.tier || 'pro'

        if (playerId) {
          await db.player.update({
            where: { id: playerId },
            data: {
              subscriptionStatus: tier, // 'pro' or 'elite'
              subscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        if (subscription.status === 'active') {
          // Find player by stripeCustomerId
          const player = await db.player.findFirst({ where: { stripeCustomerId: customerId } })
          if (player) {
            // Determine tier from the price
            const priceId = subscription.items.data[0]?.price?.id || ''
            let tier = 'pro'
            if (priceId.includes('elite')) tier = 'elite'

            await db.player.update({
              where: { id: player.id },
              data: {
                subscriptionStatus: tier,
                subscriptionId: subscription.id,
              },
            })
          }
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          const player = await db.player.findFirst({ where: { stripeCustomerId: customerId } })
          if (player) {
            await db.player.update({
              where: { id: player.id },
              data: {
                subscriptionStatus: 'free',
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const player = await db.player.findFirst({ where: { stripeCustomerId: customerId } })
        if (player) {
          await db.player.update({
            where: { id: player.id },
            data: {
              subscriptionStatus: 'free',
              subscriptionId: null,
            },
          })
        }
        break
      }
    }
  } catch (err) {
    trackError('Stripe webhook error', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
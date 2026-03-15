import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import pRetry from 'p-retry'
import { env, requireStripeConfig } from '../config/env'

// Initialisation lazy de Stripe — uses validated env vars
let _stripe: Stripe | null = null
function getStripe(): Stripe {
    if (!_stripe) {
        requireStripeConfig() // Fail-fast if Stripe vars missing in prod (C-2)
        const key = env.STRIPE_SECRET_KEY
        if (!key) {
            throw new Error('STRIPE_SECRET_KEY is not configured')
        }
        _stripe = new Stripe(key, { apiVersion: '2023-10-16' as any })
    }
    return _stripe
}

const checkoutSchema = z.object({
    planName: z.enum(['player', 'coach', 'academy'])
})

export default async function billingRoutes(fastify: FastifyInstance) {
    // ── Raw body parser for Stripe webhook signature verification ──
    // Scoped to this plugin only — doesn't affect other routes.
    // Stores the raw Buffer on request.rawBody while still parsing JSON normally.
    fastify.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer' },
        (req: any, body: Buffer, done: (err: Error | null, result?: any) => void) => {
            req.rawBody = body
            try {
                done(null, JSON.parse(body.toString()))
            } catch (err: any) {
                done(err)
            }
        }
    )

    fastify.post('/create-checkout', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const body = checkoutSchema.parse(request.body)
            const user = request.user!

            // On récupère ou créé l'ID client Stripe dans la base (si manquant)
            const { data: dbUser, error: fetchError } = await fastify.supabase
                .from('users')
                .select('stripe_customer_id, email, full_name')
                .eq('id', user.id)
                .single()

            if (fetchError) throw fetchError

            let customerId = dbUser.stripe_customer_id

            if (!customerId) {
                // Crée le customer Stripe
                const customer = await pRetry(() => getStripe().customers.create({
                    email: dbUser.email,
                    name: dbUser.full_name,
                    metadata: { supabase_id: user.id }
                }), { retries: 3, minTimeout: 500 })
                customerId = customer.id

                // Update user avec son nouveau customer_id
                await fastify.supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
            }

            // Mapping du plan aux prix Stripe — validated env vars (C-2)
            const prices: Record<string, string> = {
                player: env.STRIPE_PRICE_PLAYER,
                coach: env.STRIPE_PRICE_COACH,
                academy: env.STRIPE_PRICE_ACADEMY,
            }
            const priceId = prices[body.planName]

            if (!priceId) {
                throw new Error(`Price ID missing for plan ${body.planName}. Check your environment variables.`)
            }

            // Idempotency key prevents duplicate checkout sessions (H-3)
            const idempotencyKey = `checkout_${user.id}_${body.planName}_${Date.now()}`

            // Création de la Checkout Session avec p-retry (Circuit Breaker)
            const session = await pRetry(() => getStripe().checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                success_url: 'https://courtvision.ai/dashboard?checkout=success',
                cancel_url: 'https://courtvision.ai/dashboard?checkout=cancel',
                metadata: { userId: user.id, planName: body.planName }
            }, { idempotencyKey }), { retries: 3, minTimeout: 1000 })

            return { url: session.url }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            request.log.error(error, 'Checkout creation failed')
            return reply.code(400).send({ error: 'Checkout creation failed' })
        }
    })

    // Permet à Stripe d'appeler notre API (pas d'auth ici car appelé par Stripe)
    // Utilise fastify.post avec le content type raw pour la signature webhook
    fastify.post('/webhook', { config: { rawBody: true } }, async (request, reply) => {
        try {
            // Raw body is stored by our custom content type parser above
            const rawRequest = request as any
            const payload = rawRequest.rawBody as Buffer
            if (!payload) {
                return reply.code(400).send({ error: 'Missing raw body for webhook signature verification' })
            }
            const sig = request.headers['stripe-signature'] as string
            if (!sig) {
                return reply.code(400).send({ error: 'Missing stripe-signature header' })
            }

            const endpointSecret = env.STRIPE_WEBHOOK_SECRET
            if (!endpointSecret) {
                request.log.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook')
                return reply.code(500).send({ error: 'Webhook not configured' })
            }

            let event: Stripe.Event

            try {
                event = getStripe().webhooks.constructEvent(payload, sig, endpointSecret)
            } catch (err: any) {
                request.log.warn({ err }, 'Webhook signature verification failed')
                return reply.code(400).send(`Webhook Error: ${err.message}`)
            }

            // Gérer les évènements de subscription
            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object as Stripe.Checkout.Session
                    if (session.mode === 'subscription') {
                        const userId = session.metadata?.userId
                        const planName = session.metadata?.planName
                        const subId = session.subscription as string

                        if (userId && planName) {
                            // Créer l'abonnement dans Supabase
                            await fastify.supabase.from('subscriptions').insert({
                                id: crypto.randomUUID(),
                                user_id: userId,
                                stripe_subscription_id: subId,
                                plan: planName,
                                status: 'active'
                            })

                            // Mettre à jour le plan de l'utilisateur
                            await fastify.supabase.from('users').update({ plan: planName }).eq('id', userId)
                        }
                    }
                    break

                case 'customer.subscription.deleted':
                case 'customer.subscription.updated':
                    const subscription = event.data.object as any
                    // Mettre à jour le status dans Supabase
                    const status = subscription.status
                    await fastify.supabase.from('subscriptions')
                        .update({ status: status, current_period_end: new Date(subscription.current_period_end * 1000).toISOString() })
                        .eq('stripe_subscription_id', subscription.id)

                    // Si supprimé, revenir au plan gratuit
                    if (status === 'canceled' || status === 'unpaid') {
                        const { data: sub } = await fastify.supabase.from('subscriptions').select('user_id').eq('stripe_subscription_id', subscription.id).single()
                        if (sub) {
                            await fastify.supabase.from('users').update({ plan: 'free' }).eq('id', sub.user_id)
                        }
                    }
                    break

                // ── H-2: Handle payment failures & subscription pauses ──
                case 'invoice.payment_failed': {
                    const invoice = event.data.object as any
                    const subId = invoice.subscription as string
                    if (subId) {
                        await fastify.supabase.from('subscriptions')
                            .update({ status: 'past_due' })
                            .eq('stripe_subscription_id', subId)
                        request.log.warn({ subId }, 'Invoice payment failed — marked past_due')
                    }
                    break
                }

                case 'customer.subscription.paused': {
                    const pausedSub = event.data.object as any
                    await fastify.supabase.from('subscriptions')
                        .update({ status: 'paused' })
                        .eq('stripe_subscription_id', pausedSub.id)
                    const { data: pausedUser } = await fastify.supabase.from('subscriptions')
                        .select('user_id').eq('stripe_subscription_id', pausedSub.id).single()
                    if (pausedUser) {
                        await fastify.supabase.from('users').update({ plan: 'free' }).eq('id', pausedUser.user_id)
                    }
                    request.log.info({ subId: pausedSub.id }, 'Subscription paused — reverted to free')
                    break
                }

                default:
                    request.log.info({ eventType: event.type }, 'Unhandled Stripe event type')
            }

            return { received: true }
        } catch (error: any) {
            request.log.error(error, 'Billing webhook handler failed')
            // H-4: Never leak internal error details to Stripe
            return reply.code(400).send({ error: 'Webhook processing failed' })
        }
    })

    fastify.get('/portal', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const user = request.user!
            const { data: dbUser, error: fetchError } = await fastify.supabase
                .from('users').select('stripe_customer_id').eq('id', user.id).single()

            if (fetchError || !dbUser.stripe_customer_id) {
                throw new Error('No stripe customer ID found for this user.')
            }

            const session = await getStripe().billingPortal.sessions.create({
                customer: dbUser.stripe_customer_id,
                return_url: 'https://courtvision.ai/dashboard/profile'
            })

            return { url: session.url }
        } catch (error: any) {
            request.log.error(error, 'Portal session creation failed')
            return reply.code(400).send({ error: 'Could not create billing portal session' })
        }
    })

    // ── REVENUECAT WEBHOOKS ──
    // RevenueCat enverra des requêtes POST ici lorsqu'un utilisateur achète sur iOS/Android
    fastify.post('/webhook/revenuecat', async (request, reply) => {
        try {
            const body = request.body as any
            const event = body.event

            // Sécurité globale (basic auth optionnelle, selon la configuration RevenueCat)
            const authHeader = request.headers['authorization']
            const expectedAuth = `Bearer ${env.REVENUECAT_WEBHOOK_SECRET || ''}`

            if (env.REVENUECAT_WEBHOOK_SECRET && authHeader !== expectedAuth) {
                return reply.code(401).send({ error: 'Unauthorized Webhook' })
            }

            if (!event || !event.type) {
                return reply.code(400).send({ error: 'Mailformed Event' })
            }

            const userId = event.app_user_id // On as configuré RevenueCat avec l'UUID Supabase
            const rcEntitlement = event.entitlement_ids ? event.entitlement_ids[0] : null
            let targetPlan = 'free'

            if (rcEntitlement === 'Premium') {
                targetPlan = 'player' // default mapped pro plan
            }

            switch (event.type) {
                case 'INITIAL_PURCHASE':
                case 'RENEWAL':
                    // On valide l'utilisateur comme premium sur Supabase
                    await fastify.supabase.from('users').update({ plan: targetPlan }).eq('id', userId)

                    // Store event inside subscriptions for trace logic unification
                    await fastify.supabase.from('subscriptions').upsert({
                        user_id: userId,
                        plan: targetPlan,
                        status: 'active',
                        revenuecat_rc_id: event.original_app_user_id, // unique trace identifier
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' }) // Assuming user has max 1 active subscription

                    request.log.info({ userId, event: event.type }, 'RevenueCat handled: Upgraded to PRO')
                    break;
                case 'CANCELLATION':
                case 'EXPIRATION':
                    // Downgrade grace à free plan
                    await fastify.supabase.from('users').update({ plan: 'free' }).eq('id', userId)

                    await fastify.supabase.from('subscriptions').update({
                        status: 'canceled',
                        updated_at: new Date().toISOString()
                    }).eq('user_id', userId)

                    request.log.info({ userId }, 'RevenueCat handled: Downgraded to FREE')
                    break;
                default:
                    request.log.info({ type: event.type }, 'RevenueCat Unhandled Event Type')
            }

            return reply.send({ received: true })
        } catch (error: any) {
            request.log.error(error, 'RevenueCat webhook processing failed')
            return reply.code(500).send({ error: 'Internal Server Error' })
        }
    })

    fastify.get('/plans', async (request, reply) => {
        // Liste publique des plans
        return {
            data: [
                { name: 'player', price_eur: 9 },
                { name: 'coach', price_eur: 29 },
                { name: 'academy', price_eur: 99 }
            ]
        }
    })
}

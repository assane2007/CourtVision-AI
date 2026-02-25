import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'

// Initialisation lazy de Stripe (évite crash si clé non configurée en dev)
let _stripe: Stripe | null = null
function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY
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
                const customer = await getStripe().customers.create({
                    email: dbUser.email,
                    name: dbUser.full_name,
                    metadata: { supabase_id: user.id }
                })
                customerId = customer.id

                // Update user avec son nouveau customer_id
                await fastify.supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
            }

            // Mapping du plan aux prix Stripe (via variables d'environnement)
            const prices: Record<string, string> = {
                player: process.env.STRIPE_PRICE_PLAYER || '',
                coach: process.env.STRIPE_PRICE_COACH || '',
                academy: process.env.STRIPE_PRICE_ACADEMY || ''
            }
            const priceId = prices[body.planName]

            if (!priceId) {
                throw new Error(`Price ID missing for plan ${body.planName}. Check your environment variables.`)
            }

            // Création de la Checkout Session
            const session = await getStripe().checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                success_url: 'https://courtvision.ai/dashboard?checkout=success',
                cancel_url: 'https://courtvision.ai/dashboard?checkout=cancel',
                metadata: { userId: user.id, planName: body.planName }
            })

            return { url: session.url }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // Permet à Stripe d'appeler notre API (pas d'auth ici car appelé par Stripe)
    // Utilise fastify.post avec le content type raw pour la signature webhook
    fastify.post('/webhook', { config: { rawBody: true } }, async (request, reply) => {
        try {
            // Note: Fastify requires raw body plugin or special config to get raw string for stripe signature.
            // This is simulated using the raw request body. In strict production, body parser needs raw text configuration for this route.
            const payload = (request.raw as any).body || JSON.stringify(request.body)
            const sig = request.headers['stripe-signature'] as string

            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

            let event: Stripe.Event

            try {
                event = getStripe().webhooks.constructEvent(payload, sig, endpointSecret)
            } catch (err: any) {
                fastify.log.warn(`Webhook Error: ${err.message}`)
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

                default:
                    fastify.log.info(`Unhandled event type ${event.type}`)
            }

            return { received: true }
        } catch (error: any) {
            fastify.log.error(error)
            return reply.code(400).send({ error: error.message })
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
            return reply.code(400).send({ error: error.message })
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

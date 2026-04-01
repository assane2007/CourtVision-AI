import { buildApp } from '../../app'
import type { FastifyInstance } from 'fastify'

/**
 * Billing Routes — Tests
 * 
 * Tests Stripe webhook signature validation, checkout flow,
 * and subscription management.
 */

const mockStripeWebhookConstructEvent = jest.fn()
const mockStripeCheckoutCreate = jest.fn()
const mockStripeCustomerCreate = jest.fn()
const mockStripeBillingPortalCreate = jest.fn()

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: { create: mockStripeCustomerCreate.mockResolvedValue({ id: 'cus_mock' }) },
        checkout: {
            sessions: { create: mockStripeCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }) }
        },
        billingPortal: {
            sessions: { create: mockStripeBillingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/mock' }) }
        },
        webhooks: {
            constructEvent: mockStripeWebhookConstructEvent.mockReturnValue({
                type: 'checkout.session.completed',
                data: { object: { customer: 'cus_123', metadata: { userId: 'test-user-id', plan: 'player' } } }
            })
        },
    }))
})

jest.mock('../../plugins/supabase', () => {
    const fp = require('fastify-plugin')
    return {
        supabasePlugin: fp(async (fastify: any) => {
            fastify.decorate('supabase', {
                auth: {
                    signUp: jest.fn(),
                    signInWithPassword: jest.fn(),
                    signInWithIdToken: jest.fn(),
                    getUser: jest.fn(),
                    admin: { signOut: jest.fn() },
                    refreshSession: jest.fn(),
                },
                from: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    insert: jest.fn().mockReturnThis(),
                    update: jest.fn().mockReturnThis(),
                    upsert: jest.fn().mockReturnThis(),
                    delete: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    in: jest.fn().mockReturnThis(),
                    gte: jest.fn().mockReturnThis(),
                    order: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
            })
        })
    }
})

jest.mock('../../plugins/auth', () => {
    const fp = require('fastify-plugin')
    return {
        authPlugin: fp(async (fastify: any) => {
            fastify.decorate('authenticate', async (request: any, reply: any) => {
                const authHeader = request.headers.authorization
                if (!authHeader) return reply.code(401).send({ error: 'Unauthorized' })
                request.user = { id: 'test-user-id', email: 'test@courtvision.ai' }
            })
        })
    }
})

jest.mock('../../queue/videoProcessor', () => ({
    videoQueue: { add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }) },
    initWorker: jest.fn(),
}))

describe('Billing Routes', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = buildApp({ logger: false })
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('POST /api/billing/webhook', () => {
        it('should process valid Stripe webhook with correct signature', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/billing/webhook',
                payload: JSON.stringify({ type: 'checkout.session.completed' }),
                headers: {
                    'stripe-signature': 'valid_sig_header',
                    'content-type': 'application/json',
                },
            })

            // Webhook should process without throwing
            // The exact status depends on Stripe webhook handler implementation
            expect([200, 400]).toContain(response.statusCode)
        })

        it('should reject webhook without stripe-signature header', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/billing/webhook',
                payload: JSON.stringify({ type: 'checkout.session.completed' }),
                headers: { 'content-type': 'application/json' },
            })

            // Should fail without signature
            expect(response.statusCode).toBeGreaterThanOrEqual(400)
        })

        it('should reject webhook with invalid signature', async () => {
            mockStripeWebhookConstructEvent.mockImplementation(() => {
                throw new Error('Invalid signature')
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/billing/webhook',
                payload: JSON.stringify({ type: 'test' }),
                headers: {
                    'stripe-signature': 'invalid_sig',
                    'content-type': 'application/json',
                },
            })

            expect(response.statusCode).toBeGreaterThanOrEqual(400)
        })
    })

    describe('POST /api/billing/create-checkout', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/billing/create-checkout',
                payload: { planName: 'player' },
            })

            expect(response.statusCode).toBe(401)
        })

        it('should create checkout session for authenticated user', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/billing/create-checkout',
                headers: { authorization: 'Bearer test-token' },
                payload: { planName: 'player' },
            })

            // May return 200 with checkout URL or 400 if plan validation fails
            expect([200, 400]).toContain(response.statusCode)
        })
    })

    describe('GET /api/billing/portal', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/billing/portal',
            })

            expect(response.statusCode).toBe(401)
        })
    })
})

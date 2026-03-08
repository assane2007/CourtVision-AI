import { buildApp } from '../../app'
import { FastifyInstance } from 'fastify'
import crypto from 'crypto'

/**
 * Billing Webhook — Stripe Signature Security Tests
 *
 * CRITICAL: Without proper signature validation, anyone can send
 * a fake webhook to upgrade accounts for free.
 *
 * Pattern: AAA (Arrange → Act → Assert)
 */

const WEBHOOK_SECRET = 'whsec_test_secret_for_testing_only'

// Mock Stripe with controllable constructEvent
const mockConstructEvent = jest.fn()

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: { create: jest.fn().mockResolvedValue({ id: 'cus_mock' }) },
        checkout: {
            sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }) }
        },
        billingPortal: {
            sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/mock' }) }
        },
        webhooks: {
            constructEvent: mockConstructEvent
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

const checkoutPayload = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: { userId: 'user-test-123', plan: 'player' }
        }
    }
})

describe('POST /api/billing/webhook — Stripe Signature Security', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
        app = buildApp({ logger: false })
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // ── Valid signature ─────────────────────────────────────

    it('accepts a webhook with valid Stripe signature', async () => {
        // Arrange
        mockConstructEvent.mockReturnValueOnce({
            type: 'checkout.session.completed',
            data: {
                object: {
                    customer: 'cus_test_123',
                    metadata: { userId: 'user-test-123', plan: 'player' }
                }
            }
        })

        // Act
        const res = await app.inject({
            method: 'POST',
            url: '/api/billing/webhook',
            headers: {
                'stripe-signature': 'valid_sig_header',
                'content-type': 'application/json',
            },
            body: checkoutPayload,
        })

        // Assert — 200 or 204, webhook processed
        expect([200, 204]).toContain(res.statusCode)
        expect(mockConstructEvent).toHaveBeenCalled()
    })

    // ── Missing signature — CRITICAL ────────────────────────

    it('rejects webhook without stripe-signature header', async () => {
        // Act
        const res = await app.inject({
            method: 'POST',
            url: '/api/billing/webhook',
            headers: { 'content-type': 'application/json' },
            body: checkoutPayload,
        })

        // Assert
        expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    // ── Invalid signature ───────────────────────────────────

    it('rejects webhook with incorrect signature', async () => {
        // Arrange
        mockConstructEvent.mockImplementationOnce(() => {
            throw new Error('Invalid signature')
        })

        // Act
        const res = await app.inject({
            method: 'POST',
            url: '/api/billing/webhook',
            headers: {
                'stripe-signature': 't=1234567890,v1=invalidsignature',
                'content-type': 'application/json',
            },
            body: checkoutPayload,
        })

        // Assert
        expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it('rejects webhook signed with wrong secret', async () => {
        // Arrange
        mockConstructEvent.mockImplementationOnce(() => {
            throw new Error('No signatures found matching the expected signature for payload')
        })

        // Act
        const res = await app.inject({
            method: 'POST',
            url: '/api/billing/webhook',
            headers: {
                'stripe-signature': 't=9999999999,v1=wrongsecretresult',
                'content-type': 'application/json',
            },
            body: checkoutPayload,
        })

        // Assert
        expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    // ── Replay attack protection ────────────────────────────

    it('rejects webhook with timestamp too old (replay attack)', async () => {
        // Arrange
        mockConstructEvent.mockImplementationOnce(() => {
            throw new Error('Timestamp outside the tolerance zone')
        })

        const oldTimestamp = Math.floor(Date.now() / 1000) - 600 // 10 minutes ago
        const oldSignature = `t=${oldTimestamp},v1=stale_signature`

        // Act
        const res = await app.inject({
            method: 'POST',
            url: '/api/billing/webhook',
            headers: {
                'stripe-signature': oldSignature,
                'content-type': 'application/json',
            },
            body: checkoutPayload,
        })

        // Assert — Stripe rejects webhooks older than 5 minutes
        expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    // ── Unknown event type ──────────────────────────────────

    it('handles unknown event types gracefully', async () => {
        // Arrange
        mockConstructEvent.mockReturnValueOnce({
            type: 'unknown_event_type',
            data: { object: {} }
        })

        // Act
        const res = await app.inject({
            method: 'POST',
            url: '/api/billing/webhook',
            headers: {
                'stripe-signature': 'valid_sig',
                'content-type': 'application/json',
            },
            body: JSON.stringify({ type: 'unknown_event_type' }),
        })

        // Assert — should not crash, return 200 (acknowledged but unhandled)
        expect(res.statusCode).toBeLessThan(500)
    })
})

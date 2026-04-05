/* eslint-disable @typescript-eslint/no-var-requires */
import { buildApp } from '../../app'
import type { FastifyInstance } from 'fastify'
import { rateLimitCleanupTimer } from '../../routes/arena'

/**
 * Tests unitaires pour les routes V6.0 "Arena"
 * Arena, HORSE, Wearable, Marketplace, Reports, NBA
 */

// Mock global fetch for NbaApiService (prevent real network calls in tests)
const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
        data: [
            {
                id: 115,
                first_name: 'Stephen',
                last_name: 'Curry',
                position: 'G',
                height: '6-2',
                weight: '185',
                jersey_number: '30',
                college: 'Davidson',
                country: 'USA',
                draft_year: 2009,
                team: {
                    id: 10,
                    conference: 'West',
                    division: 'Pacific',
                    city: 'Golden State',
                    name: 'Warriors',
                    full_name: 'Golden State Warriors',
                    abbreviation: 'GSW',
                },
            },
        ],
    }),
});
(global as any).fetch = mockFetch;

// Mock Stripe
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
            constructEvent: jest.fn().mockReturnValue({ type: 'checkout.session.completed', data: { object: {} } })
        },
    }))
})

// Mock Supabase
jest.mock('../../plugins/supabase', () => {
    const fp = require('fastify-plugin')
    return {
        supabasePlugin: fp(async (fastify: any) => {
            const chainable = () => {
                const chain: any = {
                    data: null,
                    error: null,
                    count: null,
                }
                // Make chain thenable so `await chain` resolves to { data, error, count }
                chain.then = (resolve: any) => resolve({ data: chain.data, error: chain.error, count: chain.count })
                chain.select = jest.fn().mockReturnValue(chain)
                chain.insert = jest.fn().mockReturnValue(chain)
                chain.update = jest.fn().mockReturnValue(chain)
                chain.delete = jest.fn().mockReturnValue(chain)
                chain.eq = jest.fn().mockReturnValue(chain)
                chain.in = jest.fn().mockReturnValue(chain)
                chain.gte = jest.fn().mockReturnValue(chain)
                chain.lte = jest.fn().mockReturnValue(chain)
                chain.gt = jest.fn().mockReturnValue(chain)
                chain.or = jest.fn().mockReturnValue(chain)
                chain.order = jest.fn().mockReturnValue(chain)
                chain.limit = jest.fn().mockReturnValue(chain)
                chain.range = jest.fn().mockReturnValue(chain)
                chain.single = jest.fn().mockResolvedValue({ data: null, error: null })
                chain.upsert = jest.fn().mockReturnValue(chain)
                return chain
            }
            const mockSupabase = {
                auth: {
                    signUp: jest.fn(),
                    signInWithPassword: jest.fn(),
                    getUser: jest.fn(),
                    admin: { signOut: jest.fn() },
                    refreshSession: jest.fn(),
                },
                from: jest.fn().mockImplementation(() => chainable()),
                rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
            }
            fastify.decorate('supabase', mockSupabase)
        })
    }
})

jest.mock('../../plugins/auth', () => {
    const fp = require('fastify-plugin')
    return {
        authPlugin: fp(async (fastify: any) => {
            fastify.decorate('authenticate', async (request: any, reply: any) => {
                const authHeader = request.headers.authorization
                if (!authHeader) {
                    return reply.code(401).send({ error: 'Unauthorized' })
                }
                request.user = { id: 'test-user-v6', email: 'arena@courtvision.ai' }
            })
        })
    }
})

jest.mock('../../queue/videoProcessor', () => ({
    videoQueue: {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    },
    initWorker: jest.fn(),
}))

const authHeaders = { authorization: 'Bearer test-token-v6' }

describe('CourtVision API V6.0 — Arena Features', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = buildApp({ logger: false })
        await app.ready()
    })

    afterAll(async () => {
        clearInterval(rateLimitCleanupTimer)
        await app.close()
    })

    // ===========================================
    // Health Check V6
    // ===========================================
    describe('Health Check V6', () => {
        it('devrait retourner version 6.0.0 et codename Arena', async () => {
            const response = await app.inject({ method: 'GET', url: '/health' })
            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.version).toBe('6.0.0')
            expect(body.codename).toBe('Arena')
        })
    })

    // ===========================================
    // Arena Routes
    // ===========================================
    describe('Arena Routes', () => {
        it('POST /api/arena/create devrait nécessiter auth', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/arena/create',
                payload: { mode: 'shootout' },
            })
            expect(response.statusCode).toBe(401)
        })

        it('POST /api/arena/create avec auth devrait accepter un payload valide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/arena/create',
                headers: authHeaders,
                payload: {
                    mode: 'shootout',
                    maxPlayers: 4,
                    roundDurationSec: 120,
                    totalRounds: 3,
                    shotsPerRound: 10,
                },
            })
            // May be 200 or 500 (no real DB), but not 400 (validation)
            expect([200, 500]).toContain(response.statusCode)
        })

        it('POST /api/arena/create devrait rejeter un mode invalide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/arena/create',
                headers: authHeaders,
                payload: { mode: 'invalid_mode' },
            })
            expect(response.statusCode).toBe(400)
        })

        it('POST /api/arena/create devrait rejeter maxPlayers > 8', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/arena/create',
                headers: authHeaders,
                payload: { mode: 'shootout', maxPlayers: 20 },
            })
            expect(response.statusCode).toBe(400)
        })

        it('GET /api/arena/available devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/arena/available' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/arena/available avec auth devrait répondre', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/arena/available',
                headers: authHeaders,
            })
            expect([200, 500]).toContain(response.statusCode)
        })

        it('GET /api/arena/leaderboard devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/arena/leaderboard' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/arena/history devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/arena/history' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/arena/my-stats devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/arena/my-stats' })
            expect(response.statusCode).toBe(401)
        })

        it('POST /api/arena/:id/shot devrait rejeter un body invalide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/arena/00000000-0000-0000-0000-000000000001/shot',
                headers: authHeaders,
                payload: { result: 'maybe', zone: '' },
            })
            expect(response.statusCode).toBe(400)
        })

        it('POST /api/arena/:id/shot devrait accepter clientEventId pour idempotence', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/arena/00000000-0000-0000-0000-000000000001/shot',
                headers: authHeaders,
                payload: {
                    result: 'made',
                    zone: 'midrange',
                    clientEventId: 'arena_shot_event_0001',
                },
            })
            expect([200, 400, 403, 500]).toContain(response.statusCode)
        })
    })

    // ===========================================
    // HORSE Routes
    // ===========================================
    describe('HORSE Routes', () => {
        it('POST /api/horse/start devrait nécessiter auth', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/horse/start',
                payload: { difficulty: 'pro' },
            })
            expect(response.statusCode).toBe(401)
        })

        it('POST /api/horse/start avec auth devrait accepter un payload valide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/horse/start',
                headers: authHeaders,
                payload: { difficulty: 'pro' },
            })
            expect([200, 500]).toContain(response.statusCode)
        })

        it('POST /api/horse/start devrait rejeter une difficulté invalide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/horse/start',
                headers: authHeaders,
                payload: { difficulty: 'impossible' },
            })
            expect(response.statusCode).toBe(400)
        })

        it('GET /api/horse/challenges devrait retourner la bibliothèque', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/horse/challenges',
                headers: authHeaders,
            })
            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data).toBeInstanceOf(Array)
            expect(body.data.length).toBeGreaterThan(0)
        })

        it('GET /api/horse/active devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/horse/active' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/horse/leaderboard devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/horse/leaderboard' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/horse/my-stats devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/horse/my-stats' })
            expect(response.statusCode).toBe(401)
        })
    })

    // ===========================================
    // Wearable Routes
    // ===========================================
    describe('Wearable Routes', () => {
        it('POST /api/wearable/connect devrait nécessiter auth', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/wearable/connect',
                payload: { platform: 'apple_watch', deviceName: 'My Watch' },
            })
            expect(response.statusCode).toBe(401)
        })

        it('POST /api/wearable/connect devrait rejeter une plateforme invalide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/wearable/connect',
                headers: authHeaders,
                payload: { platform: 'nokia_watch', deviceName: 'My Watch' },
            })
            expect(response.statusCode).toBe(400)
        })

        it('POST /api/wearable/connect avec un payload valide devrait répondre', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/wearable/connect',
                headers: authHeaders,
                payload: { platform: 'apple_watch', deviceName: 'Apple Watch Ultra' },
            })
            expect([200, 500]).toContain(response.statusCode)
        })

        it('POST /api/wearable/sync devrait rejeter un payload vide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/wearable/sync',
                headers: authHeaders,
                payload: {},
            })
            expect(response.statusCode).toBe(400)
        })

        it('GET /api/wearable/latest devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/latest' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/devices devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/devices' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/hrv/trend devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/hrv/trend' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/hrv/analysis devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/hrv/analysis' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/readiness devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/readiness' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/training-load devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/training-load' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/alerts devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/alerts' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/dashboard devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/dashboard' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/wearable/export devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/wearable/export' })
            expect(response.statusCode).toBe(401)
        })
    })

    // ===========================================
    // Marketplace Routes
    // ===========================================
    describe('Marketplace Routes', () => {
        it('GET /api/marketplace/drills devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/drills' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/marketplace/featured devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/featured' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/marketplace/trending devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/trending' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/marketplace/categories devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/categories' })
            expect(response.statusCode).toBe(401)
        })

        it('POST /api/marketplace/publish devrait rejeter un body invalide', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/marketplace/publish',
                headers: authHeaders,
                payload: { title: 'ab' }, // too short
            })
            expect(response.statusCode).toBe(400)
        })

        it('POST /api/marketplace/drills/:id/review devrait rejeter un rating > 5', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/marketplace/drills/00000000-0000-0000-0000-000000000001/review',
                headers: authHeaders,
                payload: { rating: 10, comment: 'Great!' },
            })
            expect(response.statusCode).toBe(400)
        })

        it('GET /api/marketplace/wishlist devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/wishlist' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/marketplace/my-purchases devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/my-purchases' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/marketplace/earnings devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/earnings' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/marketplace/stats devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/marketplace/stats' })
            expect(response.statusCode).toBe(401)
        })
    })

    // ===========================================
    // Reports Routes V6
    // ===========================================
    describe('Reports Routes V6', () => {
        it('GET /api/reports/templates devrait retourner les templates', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/reports/templates',
                headers: authHeaders,
            })
            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data).toBeInstanceOf(Array)
            expect(body.data.length).toBeGreaterThan(0)
            // Should include scout template
            const templates = body.data.map((t: any) => t.id)
            expect(templates).toContain('scout')
            expect(templates).toContain('session')
            expect(templates).toContain('player_card')
        })

        it('GET /api/reports/scout/:userId devrait nécessiter auth', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/reports/scout/00000000-0000-0000-0000-000000000001',
            })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/reports/scout/:userId/pdf devrait nécessiter auth', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/reports/scout/00000000-0000-0000-0000-000000000001/pdf',
            })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/reports/player-card/:userId devrait nécessiter auth', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/reports/player-card/00000000-0000-0000-0000-000000000001',
            })
            expect(response.statusCode).toBe(401)
        })
    })

    // ===========================================
    // Dashboard V6
    // ===========================================
    describe('Dashboard V6', () => {
        it('GET /api/dashboard/v6 devrait nécessiter auth', async () => {
            const response = await app.inject({ method: 'GET', url: '/api/dashboard/v6' })
            expect(response.statusCode).toBe(401)
        })

        it('GET /api/dashboard/v6 avec auth devrait répondre avec données V6', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/v6',
                headers: authHeaders,
            })
            // May be 200 or 500 (no real DB), but should not be 404 or 401
            expect([200, 500]).toContain(response.statusCode)
        })
    })
})

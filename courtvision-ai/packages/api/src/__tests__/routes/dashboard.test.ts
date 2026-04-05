import { buildApp } from '../../app'
import type { FastifyInstance } from 'fastify'

/**
 * Dashboard Routes — Tests
 * 
 * Tests the V5 dashboard endpoint, apex score,
 * digest, and percentiles.
 */

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: { create: jest.fn().mockResolvedValue({ id: 'cus_mock' }) },
        checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }) } },
        billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/mock' }) } },
        webhooks: { constructEvent: jest.fn().mockReturnValue({ type: 'test', data: { object: {} } }) },
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

// Mock V5 Orchestrator
jest.mock('../../services/v5Orchestrator', () => ({
    initV5Orchestrator: jest.fn(),
    V5Orchestrator: {
        buildDashboard: jest.fn().mockResolvedValue({
            apexScore: {
                overall: 78,
                shooting: 82,
                mental: 71,
                consistency: 75,
                clutch: 68,
                improvement: 85,
                grade: 'A-',
                trend: 'rising'
            },
            streaks: {
                currentStreak: 5,
                longestStreak: 12,
                sessionThisWeek: 3,
                shotsThisWeek: 450,
            }
        }),
        computeApexScore: jest.fn().mockResolvedValue({
            overall: 78,
            shooting: 82,
            mental: 71,
            consistency: 75,
            clutch: 68,
            improvement: 85,
            grade: 'A-',
            trend: 'rising',
            weights: {
                shooting: 0.30,
                mental: 0.20,
                consistency: 0.20,
                clutch: 0.15,
                improvement: 0.15,
            }
        }),
        generateWeeklyDigest: jest.fn().mockResolvedValue({
            weekNumber: 12,
            sessionsCount: 3,
            improvement: '+4%',
        }),
        computePercentiles: jest.fn().mockResolvedValue({
            shooting: 85,
            mental: 72,
            overall: 78,
        }),
    }
}))

describe('Dashboard Routes', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = buildApp({ logger: false })
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    describe('GET /api/dashboard', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard',
            })
            expect(response.statusCode).toBe(401)
        })

        it('should return legacy v4 dashboard when authenticated', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data.highlights).toBeDefined()
            expect(body.version).toBe('v4')
        })
    })

    describe('GET /api/dashboard/apex', () => {
        it('should return apex score with weights', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/apex',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data).toBeDefined()

            // Verify Apex Score weights sum to 1.0
            const weights = body.data.weights
            if (weights) {
                const weightSum = Object.values(weights).reduce((sum: number, w: any) => sum + w, 0)
                expect(weightSum).toBeCloseTo(1.0, 2)
            }
        })
    })

    describe('GET /api/dashboard/digest', () => {
        it('should return weekly digest', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/digest',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data.dataQuality).toBeDefined()
            expect(['live', 'mixed', 'demo']).toContain(body.data.dataQuality.mode)
        })
    })

    describe('GET /api/dashboard/coach-brief', () => {
        it('should return actionable priorities for next game', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/coach-brief',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(typeof body.data.summary).toBe('string')
            expect(Array.isArray(body.data.priorities)).toBe(true)
            expect(body.data.priorities.length).toBeGreaterThan(0)
            expect(body.data.dataQuality).toBeDefined()
        })
    })

    describe('GET /api/dashboard/percentiles', () => {
        it('should return percentile rankings', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/percentiles',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
        })
    })

    describe('GET /api/dashboard/init', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/init',
            })
            expect(response.statusCode).toBe(401)
        })

        it('should return init payload for mobile', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/dashboard/init',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data).toBeDefined()
        })
    })
})

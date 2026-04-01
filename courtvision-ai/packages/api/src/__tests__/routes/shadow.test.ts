import { buildApp } from '../../app'
import type { FastifyInstance } from 'fastify'

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

jest.mock('../../queue/shadowLeague.worker', () => ({
    shadowQueue: {
        add: jest.fn().mockResolvedValue({ id: 'job_mock' })
    }
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
        })
    }
}))

describe('Shadow League Routes', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = buildApp({ logger: false })
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    describe('GET /api/shadow/dashboard', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/shadow/dashboard',
            })
            expect(response.statusCode).toBe(401)
        })

        it('should return full v5 dashboard when authenticated on shadow route', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/shadow/dashboard',
                headers: { authorization: 'Bearer test-token' },
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.data.apexScore).toBeDefined()
            expect(body.data.apexScore.overall).toBe(78)
            expect(body.version).toBe('v5-apex')
            expect(body.isShadow).toBe(true)
        })
    })

    describe('POST /api/shadow/simulate', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/shadow/simulate',
            })
            expect(response.statusCode).toBe(401)
        })
    })
})

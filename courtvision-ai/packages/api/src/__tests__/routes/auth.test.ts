import { buildApp } from '../../app'
import { FastifyInstance } from 'fastify'

/**
 * Auth Routes — Comprehensive Tests
 * 
 * Tests login, signup, token refresh, OAuth endpoints,
 * and protected route guards.
 */

// Mock Stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: { create: jest.fn().mockResolvedValue({ id: 'cus_mock' }) },
        checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }) } },
        billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/mock' }) } },
        webhooks: { constructEvent: jest.fn().mockReturnValue({ type: 'checkout.session.completed', data: { object: {} } }) },
    }))
})

// Mock Supabase
const mockSignUp = jest.fn()
const mockSignIn = jest.fn()
const mockSignInWithIdToken = jest.fn()
const mockRefreshSession = jest.fn()
const mockAdminSignOut = jest.fn()
const mockFrom = jest.fn()

jest.mock('../../plugins/supabase', () => {
    const fp = require('fastify-plugin')
    return {
        supabasePlugin: fp(async (fastify: any) => {
            fastify.decorate('supabase', {
                auth: {
                    signUp: mockSignUp,
                    signInWithPassword: mockSignIn,
                    signInWithIdToken: mockSignInWithIdToken,
                    getUser: jest.fn(),
                    admin: { signOut: mockAdminSignOut },
                    refreshSession: mockRefreshSession,
                },
                from: mockFrom.mockReturnValue({
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
                if (!authHeader) {
                    return reply.code(401).send({ error: 'Unauthorized' })
                }
                request.user = { id: 'test-user-id', email: 'test@courtvision.ai' }
            })
        })
    }
})

jest.mock('../../queue/videoProcessor', () => ({
    videoQueue: { add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }) },
    initWorker: jest.fn(),
}))

describe('Auth Routes', () => {
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

    // ── Signup ──
    describe('POST /api/auth/signup', () => {
        it('should create a user with valid credentials', async () => {
            mockSignUp.mockResolvedValue({
                data: {
                    user: { id: 'new-user-id', email: 'new@test.com' },
                    session: {
                        access_token: 'access_123',
                        refresh_token: 'refresh_123',
                        expires_in: 3600
                    }
                },
                error: null
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: {
                    email: 'new@test.com',
                    password: 'securepass123',
                    username: 'newplayer',
                    full_name: 'New Player'
                }
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.tokens.accessToken).toBe('access_123')
        })

        it('should reject email without @ sign', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: { email: 'notanemail', password: '123456', username: 'testuser' }
            })
            expect(response.statusCode).toBe(400)
        })

        it('should reject password shorter than 6 chars', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: { email: 'test@test.com', password: '12345', username: 'testuser' }
            })
            expect(response.statusCode).toBe(400)
        })

        it('should reject username shorter than 3 chars', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: { email: 'test@test.com', password: '123456', username: 'ab' }
            })
            expect(response.statusCode).toBe(400)
        })

        it('should reject empty body', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: {}
            })
            expect(response.statusCode).toBe(400)
        })
    })

    // ── Login ──
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            mockSignIn.mockResolvedValue({
                data: {
                    user: { id: 'user-id', email: 'test@test.com' },
                    session: {
                        access_token: 'access_456',
                        refresh_token: 'refresh_456',
                        expires_in: 3600
                    }
                },
                error: null
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email: 'test@test.com', password: 'password123' }
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.tokens.accessToken).toBe('access_456')
        })

        it('should reject empty body', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {}
            })
            expect(response.statusCode).toBe(400)
        })

        it('should reject missing password', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email: 'test@test.com' }
            })
            expect(response.statusCode).toBe(400)
        })
    })

    // ── Apple OAuth ──
    describe('POST /api/auth/apple', () => {
        it('should verify Apple ID token via Supabase', async () => {
            mockSignInWithIdToken.mockResolvedValue({
                data: {
                    user: { id: 'apple-user-id', email: 'apple@icloud.com', user_metadata: {} },
                    session: {
                        access_token: 'apple_access_789',
                        refresh_token: 'apple_refresh_789',
                        expires_in: 3600
                    }
                },
                error: null
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/apple',
                payload: { id_token: 'valid.apple.jwt.token' }
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.tokens.accessToken).toBe('apple_access_789')
            expect(mockSignInWithIdToken).toHaveBeenCalledWith({
                provider: 'apple',
                token: 'valid.apple.jwt.token',
                nonce: undefined,
            })
        })

        it('should return 401 on invalid Apple token', async () => {
            mockSignInWithIdToken.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: 'Invalid ID token' }
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/apple',
                payload: { id_token: 'invalid.token' }
            })

            expect(response.statusCode).toBe(401)
        })

        it('should reject missing id_token', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/apple',
                payload: {}
            })
            expect(response.statusCode).toBe(400)
        })
    })

    // ── Google OAuth ──
    describe('POST /api/auth/google', () => {
        it('should verify Google ID token via Supabase', async () => {
            mockSignInWithIdToken.mockResolvedValue({
                data: {
                    user: { id: 'google-user-id', email: 'user@gmail.com', user_metadata: { name: 'Test User' } },
                    session: {
                        access_token: 'google_access_101',
                        refresh_token: 'google_refresh_101',
                        expires_in: 3600
                    }
                },
                error: null
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/google',
                payload: { id_token: 'valid.google.jwt.token' }
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
            expect(body.tokens.accessToken).toBe('google_access_101')
        })

        it('should return 401 on invalid Google token', async () => {
            mockSignInWithIdToken.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: 'Invalid ID token' }
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/google',
                payload: { id_token: 'invalid.token' }
            })

            expect(response.statusCode).toBe(401)
        })
    })

    // ── Token Refresh ──
    describe('POST /api/auth/refresh', () => {
        it('should refresh with valid refresh token', async () => {
            mockRefreshSession.mockResolvedValue({
                data: {
                    session: {
                        access_token: 'refreshed_access',
                        refresh_token: 'refreshed_refresh',
                        expires_in: 3600
                    }
                },
                error: null
            })

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/refresh',
                payload: { refresh_token: 'valid_refresh_token' }
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
        })

        it('should reject missing refresh_token', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/refresh',
                payload: {}
            })
            expect(response.statusCode).toBe(400)
        })
    })

    // ── Logout ──
    describe('DELETE /api/auth/logout', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/auth/logout',
            })
            expect(response.statusCode).toBe(401)
        })

        it('should logout with valid auth header', async () => {
            mockAdminSignOut.mockResolvedValue({ error: null })

            const response = await app.inject({
                method: 'DELETE',
                url: '/api/auth/logout',
                headers: { authorization: 'Bearer test-token' }
            })

            expect(response.statusCode).toBe(200)
            const body = JSON.parse(response.body)
            expect(body.success).toBe(true)
        })
    })

    // ── GET /me ──
    describe('GET /api/auth/me', () => {
        it('should require authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
            })
            expect(response.statusCode).toBe(401)
        })

        it('should return user data when authenticated', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: { authorization: 'Bearer test-token' }
            })
            expect(response.statusCode).toBe(200)
        })
    })
})

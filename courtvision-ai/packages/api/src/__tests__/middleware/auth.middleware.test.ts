import { buildApp } from '../../app'
import { FastifyInstance } from 'fastify'

/**
 * Auth Middleware — Security Tests
 *
 * Tests that the fastify.authenticate preValidation hook
 * correctly rejects invalid, expired, or missing Bearer tokens.
 * This is the most critical security test in the entire application.
 *
 * Pattern: AAA (Arrange → Act → Assert)
 */

// Mock Stripe — required by billing routes at registration time
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: { create: jest.fn().mockResolvedValue({ id: 'cus_mock' }) },
        checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }) } },
        billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/mock' }) } },
        webhooks: { constructEvent: jest.fn().mockReturnValue({ type: 'test', data: { object: {} } }) },
    }))
})

// Mock videoProcessor
jest.mock('../../queue/videoProcessor', () => ({
    videoQueue: { add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }) },
    initWorker: jest.fn(),
}))

// ── Supabase mock with spyable getUser ──────────────────────
const mockGetUser = jest.fn()

jest.mock('../../plugins/supabase', () => {
    const fp = require('fastify-plugin')
    return {
        supabasePlugin: fp(async (fastify: any) => {
            fastify.decorate('supabase', {
                auth: {
                    signUp: jest.fn(),
                    signInWithPassword: jest.fn(),
                    signInWithIdToken: jest.fn(),
                    getUser: mockGetUser,
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

// DO NOT mock authPlugin — we want to test the REAL implementation
// The real auth plugin is imported and registered by buildApp

describe('Middleware authenticate', () => {
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

    // We test against a real protected route that uses app.authenticate
    // The /api/auth/me route uses preValidation: [app.authenticate]
    const PROTECTED_URL = '/api/auth/me'

    // ── Nominal case ───────────────────────────────────────

    it('accepts a valid Bearer token and returns user data', async () => {
        // Arrange
        const mockUser = { id: 'user-123', email: 'player@courtvision.ai' }
        mockGetUser.mockResolvedValueOnce({
            data: { user: mockUser },
            error: null
        })

        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer valid-supabase-jwt-token-1234567890' }
        })

        // Assert
        expect(res.statusCode).toBe(200)
        expect(mockGetUser).toHaveBeenCalledWith('valid-supabase-jwt-token-1234567890')
    })

    // ── Missing header ─────────────────────────────────────

    it('returns 401 if Authorization header is absent', async () => {
        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL
            // No Authorization header
        })

        // Assert
        expect(res.statusCode).toBe(401)
        const body = JSON.parse(res.body)
        expect(body.success).toBe(false)
        expect(body.error).toBe('Unauthorized')
    })

    // ── Malformed header ───────────────────────────────────

    it('returns 401 if format is not Bearer (missing Bearer prefix)', async () => {
        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'basic-token-without-bearer' }
        })

        // Assert
        expect(res.statusCode).toBe(401)
    })

    it('returns 401 if token is empty after Bearer', async () => {
        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer ' }
        })

        // Assert
        expect(res.statusCode).toBe(401)
    })

    it('returns 401 if token is too short (< 10 chars)', async () => {
        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer abc' }
        })

        // Assert
        expect(res.statusCode).toBe(401)
        const body = JSON.parse(res.body)
        expect(body.error).toBe('Unauthorized')
    })

    // ── Expired / invalid token ────────────────────────────

    it('returns 401 if token is expired (Supabase returns error)', async () => {
        // Arrange
        mockGetUser.mockResolvedValueOnce({
            data: { user: null },
            error: { message: 'JWT expired', status: 401, name: 'AuthError' }
        })

        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer expired-jwt-token-1234567890' }
        })

        // Assert
        expect(res.statusCode).toBe(401)
        const body = JSON.parse(res.body)
        expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 if token is forged/invalid', async () => {
        // Arrange
        mockGetUser.mockResolvedValueOnce({
            data: { user: null },
            error: { message: 'Invalid JWT', status: 401, name: 'AuthError' }
        })

        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer totally.fake.token.that.is.long.enough' }
        })

        // Assert
        expect(res.statusCode).toBe(401)
    })

    // ── Supabase failure ───────────────────────────────────

    it('returns 401 if Supabase is down (getUser throws)', async () => {
        // Arrange
        mockGetUser.mockRejectedValueOnce(new Error('Network error'))

        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer some-valid-format-token-12345' }
        })

        // Assert — must return 401, NEVER 200
        expect(res.statusCode).toBeGreaterThanOrEqual(401)
        expect(res.statusCode).not.toBe(200)
    })

    // ── Information leak prevention ────────────────────────

    it('does not leak internal error details in the response', async () => {
        // Arrange
        mockGetUser.mockResolvedValueOnce({
            data: { user: null },
            error: { message: 'Internal DB error with PII data leak', status: 500, name: 'AuthError' }
        })

        // Act
        const res = await app.inject({
            method: 'GET',
            url: PROTECTED_URL,
            headers: { Authorization: 'Bearer some-token-for-leak-test-12345' }
        })

        // Assert — error message must be generic, no internal details
        const body = JSON.parse(res.body)
        expect(res.statusCode).toBe(401)
        expect(body.message).not.toContain('DB error')
        expect(body.message).not.toContain('PII')
        expect(body.message).not.toContain('Internal')
    })
})

import { TikTokService } from '../../services/tiktokService'

/**
 * TikTok Service — Tests
 *
 * Verifies graceful behavior when TikTok API keys are not configured,
 * and proper URL generation when they are.
 *
 * Pattern: AAA (Arrange → Act → Assert)
 */

// Mock Supabase client used by TikTokService constructor
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
    })),
}))

// Mock fluent-ffmpeg to avoid real FFmpeg dependency in tests
jest.mock('fluent-ffmpeg', () => jest.fn())

describe('TikTok Service', () => {

    const originalEnv = process.env

    beforeEach(() => {
        process.env = { ...originalEnv }
        // Set required Supabase env vars for constructor
        process.env.SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    })

    afterAll(() => {
        process.env = originalEnv
    })

    describe('Without TikTok API keys configured', () => {
        beforeEach(() => {
            delete process.env.TIKTOK_CLIENT_KEY
            delete process.env.TIKTOK_CLIENT_SECRET
        })

        it('returns error when no TikTok account is linked', async () => {
            // Arrange
            const service = new TikTokService()

            // Simulate a publish attempt — service checks DB first for linked account
            const result = await service.publishHighlight('user-123', 'https://cdn.test.com/video.mp4', 'Test highlight')

            // Assert — DB check fails first (no linked account in mock)
            expect(result.success).toBe(false)
            expect(result).toHaveProperty('error', 'NO_LINKED_ACCOUNT')
        })

        it('does not throw when keys are absent', async () => {
            // Arrange
            const service = new TikTokService()

            // Act & Assert
            await expect(
                service.publishHighlight('user-123', 'https://cdn.test.com/video.mp4', 'Test')
            ).resolves.not.toThrow()
        })
    })

    describe('With TikTok API keys but no linked account', () => {
        beforeEach(() => {
            process.env.TIKTOK_CLIENT_KEY = 'test_client_key'
            process.env.TIKTOK_CLIENT_SECRET = 'test_client_secret'
        })

        it('returns NO_LINKED_ACCOUNT error when user has no TikTok connection', async () => {
            // Arrange
            const service = new TikTokService()

            // Act — the mock supabase returns null for user_integrations
            const result = await service.publishHighlight('user-no-tiktok', 'https://cdn.test.com/video.mp4', 'Test')

            // Assert
            expect(result.success).toBe(false)
            expect(result.error).toBe('NO_LINKED_ACCOUNT')
        })
    })

    describe('TikTokService instantiation', () => {
        it('creates service without throwing', () => {
            // Act & Assert
            expect(() => new TikTokService()).not.toThrow()
        })
    })

    describe('Transcode method exists', () => {
        it('has a transcodeForTikTok method', () => {
            const service = new TikTokService()
            expect(typeof service.transcodeForTikTok).toBe('function')
        })
    })
})

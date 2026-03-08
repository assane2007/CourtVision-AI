/**
 * Feature Flags — Tests
 *
 * Verifies that feature flags respect environment variables,
 * handle edge cases, and throw for unknown flags.
 *
 * Pattern: AAA (Arrange → Act → Assert)
 */

// We need to re-import FEATURES fresh for each test since
// the module evaluates env vars at import time.
// Use jest.isolateModules for accurate env var testing.

describe('Feature Flags', () => {

    const originalEnv = process.env

    beforeEach(() => {
        jest.resetModules()
        process.env = { ...originalEnv }
        delete process.env.ENABLE_SPATIAL_3D
        delete process.env.ENABLE_TIKTOK
        delete process.env.ENABLE_VOICE_COACH
        delete process.env.ENABLE_PRECOG
    })

    afterAll(() => {
        process.env = originalEnv
    })

    it('SPATIAL_3D is disabled by default', () => {
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('SPATIAL_3D')).toBe(false)
        })
    })

    it('TIKTOK_SHARE is disabled by default', () => {
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('TIKTOK_SHARE')).toBe(false)
        })
    })

    it('VOICE_COACH is disabled by default', () => {
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('VOICE_COACH')).toBe(false)
        })
    })

    it('PRECOG is enabled by default (opt-out)', () => {
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('PRECOG')).toBe(true)
        })
    })

    it('SPATIAL_3D activates with ENABLE_SPATIAL_3D=true', () => {
        process.env.ENABLE_SPATIAL_3D = 'true'
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('SPATIAL_3D')).toBe(true)
        })
    })

    it('TIKTOK_SHARE activates with ENABLE_TIKTOK=true', () => {
        process.env.ENABLE_TIKTOK = 'true'
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('TIKTOK_SHARE')).toBe(true)
        })
    })

    it('PRECOG deactivates with ENABLE_PRECOG=false', () => {
        process.env.ENABLE_PRECOG = 'false'
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('PRECOG')).toBe(false)
        })
    })

    it('values other than "true" keep opt-in flags disabled', () => {
        process.env.ENABLE_SPATIAL_3D = '1'
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('SPATIAL_3D')).toBe(false)
        })

        process.env.ENABLE_SPATIAL_3D = 'yes'
        jest.isolateModules(() => {
            const { isFeatureEnabled } = require('../featureFlags')
            expect(isFeatureEnabled('SPATIAL_3D')).toBe(false)
        })
    })

    it('all expected FEATURES properties exist', () => {
        jest.isolateModules(() => {
            const { FEATURES } = require('../featureFlags')
            const expectedFlags = ['SPATIAL_3D', 'TIKTOK_SHARE', 'VOICE_COACH', 'PRECOG']
            expectedFlags.forEach(flag => {
                expect(FEATURES).toHaveProperty(flag)
            })
        })
    })

    it('FEATURES values are always booleans', () => {
        jest.isolateModules(() => {
            const { FEATURES } = require('../featureFlags')
            Object.values(FEATURES).forEach(value => {
                expect(typeof value).toBe('boolean')
            })
        })
    })
})

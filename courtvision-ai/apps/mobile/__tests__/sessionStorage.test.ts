/**
 * Tests pour le SessionStorageService
 */

// Mock AsyncStorage
const mockStorage: Record<string, string> = {}
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value
        return Promise.resolve()
    }),
    removeItem: jest.fn((key: string) => {
        delete mockStorage[key]
        return Promise.resolve()
    }),
}))

// Mock Supabase
jest.mock('../lib/supabase', () => ({
    supabase: {
        from: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
            }),
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
            }),
        }),
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
    },
}))

import { SessionStorageService } from '../lib/sessionStorage'
import type { SessionRealtimeStats, DetectedShot } from '../lib/realtimeAIService'

describe('SessionStorageService', () => {
    let service: SessionStorageService

    const mockStats: SessionRealtimeStats = {
        sessionId: 'test_session_001',
        totalShots: 20,
        madeShots: 10,
        missedShots: 10,
        shootingPct: 50.0,
        avgReleaseTime: 0.42,
        avgElbowAngle: 94.2,
        avgReleaseHeight: 1.14,
        followThroughPct: 80.0,
        avgPostureQuality: 72.0,
        avgProcessingTimeMs: 6.5,
        totalFramesProcessed: 3000,
        sessionDurationSec: 600,
        shotsByZone: {},
        bestShot: null,
        worstShot: null,
        mechanicConsistency: 68,
        trends: [],
    }

    const mockShots: DetectedShot[] = [
        {
            shotId: 'shot_1',
            completedPhase: 'following_through',
            phaseTimestamps: {
                gatherStart: 0,
                releasePoint: 0.4,
                followThroughStart: 0.5,
                ballFlightStart: 0.6,
                resolved: 1.0,
            },
            releaseBiomechanics: {
                elbowAngle: 94,
                releaseHeightRatio: 1.14,
                playerHeightPx: 400,
                ballPosition: { x: 0.5, y: 0.3 },
                hasGoodBase: true,
                kneeFlexion: 155,
                isAligned: true,
                postureQuality: 74,
            },
            setPointElbowAngle: 94,
            releaseTime: 0.42,
            hasFollowThrough: true,
            followThroughDuration: 0.3,
            outcome: 'made',
            detectionConfidence: 0.92,
            angleTimeline: [],
            wristTrajectory: [],
        },
    ]

    beforeEach(() => {
        // Clear storage
        Object.keys(mockStorage).forEach(key => delete mockStorage[key])
        // Reset singleton
        ;(SessionStorageService as any).instance = null
        service = SessionStorageService.getInstance()
    })

    describe('Singleton', () => {
        it('devrait retourner la même instance', () => {
            const s1 = SessionStorageService.getInstance()
            const s2 = SessionStorageService.getInstance()
            expect(s1).toBe(s2)
        })
    })

    describe('saveSession', () => {
        it('devrait sauvegarder une session', async () => {
            const session = await service.saveSession(mockStats, mockShots)

            expect(session).toBeTruthy()
            expect(session.id).toBeTruthy()
            expect(session.stats.totalShots).toBe(20)
            expect(session.durationSec).toBe(600)
        })

        it('devrait persister dans AsyncStorage', async () => {
            await service.saveSession(mockStats, mockShots)

            const AsyncStorage = require('@react-native-async-storage/async-storage')
            expect(AsyncStorage.setItem).toHaveBeenCalled()
        })
    })

    describe('getSessionHistory', () => {
        it('devrait retourner un tableau vide si aucune session', async () => {
            const history = await service.getSessionHistory()
            expect(history).toEqual([])
        })

        it('devrait retourner les sessions sauvegardées', async () => {
            await service.saveSession(mockStats, mockShots)
            const history = await service.getSessionHistory()

            expect(history.length).toBe(1)
            expect(history[0].totalShots).toBe(20)
            expect(history[0].shootingPct).toBe(50.0)
            expect(history[0].avgElbowAngle).toBe(94.2)
            expect(history[0].avgReleaseHeight).toBe(1.14)
            expect(history[0].avgReleaseTime).toBe(0.42)
            expect(history[0].followThroughPct).toBe(80.0)
        })

        it('devrait respecter la limite', async () => {
            for (let i = 0; i < 5; i++) {
                await service.saveSession(
                    { ...mockStats, sessionId: `session_${i}` },
                    mockShots,
                )
            }

            const history = await service.getSessionHistory(3)
            expect(history.length).toBe(3)
        })

        it('devrait inclure un grade et un score', async () => {
            await service.saveSession(mockStats, mockShots)
            const history = await service.getSessionHistory()

            expect(history[0].grade).toBeTruthy()
            expect(history[0].overallScore).toBeGreaterThan(0)
        })
    })

    describe('getSession', () => {
        it('devrait retourner null si la session n\'existe pas', async () => {
            const session = await service.getSession('nonexistent')
            expect(session).toBeNull()
        })

        it('devrait retourner la session complète', async () => {
            const saved = await service.saveSession(mockStats, mockShots)
            const session = await service.getSession(saved.id)

            expect(session).toBeTruthy()
            expect(session!.stats.totalShots).toBe(20)
            expect(session!.shots.length).toBe(1)
        })
    })
})

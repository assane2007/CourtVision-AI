/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Tests pour le ShareService
 */

// Mock React Native Share
jest.mock('react-native', () => ({
    Share: {
        share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
    },
    Platform: {
        OS: 'ios',
    },
}))

import { ShareService } from '../lib/shareService'
import type { SessionRealtimeStats } from '../lib/realtimeAIService'

describe('ShareService', () => {
    let service: ShareService

    const mockStats: SessionRealtimeStats = {
        sessionId: 'test_session_123',
        totalShots: 25,
        madeShots: 12,
        missedShots: 13,
        shootingPct: 48.0,
        avgReleaseTime: 0.42,
        avgElbowAngle: 94.2,
        avgReleaseHeight: 1.145,
        followThroughPct: 82.5,
        avgPostureQuality: 74.3,
        avgProcessingTimeMs: 8.5,
        totalFramesProcessed: 4500,
        sessionDurationSec: 900,
        shotsByZone: {},
        bestShot: null,
        worstShot: null,
        mechanicConsistency: 72,
        trends: [
            { metric: 'release_time', direction: 'improving', description: 'Release accéléré (0.46s → 0.42s)' },
            { metric: 'posture_quality', direction: 'declining', description: 'Posture dégradée (-3 pts)' },
        ],
    }

    beforeEach(() => {
        service = new ShareService()
        jest.clearAllMocks()
    })

    describe('shareSessionSummary', () => {
        it('devrait appeler Share.share avec le bon contenu', async () => {
            const { Share } = require('react-native')
            await service.shareSessionSummary(mockStats)

            expect(Share.share).toHaveBeenCalledTimes(1)
            const call = Share.share.mock.calls[0][0]
            expect(call.title).toContain('CourtVision AI')
            expect(call.message).toContain('48%')
            expect(call.message).toContain('25 tirs')
            expect(call.message).toContain('94.2°')
        })

        it('devrait inclure les tendances dans le message', async () => {
            const { Share } = require('react-native')
            await service.shareSessionSummary(mockStats)

            const message = Share.share.mock.calls[0][0].message
            expect(message).toContain('Tendances')
            expect(message).toContain('Release accéléré')
        })
    })

    describe('exportSessionJSON', () => {
        it('devrait retourner du JSON valide', () => {
            const json = service.exportSessionJSON(mockStats)
            const parsed = JSON.parse(json)

            expect(parsed.sessionId).toBe('test_session_123')
            expect(parsed.totalShots).toBe(25)
            expect(parsed.shootingPct).toBe(48.0)
            expect(parsed.avgElbowAngle).toBe(94.2)
        })
    })

    describe('exportSessionCSV', () => {
        it('devrait retourner du CSV avec headers et valeurs', () => {
            const csv = service.exportSessionCSV(mockStats)
            const lines = csv.split('\n')

            expect(lines.length).toBe(2)
            expect(lines[0]).toContain('Session ID')
            expect(lines[0]).toContain('Total Shots')
            expect(lines[1]).toContain('test_session_123')
            expect(lines[1]).toContain('25')
        })
    })

    describe('shareProfileStats', () => {
        it('devrait partager les stats de profil', async () => {
            const { Share } = require('react-native')
            await service.shareProfileStats({
                totalSessions: 15,
                totalShots: 400,
                overallFgPct: 44,
                avgScore: 72,
                streak: 5,
                bestGrade: 'A',
            })

            expect(Share.share).toHaveBeenCalledTimes(1)
            const message = Share.share.mock.calls[0][0].message
            expect(message).toContain('15 sessions')
            expect(message).toContain('400 tirs')
            expect(message).toContain('44%')
        })
    })
})

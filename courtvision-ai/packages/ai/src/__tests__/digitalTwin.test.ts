import type { Reconstruction3DResult } from '../reconstruction3d'
import type { MentalAnalysisResult } from '../mentalAnalysis'
import type { SessionAnalysisData } from '../digitalTwin'
import { TwinBuilder } from '../digitalTwin'
import type { TrackingResult } from '../tracking'
import { LANDMARKS } from '../tracking'

const BASE_MENTAL: MentalAnalysisResult = {
    mentalFragilityScore: 42,
    fatigueIndex: 28,
    bodyLanguageScore: 74,
    detectedPatterns: [],
    timeline: [],
    confidenceLevel: 'medium',
    insights: [],
    quarterComparison: { q1: 44, q2: 43, q3: 41, q4: 40 },
}

const BASE_RECONSTRUCTION: Reconstruction3DResult = {
    heatmapData: [],
    aerialViewPositions: [],
    playerDistances: [],
    zoneOccupancy: {
        restricted_area: 0,
        paint: 0,
        midrange_left: 0,
        midrange_right: 0,
        midrange_top: 0,
        corner3_left: 0,
        corner3_right: 0,
        wing3_left: 0,
        wing3_right: 0,
        top3: 0,
        backcourt: 0,
    },
    averagePositions: {},
    totalDistanceCovered: {},
    maxSpeed: {},
}

function makeLandmarks(rightLiftDelta: number, leftLiftDelta: number) {
    const arr = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }))

    arr[LANDMARKS.LEFT_SHOULDER] = { x: 0.4, y: 0.42, z: 0, visibility: 0.95 }
    arr[LANDMARKS.RIGHT_SHOULDER] = { x: 0.6, y: 0.42, z: 0, visibility: 0.95 }

    arr[LANDMARKS.LEFT_WRIST] = { x: 0.35, y: 0.42 - leftLiftDelta, z: 0, visibility: 0.95 }
    arr[LANDMARKS.RIGHT_WRIST] = { x: 0.65, y: 0.42 - rightLiftDelta, z: 0, visibility: 0.95 }

    return arr
}

function makeSession(sessionId: string, tracking?: TrackingResult[]): SessionAnalysisData {
    return {
        sessionId,
        date: '2026-04-07T00:00:00.000Z',
        type: 'training',
        shots: [],
        mental: BASE_MENTAL,
        reconstruction: BASE_RECONSTRUCTION,
        tracking,
    }
}

describe('TwinBuilder dominant hand detection', () => {
    it('detects right handed profile when right wrist is more elevated', () => {
        const tracking: TrackingResult[] = [
            {
                frameIndex: 1,
                timestamp: 0,
                ballPosition: null,
                mainUserId: 1,
                players: [
                    {
                        id: 1,
                        confidence: 0.99,
                        landmarks: makeLandmarks(0.18, 0.05),
                        bbox: { x: 0, y: 0, w: 100, h: 200 },
                    },
                ],
            },
        ]

        const builder = new TwinBuilder()
        builder.addSessions([makeSession('s-right', tracking)])

        const profile = builder.buildProfile()
        expect(profile.poseSignature.dominantHand).toBe('right')
    })

    it('detects left handed profile when left wrist is more elevated', () => {
        const tracking: TrackingResult[] = [
            {
                frameIndex: 1,
                timestamp: 0,
                ballPosition: null,
                mainUserId: 1,
                players: [
                    {
                        id: 1,
                        confidence: 0.99,
                        landmarks: makeLandmarks(0.03, 0.2),
                        bbox: { x: 0, y: 0, w: 100, h: 200 },
                    },
                ],
            },
        ]

        const builder = new TwinBuilder()
        builder.addSessions([makeSession('s-left', tracking)])

        const profile = builder.buildProfile()
        expect(profile.poseSignature.dominantHand).toBe('left')
    })

    it('keeps previous dominant hand when no tracking signals are available', () => {
        const builder = new TwinBuilder()

        builder.loadExistingProfile({
            modelVersion: 'v2.0',
            updatedAt: '2026-04-06T00:00:00.000Z',
            sessionCount: 4,
            overallRating: 75,
            attributeCategories: [],
            playStyle: {
                primary: 'balanced',
                secondary: null,
                confidence: 0,
                description: 'baseline',
                nbaArchetype: '—',
                traits: [],
            },
            strengths: [],
            weaknesses: [],
            nbaComparisons: [],
            comfortZones: [],
            evolution: [],
            preferredZones: {},
            poseSignature: {
                avgElbowAngle: 90,
                avgReleaseHeight: 1.1,
                avgShoulderPosture: 70,
                avgArcAngle: 45,
                avgMaxVertical: 20,
                dominantHand: 'left',
            },
            mentalProfile: {
                resilience: 60,
                clutchFactor: 61,
                consistency: 62,
                pressureResponse: 'neutral',
                fatigueResistance: 63,
            },
        })

        builder.addSessions([makeSession('s-no-tracking')])

        const profile = builder.buildProfile()
        expect(profile.poseSignature.dominantHand).toBe('left')
    })
})

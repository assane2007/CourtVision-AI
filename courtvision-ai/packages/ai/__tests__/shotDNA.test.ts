/**
 * Tests — Shot DNA Engine
 * Vérifie la biomécanique, la comparaison NBA, et la détection de drift
 */

import { ShotDNAEngine, type ShotDNASignature } from '../src/shotDNA'
import type { ShotResult } from '../src/shotAnalysis'

const mockShots: ShotResult[] = [
    {
        timestamp: '01:30',
        zone: 'top3',
        outcome: 'made',
        posture: {
            elbowAngle: 93,
            releaseHeight: 0.91,
            releaseTime: 0.38,
            followThrough: true,
        },
    },
    {
        timestamp: '02:15',
        zone: 'midrange',
        outcome: 'missed',
        posture: {
            elbowAngle: 95,
            releaseHeight: 0.89,
            releaseTime: 0.40,
            followThrough: true,
        },
    },
    {
        timestamp: '03:00',
        zone: 'wing3',
        outcome: 'made',
        posture: {
            elbowAngle: 92,
            releaseHeight: 0.92,
            releaseTime: 0.37,
            followThrough: true,
        },
    },
    {
        timestamp: '04:30',
        zone: 'corner3',
        outcome: 'made',
        posture: {
            elbowAngle: 94,
            releaseHeight: 0.90,
            releaseTime: 0.39,
            followThrough: false,
        },
    },
    {
        timestamp: '05:00',
        zone: 'paint',
        outcome: 'missed',
        posture: {
            elbowAngle: 88,
            releaseHeight: 0.85,
            releaseTime: 0.45,
            followThrough: true,
        },
    },
] as ShotResult[]

describe('ShotDNAEngine', () => {

    describe('computeSignature', () => {
        it('should compute average biomechanics from shot data', () => {
            const signature = ShotDNAEngine.computeSignature(mockShots)

            expect(signature.avgElbowAngle).toBeGreaterThan(85)
            expect(signature.avgElbowAngle).toBeLessThan(100)
            expect(signature.avgReleaseHeight).toBeGreaterThan(0.8)
            expect(signature.avgReleaseHeight).toBeLessThan(1.0)
            expect(signature.avgReleaseTime).toBeGreaterThan(0.3)
            expect(signature.avgReleaseTime).toBeLessThan(0.5)
            expect(signature.followThroughPct).toBe(80) // 4/5
            expect(signature.dominantHand).toBe('right')
        })

        it('should compute standard deviations', () => {
            const signature = ShotDNAEngine.computeSignature(mockShots)

            expect(signature.elbowStdDev).toBeGreaterThan(0)
            expect(signature.releaseHeightStdDev).toBeGreaterThan(0)
        })

        it('should handle empty shot array', () => {
            const signature = ShotDNAEngine.computeSignature([])

            expect(signature.avgElbowAngle).toBe(0)
            expect(signature.avgReleaseHeight).toBe(0)
            expect(signature.followThroughPct).toBe(0)
        })
    })

    describe('computePurityScore', () => {
        it('should give high score for consistent mechanics', () => {
            const perfectSignature: ShotDNASignature = {
                avgElbowAngle: 93,
                avgReleaseHeight: 0.91,
                avgReleaseTime: 0.38,
                followThroughPct: 98,
                dominantHand: 'right',
                elbowStdDev: 1.5,
                releaseHeightStdDev: 0.02,
            }

            const score = ShotDNAEngine.computePurityScore(perfectSignature)
            expect(score).toBeGreaterThan(80)
            expect(score).toBeLessThanOrEqual(100)
        })

        it('should give low score for inconsistent mechanics', () => {
            const badSignature: ShotDNASignature = {
                avgElbowAngle: 80,
                avgReleaseHeight: 0.75,
                avgReleaseTime: 0.55,
                followThroughPct: 30,
                dominantHand: 'right',
                elbowStdDev: 12,
                releaseHeightStdDev: 0.15,
            }

            const score = ShotDNAEngine.computePurityScore(badSignature)
            expect(score).toBeLessThan(40)
        })
    })

    describe('findNBAMatch', () => {
        it('should find the closest NBA player match', () => {
            const curryLike: ShotDNASignature = {
                avgElbowAngle: 95,
                avgReleaseHeight: 0.92,
                avgReleaseTime: 0.38,
                followThroughPct: 98,
                dominantHand: 'right',
                elbowStdDev: 2,
                releaseHeightStdDev: 0.03,
            }

            const match = ShotDNAEngine.findNBAMatch(curryLike)
            expect(match.player).toBe('Stephen Curry')
            expect(match.similarity).toBeGreaterThan(80)
            expect(match.traits.length).toBeGreaterThan(0)
        })

        it('should return similarity between 0 and 100', () => {
            const signature = ShotDNAEngine.computeSignature(mockShots)
            const match = ShotDNAEngine.findNBAMatch(signature)

            expect(match.similarity).toBeGreaterThanOrEqual(0)
            expect(match.similarity).toBeLessThanOrEqual(100)
            expect(match.player).toBeTruthy()
        })
    })

    describe('computeShotQuality', () => {
        it('should compute quality score for a shot', () => {
            const signature = ShotDNAEngine.computeSignature(mockShots)
            const quality = ShotDNAEngine.computeShotQuality(mockShots[0], signature)

            expect(quality.expectedMakePct).toBeGreaterThanOrEqual(5)
            expect(quality.expectedMakePct).toBeLessThanOrEqual(95)
            expect(quality.grade).toBeTruthy()
            expect(quality.factors.mechanicScore).toBeGreaterThanOrEqual(0)
            expect(quality.factors.zoneScore).toBeGreaterThan(0)
        })

        it('should penalize clutch and contested shots', () => {
            const signature = ShotDNAEngine.computeSignature(mockShots)

            const normal = ShotDNAEngine.computeShotQuality(mockShots[0], signature)
            const clutch = ShotDNAEngine.computeShotQuality(mockShots[0], signature, {
                isClutch: true,
                isContested: true,
                fatigueLevel: 80,
            })

            expect(clutch.expectedMakePct).toBeLessThan(normal.expectedMakePct)
        })
    })

    describe('detectMechanicalDrift', () => {
        it('should detect elbow angle drift', () => {
            const current: ShotDNASignature = {
                avgElbowAngle: 100,
                avgReleaseHeight: 0.91,
                avgReleaseTime: 0.38,
                followThroughPct: 95,
                dominantHand: 'right',
                elbowStdDev: 3,
                releaseHeightStdDev: 0.03,
            }

            const historical: ShotDNASignature = {
                avgElbowAngle: 93,
                avgReleaseHeight: 0.91,
                avgReleaseTime: 0.38,
                followThroughPct: 95,
                dominantHand: 'right',
                elbowStdDev: 2,
                releaseHeightStdDev: 0.03,
            }

            const drifts = ShotDNAEngine.detectMechanicalDrift(current, historical, '2024-01-01')
            expect(drifts.length).toBeGreaterThan(0)
            expect(drifts[0].metric).toBe('elbow_angle')
            expect(drifts[0].direction).toBe('up')
            expect(drifts[0].severity).toBeTruthy()
        })

        it('should detect follow-through degradation', () => {
            const current: ShotDNASignature = {
                avgElbowAngle: 93,
                avgReleaseHeight: 0.91,
                avgReleaseTime: 0.38,
                followThroughPct: 60,
                dominantHand: 'right',
                elbowStdDev: 2,
                releaseHeightStdDev: 0.03,
            }

            const historical: ShotDNASignature = {
                avgElbowAngle: 93,
                avgReleaseHeight: 0.91,
                avgReleaseTime: 0.38,
                followThroughPct: 95,
                dominantHand: 'right',
                elbowStdDev: 2,
                releaseHeightStdDev: 0.03,
            }

            const drifts = ShotDNAEngine.detectMechanicalDrift(current, historical, '2024-01-01')
            const ftDrift = drifts.find(d => d.metric === 'follow_through')
            expect(ftDrift).toBeDefined()
            expect(ftDrift!.direction).toBe('down')
        })

        it('should return empty array when no drift', () => {
            const sig: ShotDNASignature = {
                avgElbowAngle: 93,
                avgReleaseHeight: 0.91,
                avgReleaseTime: 0.38,
                followThroughPct: 95,
                dominantHand: 'right',
                elbowStdDev: 2,
                releaseHeightStdDev: 0.03,
            }

            const drifts = ShotDNAEngine.detectMechanicalDrift(sig, sig, '2024-01-01')
            expect(drifts.length).toBe(0)
        })
    })

    describe('buildProfile', () => {
        it('should build complete Shot DNA profile', () => {
            const profile = ShotDNAEngine.buildProfile(mockShots)

            expect(profile.signature).toBeDefined()
            expect(profile.purityScore).toBeGreaterThanOrEqual(0)
            expect(profile.purityScore).toBeLessThanOrEqual(100)
            expect(profile.closestNBAPlayer).toBeTruthy()
            expect(profile.nbaSimilarity).toBeGreaterThanOrEqual(0)
            expect(profile.nbaSimilarity).toBeLessThanOrEqual(100)
            expect(profile.zoneEfficiency).toBeDefined()
            expect(profile.avgShotQuality).toBeGreaterThanOrEqual(0)
            expect(profile.totalShotsAnalyzed).toBe(5)
        })

        it('should compute zone efficiency for all zones', () => {
            const profile = ShotDNAEngine.buildProfile(mockShots)

            expect(profile.zoneEfficiency.top3).toBeDefined()
            expect(profile.zoneEfficiency.midrange).toBeDefined()
            expect(profile.zoneEfficiency.corner3).toBeDefined()
            expect(profile.zoneEfficiency.wing3).toBeDefined()
            expect(profile.zoneEfficiency.paint).toBeDefined()
            expect(profile.zoneEfficiency.restricted).toBeDefined()

            // We have 1 shot at top3 that was made
            expect(profile.zoneEfficiency.top3.attempts).toBe(1)
            expect(profile.zoneEfficiency.top3.made).toBe(1)
            expect(profile.zoneEfficiency.top3.pct).toBe(100)
        })
    })
})

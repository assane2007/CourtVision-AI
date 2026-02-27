/**
 * Tests — Advanced Analytics Engine
 */

import { AdvancedAnalyticsEngine } from '../src/advancedAnalytics'
import type { ShotResult } from '../src/shotAnalysis'
import type { MentalAnalysisResult } from '../src/mentalAnalysis'

const mockShots: ShotResult[] = [
    { timestamp: '01:00', zone: 'top3', outcome: 'made', posture: { elbowAngle: 93, releaseHeight: 1.15, releaseTime: 0.38, followThrough: true } },
    { timestamp: '02:00', zone: 'midrange', outcome: 'missed', posture: { elbowAngle: 90, releaseHeight: 1.11, releaseTime: 0.40, followThrough: true } },
    { timestamp: '03:00', zone: 'wing3', outcome: 'made', posture: { elbowAngle: 92, releaseHeight: 1.14, releaseTime: 0.37, followThrough: true } },
    { timestamp: '04:00', zone: 'corner3', outcome: 'made', posture: { elbowAngle: 94, releaseHeight: 1.15, releaseTime: 0.39, followThrough: false } },
    { timestamp: '05:00', zone: 'paint', outcome: 'missed', posture: { elbowAngle: 88, releaseHeight: 1.08, releaseTime: 0.45, followThrough: true } },
    { timestamp: '06:00', zone: 'restricted', outcome: 'made', posture: { elbowAngle: 87, releaseHeight: 1.06, releaseTime: 0.42, followThrough: true } },
    { timestamp: '07:00', zone: 'top3', outcome: 'made', posture: { elbowAngle: 93, releaseHeight: 1.15, releaseTime: 0.38, followThrough: true } },
    { timestamp: '08:00', zone: 'wing3', outcome: 'missed', posture: { elbowAngle: 91, releaseHeight: 1.12, releaseTime: 0.39, followThrough: false } },
    { timestamp: '09:00', zone: 'midrange', outcome: 'made', posture: { elbowAngle: 93, releaseHeight: 1.14, releaseTime: 0.40, followThrough: true } },
    { timestamp: '10:00', zone: 'corner3', outcome: 'missed', posture: { elbowAngle: 95, releaseHeight: 1.16, releaseTime: 0.38, followThrough: true } },
] as ShotResult[]

const mockMental = {
    mentalFragilityScore: 35,
    detectedPatterns: ['resilient'],
    insights: ['Good mental composure'],
    timeline: [],
    quarterComparison: { 1: 70, 2: 65, 3: 60, 4: 55 },
    fatigueIndex: 30,
    bodyLanguageScore: 72,
    confidenceLevel: 0.8,
} as unknown as MentalAnalysisResult

describe('AdvancedAnalyticsEngine', () => {

    describe('compute', () => {
        it('should compute all advanced analytics', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)

            expect(result.trueShooting).toBeGreaterThan(0)
            expect(result.effectiveFG).toBeGreaterThan(0)
            expect(result.shotQualityAvg).toBeGreaterThan(0)
            expect(result.clutchRating).toBeGreaterThanOrEqual(0)
            expect(result.clutchRating).toBeLessThanOrEqual(100)
            expect(result.courtBalanceIndex).toBeGreaterThanOrEqual(0)
            expect(result.courtBalanceIndex).toBeLessThanOrEqual(100)
            expect(result.offensiveRating).toBeGreaterThanOrEqual(0)
            expect(result.overallGrade).toBeTruthy()
        })

        it('should compute streaks correctly', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)

            expect(result.longestMakeStreak).toBeGreaterThanOrEqual(0)
            expect(result.longestMissStreak).toBeGreaterThanOrEqual(0)
        })

        it('should identify hot and cold zones', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)

            expect(Array.isArray(result.hotZones)).toBe(true)
            expect(Array.isArray(result.coldZones)).toBe(true)
        })

        it('should track momentum shifts', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)
            expect(Array.isArray(result.momentumShifts)).toBe(true)
        })

        it('should handle empty shots', () => {
            const result = AdvancedAnalyticsEngine.compute([], mockMental, 600)

            expect(result.trueShooting).toBe(0)
            expect(result.offensiveRating).toBeGreaterThanOrEqual(0)
        })
    })

    describe('zone distribution', () => {
        it('should compute zone distribution percentages', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)

            const totalDistribution = Object.values(result.zoneDistribution)
                .reduce((sum, v) => sum + v, 0)

            // Should approximately sum to 100%
            expect(totalDistribution).toBeGreaterThan(95)
            expect(totalDistribution).toBeLessThan(105)
        })
    })

    describe('efficiency by quarter', () => {
        it('should compute per-quarter efficiency', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)
            expect(result.efficiencyByQuarter).toBeDefined()
        })
    })

    describe('overall grade', () => {
        it('should assign a letter grade', () => {
            const result = AdvancedAnalyticsEngine.compute(mockShots, mockMental, 600)
            const validGrades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
            expect(validGrades).toContain(result.overallGrade)
        })
    })
})

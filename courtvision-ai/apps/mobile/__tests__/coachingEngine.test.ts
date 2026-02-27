/**
 * Tests for CoachingEngine
 */

import { CoachingEngine } from '../lib/coachingEngine'
import type { SessionRealtimeStats } from '../lib/realtimeAIService'

describe('CoachingEngine', () => {
    let engine: CoachingEngine

    beforeEach(() => {
        engine = new CoachingEngine()
    })

    function makeStats(overrides: Partial<SessionRealtimeStats> = {}): SessionRealtimeStats {
        return {
            sessionId: 'test_session_1',
            totalShots: 20,
            madeShots: 10,
            missedShots: 10,
            shootingPct: 50,
            avgReleaseTime: 0.45,
            avgElbowAngle: 94,
            avgReleaseHeight: 1.14,
            followThroughPct: 85,
            avgPostureQuality: 75,
            avgProcessingTimeMs: 12,
            totalFramesProcessed: 3600,
            sessionDurationSec: 120,
            shotsByZone: {},
            bestShot: null,
            worstShot: null,
            mechanicConsistency: 72,
            trends: [],
            ...overrides,
        }
    }

    describe('generateReport', () => {
        it('should generate a complete report', () => {
            const stats = makeStats()
            const report = engine.generateReport(stats, [])

            expect(report).toBeDefined()
            expect(report.grade).toBeDefined()
            expect(report.score).toBeGreaterThan(0)
            expect(report.score).toBeLessThanOrEqual(100)
            expect(report.headline).toBeDefined()
            expect(typeof report.headline).toBe('string')
            expect(report.insights).toBeDefined()
            expect(Array.isArray(report.insights)).toBe(true)
            expect(report.drills).toBeDefined()
            expect(report.drills.length).toBeLessThanOrEqual(3)
            expect(report.nextSessionFocus).toBeDefined()
            expect(report.nbaComparison).toBeDefined()
            expect(report.nbaComparison.closestPlayer).toBeDefined()
            expect(report.nbaComparison.similarity).toBeGreaterThanOrEqual(0)
            expect(report.motivationMessage).toBeDefined()
        })

        it('should give a high grade for elite-level stats', () => {
            const stats = makeStats({
                shootingPct: 55,
                avgElbowAngle: 93,
                avgReleaseTime: 0.40,
                avgReleaseHeight: 1.16,
                followThroughPct: 95,
                avgPostureQuality: 90,
                mechanicConsistency: 88,
            })
            const report = engine.generateReport(stats, [])
            expect(['A+', 'A', 'A-']).toContain(report.grade)
            expect(report.score).toBeGreaterThanOrEqual(80)
        })

        it('should give a low grade for poor stats', () => {
            const stats = makeStats({
                shootingPct: 20,
                avgElbowAngle: 115,
                avgReleaseTime: 0.65,
                avgReleaseHeight: 0.98,
                followThroughPct: 40,
                avgPostureQuality: 35,
                mechanicConsistency: 30,
            })
            const report = engine.generateReport(stats, [])
            expect(['D+', 'D', 'F']).toContain(report.grade)
            expect(report.score).toBeLessThan(55)
        })

        it('should identify strengths for elite metrics', () => {
            const stats = makeStats({
                shootingPct: 55,
                avgElbowAngle: 93,
                avgReleaseTime: 0.40,
                followThroughPct: 95,
                mechanicConsistency: 85,
            })
            const report = engine.generateReport(stats, [])
            const strengths = report.insights.filter(i => i.category === 'strength')
            expect(strengths.length).toBeGreaterThan(0)
        })

        it('should identify weaknesses for poor metrics', () => {
            const stats = makeStats({
                avgElbowAngle: 112,
                avgReleaseTime: 0.60,
                avgReleaseHeight: 1.02,
                followThroughPct: 45,
                mechanicConsistency: 35,
                shootingPct: 25,
                totalShots: 10,
            })
            const report = engine.generateReport(stats, [])
            const weaknesses = report.insights.filter(i => i.category === 'weakness')
            expect(weaknesses.length).toBeGreaterThan(0)
        })

        it('should recommend drills based on weaknesses', () => {
            const stats = makeStats({
                avgReleaseTime: 0.65,  // slow release
                avgElbowAngle: 112,     // wide elbow
            })
            const report = engine.generateReport(stats, [])
            expect(report.drills.length).toBeGreaterThan(0)
            // Should prioritize drills for the weaknesses
            const drillTargets = report.drills.map(d => d.targetMetric)
            expect(drillTargets.some(t => ['elbowAngle', 'releaseTime'].includes(t))).toBe(true)
        })

        it('should find closest NBA player comparison', () => {
            const stats = makeStats({
                avgElbowAngle: 91,
                avgReleaseTime: 0.39,
                avgReleaseHeight: 1.18,
            })
            const report = engine.generateReport(stats, [])
            // With Curry-like stats, should match Curry
            expect(report.nbaComparison.closestPlayer).toBeDefined()
            expect(report.nbaComparison.similarity).toBeGreaterThan(0)
        })

        it('should include milestones for high shot count', () => {
            const stats = makeStats({ totalShots: 55 })
            const report = engine.generateReport(stats, [])
            const milestones = report.insights.filter(i => i.category === 'milestone')
            expect(milestones.length).toBeGreaterThan(0)
        })

        it('should detect trends when provided', () => {
            const stats = makeStats({
                trends: [
                    { metric: 'release_time', direction: 'improving', description: 'Release accéléré (0.52s → 0.45s)' },
                    { metric: 'posture_quality', direction: 'declining', description: 'Posture dégradée (-8 pts)' },
                ],
            })
            const report = engine.generateReport(stats, [])
            const trendInsights = report.insights.filter(i => i.category === 'trend')
            expect(trendInsights.length).toBe(2)
        })

        it('should return correct motivation message by grade', () => {
            // High grade
            const eliteReport = engine.generateReport(makeStats({
                shootingPct: 55, avgElbowAngle: 93, avgReleaseTime: 0.40,
                avgReleaseHeight: 1.16, followThroughPct: 95, avgPostureQuality: 90, mechanicConsistency: 88,
            }), [])
            expect(eliteReport.motivationMessage.length).toBeGreaterThan(5)

            // Low grade
            const lowReport = engine.generateReport(makeStats({
                shootingPct: 20, avgElbowAngle: 115, avgReleaseTime: 0.65,
                avgReleaseHeight: 0.98, followThroughPct: 40, avgPostureQuality: 35, mechanicConsistency: 30,
            }), [])
            expect(lowReport.motivationMessage.length).toBeGreaterThan(5)
        })

        it('should sort insights by priority (most important first)', () => {
            const stats = makeStats({
                avgElbowAngle: 112,
                avgReleaseTime: 0.60,
                followThroughPct: 45,
                mechanicConsistency: 35,
                shootingPct: 25,
                totalShots: 10,
            })
            const report = engine.generateReport(stats, [])
            for (let i = 0; i < report.insights.length - 1; i++) {
                expect(report.insights[i].priority).toBeLessThanOrEqual(report.insights[i + 1].priority)
            }
        })
    })
})

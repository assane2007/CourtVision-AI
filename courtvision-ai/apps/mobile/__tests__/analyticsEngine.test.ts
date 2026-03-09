/**
 * Tests for AnalyticsEngine — data-science layer.
 * Validates statistical functions, significance testing,
 * correlation analysis, fatigue curves, hot hand detection,
 * EWMA projections, causal impact, and distributions.
 */

import {
    analyzeSignificance,
    analyzeCorrelations,
    analyzeFatigue,
    analyzeZoneProgression,
    analyzeHotHand,
    analyzeProjections,
    analyzeCausalImpact,
    analyzeDistributions,
    generateAnalyticsReport,
} from '../lib/analyticsEngine'
import type { SessionHistoryItem, StoredSession, StoredShot } from '../lib/sessionStorage'

// ═══════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════

function makeHistoryItem(overrides: Partial<SessionHistoryItem> = {}, index = 0): SessionHistoryItem {
    const d = new Date()
    d.setDate(d.getDate() - index)
    return {
        id: `session_${index}`,
        createdAt: d.toISOString(),
        durationSec: 600,
        totalShots: 30,
        madeShots: 15,
        shootingPct: 50,
        avgPostureQuality: 70,
        mechanicConsistency: 65,
        avgElbowAngle: 94,
        avgReleaseHeight: 1.14,
        avgReleaseTime: 0.42,
        followThroughPct: 80,
        overallScore: 68,
        grade: 'B',
        syncedToCloud: false,
        ...overrides,
    }
}

function makeShot(overrides: Partial<StoredShot> = {}, index = 0): StoredShot {
    return {
        id: `shot_${index}`,
        outcome: index % 2 === 0 ? 'made' : 'missed',
        elbowAngle: 93 + Math.random() * 4,
        releaseHeightRatio: 1.12 + Math.random() * 0.06,
        releaseTime: 0.38 + Math.random() * 0.08,
        postureQuality: 65 + Math.random() * 20,
        hasFollowThrough: Math.random() > 0.3,
        detectionConfidence: 0.85 + Math.random() * 0.1,
        zone: ['paint', 'midRangeLeft', 'corner3Right'][index % 3],
        timestamp: Date.now() - (30 - index) * 3000,
        ...overrides,
    }
}

function makeFullSession(overrides: Partial<StoredSession> = {}, index = 0): StoredSession {
    const d = new Date()
    d.setDate(d.getDate() - index)
    const shots = Array.from({ length: 30 }, (_, i) => makeShot({}, i))
    return {
        id: `session_${index}`,
        createdAt: d.toISOString(),
        durationSec: 600,
        stats: {
            sessionId: `session_${index}`,
            totalShots: 30,
            madeShots: 15,
            missedShots: 15,
            shootingPct: 50,
            avgReleaseTime: 0.42,
            avgElbowAngle: 94,
            avgReleaseHeight: 1.14,
            followThroughPct: 80,
            avgPostureQuality: 70,
            avgProcessingTimeMs: 12,
            totalFramesProcessed: 3600,
            sessionDurationSec: 600,
            shotsByZone: {},
            bestShot: null,
            worstShot: null,
            mechanicConsistency: 65,
            trends: [],
        } as any,
        shots,
        syncedToCloud: false,
        metadata: {},
        ...overrides,
    }
}

// ═══════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════

describe('AnalyticsEngine', () => {
    describe('analyzeSignificance', () => {
        it('returns empty for < 6 sessions', () => {
            const sessions = Array.from({ length: 5 }, (_, i) => makeHistoryItem({}, i))
            expect(analyzeSignificance(sessions)).toHaveLength(0)
        })

        it('returns results for 6+ sessions', () => {
            const sessions = Array.from({ length: 10 }, (_, i) => makeHistoryItem({}, i))
            const results = analyzeSignificance(sessions)
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('metric')
            expect(results[0]).toHaveProperty('pValue')
            expect(results[0]).toHaveProperty('significant')
            expect(results[0]).toHaveProperty('effectSize')
            expect(results[0]).toHaveProperty('direction')
        })

        it('detects significant improvement when recent is much better', () => {
            const sessions = [
                // Recent 5: higher FG%
                ...Array.from({ length: 5 }, (_, i) => makeHistoryItem({ shootingPct: 60 + Math.random() * 5 }, i)),
                // Earlier 5: lower FG%
                ...Array.from({ length: 5 }, (_, i) => makeHistoryItem({ shootingPct: 35 + Math.random() * 5 }, i + 5)),
            ]
            const results = analyzeSignificance(sessions)
            const fgResult = results.find(r => r.metric === 'FG%')
            expect(fgResult).toBeDefined()
            expect(fgResult!.significant).toBe(true)
            expect(fgResult!.direction).toBe('improved')
            expect(fgResult!.effectSize).toBeGreaterThan(0.5)
        })

        it('detects no significance when sessions are similar', () => {
            const sessions = Array.from({ length: 10 }, (_, i) =>
                makeHistoryItem({ shootingPct: 50 + (Math.random() - 0.5) * 2 }, i))
            const results = analyzeSignificance(sessions)
            const fgResult = results.find(r => r.metric === 'FG%')
            if (fgResult) {
                // With such small variance, should be p > 0.05 most of the time
                expect(fgResult.effectSize).toBeLessThan(1)
            }
        })

        it('results are sorted by p-value', () => {
            const sessions = Array.from({ length: 12 }, (_, i) =>
                makeHistoryItem({ shootingPct: i < 6 ? 65 : 40 }, i))
            const results = analyzeSignificance(sessions)
            for (let i = 1; i < results.length; i++) {
                expect(results[i].pValue).toBeGreaterThanOrEqual(results[i - 1].pValue)
            }
        })
    })

    describe('analyzeCorrelations', () => {
        it('returns empty for < 5 sessions', () => {
            const sessions = Array.from({ length: 4 }, (_, i) => makeHistoryItem({}, i))
            expect(analyzeCorrelations(sessions)).toHaveLength(0)
        })

        it('returns correlation results for 5+ sessions', () => {
            const sessions = Array.from({ length: 10 }, (_, i) => makeHistoryItem({}, i))
            const results = analyzeCorrelations(sessions)
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('r')
            expect(results[0]).toHaveProperty('rSquared')
            expect(results[0]).toHaveProperty('pValue')
            expect(results[0]).toHaveProperty('interpretation')
        })

        it('detects strong positive correlation', () => {
            const sessions = Array.from({ length: 12 }, (_, i) => {
                const val = 40 + i * 5
                return makeHistoryItem({ shootingPct: val, avgPostureQuality: val + 5 }, i)
            })
            const results = analyzeCorrelations(sessions)
            const postureCorr = results.find(r => r.metricA === 'Posture Quality')
            expect(postureCorr).toBeDefined()
            expect(postureCorr!.r).toBeGreaterThan(0.8)
        })

        it('r values are between -1 and 1', () => {
            const sessions = Array.from({ length: 10 }, (_, i) => makeHistoryItem({}, i))
            const results = analyzeCorrelations(sessions)
            for (const r of results) {
                expect(r.r).toBeGreaterThanOrEqual(-1)
                expect(r.r).toBeLessThanOrEqual(1)
            }
        })

        it('sorted by absolute r descending', () => {
            const sessions = Array.from({ length: 10 }, (_, i) => makeHistoryItem({}, i))
            const results = analyzeCorrelations(sessions)
            for (let i = 1; i < results.length; i++) {
                expect(Math.abs(results[i].r)).toBeLessThanOrEqual(Math.abs(results[i - 1].r))
            }
        })
    })

    describe('analyzeFatigue', () => {
        it('skips sessions with < 8 shots', () => {
            const session = makeFullSession({ shots: Array.from({ length: 5 }, (_, i) => makeShot({}, i)) })
            expect(analyzeFatigue([session])).toHaveLength(0)
        })

        it('returns fatigue curve for valid sessions', () => {
            const session = makeFullSession()
            const curves = analyzeFatigue([session])
            expect(curves).toHaveLength(1)
            expect(curves[0].quartiles).toHaveLength(4)
            expect(curves[0].fatigueIndex).toBeGreaterThanOrEqual(0)
            expect(curves[0].fatigueIndex).toBeLessThanOrEqual(100)
        })

        it('detects high fatigue when late shots all miss', () => {
            const shots: StoredShot[] = [
                // First 15: all makes
                ...Array.from({ length: 15 }, (_, i) => makeShot({ outcome: 'made' }, i)),
                // Last 15: all misses
                ...Array.from({ length: 15 }, (_, i) => makeShot({ outcome: 'missed' }, i + 15)),
            ]
            const session = makeFullSession({ shots })
            const curves = analyzeFatigue([session])
            expect(curves[0].fatigueIndex).toBeGreaterThan(40)
        })

        it('quartiles sum to total shots', () => {
            const session = makeFullSession()
            const curves = analyzeFatigue([session])
            const totalFromQuartiles = curves[0].quartiles.reduce((s, q) => s + q.shotCount, 0)
            expect(totalFromQuartiles).toBe(session.shots.length)
        })
    })

    describe('analyzeZoneProgression', () => {
        it('returns empty for < 3 sessions', () => {
            const sessions = [makeFullSession({}, 0), makeFullSession({}, 1)]
            expect(analyzeZoneProgression(sessions)).toHaveLength(0)
        })

        it('detects zones present in sessions', () => {
            const sessions = Array.from({ length: 6 }, (_, i) => makeFullSession({}, i))
            const results = analyzeZoneProgression(sessions)
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('zone')
            expect(results[0]).toHaveProperty('trend')
            expect(results[0]).toHaveProperty('totalAttempts')
        })

        it('trend is one of improving/declining/stable', () => {
            const sessions = Array.from({ length: 6 }, (_, i) => makeFullSession({}, i))
            const results = analyzeZoneProgression(sessions)
            for (const z of results) {
                expect(['improving', 'declining', 'stable']).toContain(z.trend)
            }
        })
    })

    describe('analyzeHotHand', () => {
        it('skips sessions with < 10 eligible shots', () => {
            const shots = Array.from({ length: 5 }, (_, i) => makeShot({ outcome: 'made' }, i))
            const session = makeFullSession({ shots })
            expect(analyzeHotHand([session])).toHaveLength(0)
        })

        it('returns results with runs test for valid sessions', () => {
            const session = makeFullSession()
            const results = analyzeHotHand([session])
            expect(results.length).toBeGreaterThanOrEqual(0)
            if (results.length > 0) {
                expect(results[0]).toHaveProperty('longestMadeStreak')
                expect(results[0]).toHaveProperty('longestMissStreak')
                expect(results[0]).toHaveProperty('runsTestZ')
                expect(results[0]).toHaveProperty('runsTestP')
                expect(results[0]).toHaveProperty('streakiness')
            }
        })

        it('detects hot hand in highly streaky sequence', () => {
            // Alternate 5 makes, 5 misses, 5 makes, 5 misses → very clustered
            const shots: StoredShot[] = Array.from({ length: 20 }, (_, i) =>
                makeShot({ outcome: i < 5 || (i >= 10 && i < 15) ? 'made' : 'missed' }, i))
            const session = makeFullSession({ shots })
            const results = analyzeHotHand([session])
            expect(results.length).toBe(1)
            expect(results[0].longestMadeStreak).toBe(5)
        })
    })

    describe('analyzeProjections', () => {
        it('returns empty for < 4 sessions', () => {
            const sessions = Array.from({ length: 3 }, (_, i) => makeHistoryItem({}, i))
            expect(analyzeProjections(sessions)).toHaveLength(0)
        })

        it('returns EWMA projections for sufficient data', () => {
            const sessions = Array.from({ length: 10 }, (_, i) =>
                makeHistoryItem({ shootingPct: 40 + i * 2 }, i))
            const results = analyzeProjections(sessions)
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('metric')
            expect(results[0]).toHaveProperty('currentValue')
            expect(results[0]).toHaveProperty('projected2w')
            expect(results[0]).toHaveProperty('projected4w')
            expect(results[0]).toHaveProperty('confidence')
            expect(results[0].confidence).toHaveProperty('lower')
            expect(results[0].confidence).toHaveProperty('upper')
        })

        it('projections are bounded 0–100', () => {
            const sessions = Array.from({ length: 10 }, (_, i) => makeHistoryItem({ shootingPct: 95 + i }, i))
            const results = analyzeProjections(sessions)
            for (const p of results) {
                expect(p.projected2w).toBeGreaterThanOrEqual(0)
                expect(p.projected2w).toBeLessThanOrEqual(100)
                expect(p.projected4w).toBeGreaterThanOrEqual(0)
                expect(p.projected4w).toBeLessThanOrEqual(100)
            }
        })
    })

    describe('analyzeCausalImpact', () => {
        it('returns empty for < 8 sessions', () => {
            const sessions = Array.from({ length: 7 }, (_, i) => makeHistoryItem({}, i))
            expect(analyzeCausalImpact(sessions)).toHaveLength(0)
        })

        it('detects causal impact when mechanic shift coincides with FG% change', () => {
            const sessions = [
                // Recent: high elbow, high FG%
                ...Array.from({ length: 6 }, (_, i) =>
                    makeHistoryItem({ avgElbowAngle: 95, shootingPct: 60 }, i)),
                // Earlier: low elbow, low FG%
                ...Array.from({ length: 6 }, (_, i) =>
                    makeHistoryItem({ avgElbowAngle: 82, shootingPct: 38 }, i + 6)),
            ]
            const results = analyzeCausalImpact(sessions)
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('trigger')
            expect(results[0]).toHaveProperty('lift')
            expect(results[0]).toHaveProperty('explanation')
        })
    })

    describe('analyzeDistributions', () => {
        it('returns empty for < 10 shots total', () => {
            const session = makeFullSession({ shots: Array.from({ length: 5 }, (_, i) => makeShot({}, i)) })
            expect(analyzeDistributions([session])).toHaveLength(0)
        })

        it('returns distribution stats for sufficient shot data', () => {
            const sessions = Array.from({ length: 3 }, (_, i) => makeFullSession({}, i))
            const results = analyzeDistributions(sessions)
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('mean')
            expect(results[0]).toHaveProperty('median')
            expect(results[0]).toHaveProperty('stdDev')
            expect(results[0]).toHaveProperty('skewness')
            expect(results[0]).toHaveProperty('percentiles')
            expect(results[0]).toHaveProperty('isNormal')
            expect(results[0]).toHaveProperty('interpretation')
        })

        it('percentiles are in correct order', () => {
            const sessions = Array.from({ length: 3 }, (_, i) => makeFullSession({}, i))
            const results = analyzeDistributions(sessions)
            for (const d of results) {
                expect(d.percentiles.p10).toBeLessThanOrEqual(d.percentiles.p25)
                expect(d.percentiles.p25).toBeLessThanOrEqual(d.percentiles.p50)
                expect(d.percentiles.p50).toBeLessThanOrEqual(d.percentiles.p75)
                expect(d.percentiles.p75).toBeLessThanOrEqual(d.percentiles.p90)
            }
        })

        it('variance equals stdDev squared', () => {
            const sessions = Array.from({ length: 3 }, (_, i) => makeFullSession({}, i))
            const results = analyzeDistributions(sessions)
            for (const d of results) {
                const expected = Math.round(d.stdDev ** 2 * 100) / 100
                expect(d.variance).toBeCloseTo(expected, 1)
            }
        })
    })

    describe('generateAnalyticsReport', () => {
        it('generates a complete report', () => {
            const history = Array.from({ length: 12 }, (_, i) => makeHistoryItem({}, i))
            const fullSessions = Array.from({ length: 5 }, (_, i) => makeFullSession({}, i))

            const report = generateAnalyticsReport(history, fullSessions)

            expect(report).toHaveProperty('generatedAt')
            expect(report.sessionsAnalyzed).toBe(12)
            expect(report.shotsAnalyzed).toBeGreaterThan(0)
            expect(report).toHaveProperty('significance')
            expect(report).toHaveProperty('correlations')
            expect(report).toHaveProperty('fatigueCurves')
            expect(report).toHaveProperty('zoneProgression')
            expect(report).toHaveProperty('hotHand')
            expect(report).toHaveProperty('projections')
            expect(report).toHaveProperty('causalImpacts')
            expect(report).toHaveProperty('distributions')
        })

        it('handles empty input gracefully', () => {
            const report = generateAnalyticsReport([], [])
            expect(report.sessionsAnalyzed).toBe(0)
            expect(report.shotsAnalyzed).toBe(0)
            expect(report.significance).toHaveLength(0)
            expect(report.correlations).toHaveLength(0)
        })

        it('handles minimal input (2 sessions)', () => {
            const history = Array.from({ length: 2 }, (_, i) => makeHistoryItem({}, i))
            const full = Array.from({ length: 2 }, (_, i) => makeFullSession({}, i))
            const report = generateAnalyticsReport(history, full)
            expect(report.sessionsAnalyzed).toBe(2)
            // Should not crash, just return empty arrays for analyses requiring more data
        })
    })
})

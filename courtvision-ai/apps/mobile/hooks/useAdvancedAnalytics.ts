/**
 * useAdvancedAnalytics — Hook for the data-science analytics engine.
 *
 * Fetches raw shot-level data from SessionStorageService and runs
 * the full AnalyticsEngine pipeline: significance testing, correlation
 * matrix, fatigue curves, zone progression, hot hand detection,
 * EWMA projections, causal impact, and distribution analysis.
 *
 * Cached in AsyncStorage with a 2-hour TTL to avoid repeated heavy
 * computation. Refresh triggered after each new session.
 */

import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SessionStorageService, type StoredSession, type SessionHistoryItem } from '../lib/sessionStorage'
import {
    generateAnalyticsReport,
    type FullAnalyticsReport,
    type SignificanceTest,
    type CorrelationResult,
    type FatigueCurve,
    type ZoneProgression,
    type HotHandResult,
    type EWMAProjection,
    type CausalImpact,
    type ShotDistribution,
} from '../lib/analyticsEngine'

// ── Cache ──────────────────────────────────────────────────────

const CACHE_KEY = '@courtvision_analytics_v1'
const CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours

interface CachedReport {
    report: FullAnalyticsReport
    generatedAt: number
}

// ── Summary Helpers ────────────────────────────────────────────

export interface AnalyticsSummary {
    /** Overall data quality: enough sessions + shots for reliable stats? */
    dataQuality: 'insufficient' | 'limited' | 'good' | 'excellent'
    /** Top statistically significant change (or null) */
    topSignificantChange: SignificanceTest | null
    /** Strongest mechanic/accuracy correlation */
    strongestCorrelation: CorrelationResult | null
    /** Average fatigue index across recent sessions */
    avgFatigueIndex: number
    /** Are they a streaky shooter? */
    shootingPattern: 'hot-hand' | 'cold-streaks' | 'random' | 'unknown'
    /** 2-week FG% projection with confidence bounds */
    fgProjection: EWMAProjection | null
    /** Most impactful causal mechanic change */
    topCausalImpact: CausalImpact | null
    /** Number of zones with improving trends */
    improvingZones: number
    /** Key human-readable takeaway */
    headline: string
}

function buildSummary(report: FullAnalyticsReport): AnalyticsSummary {
    const { significance, correlations, fatigueCurves, zoneProgression, hotHand, projections, causalImpacts } = report

    // Data quality
    const dq: AnalyticsSummary['dataQuality'] =
        report.sessionsAnalyzed < 3 ? 'insufficient' :
            report.sessionsAnalyzed < 6 ? 'limited' :
                report.sessionsAnalyzed < 15 ? 'good' : 'excellent'

    const topSig = significance.find(s => s.significant) ?? null
    const strongCorr = correlations.length > 0 ? correlations[0] : null
    const avgFatigue = fatigueCurves.length > 0
        ? Math.round(fatigueCurves.reduce((s, f) => s + f.fatigueIndex, 0) / fatigueCurves.length)
        : 0

    // Shooting pattern: majority vote across sessions
    const hotCount = hotHand.filter(h => h.streakiness === 'hot-hand').length
    const coldCount = hotHand.filter(h => h.streakiness === 'cold-streaks').length
    const randomCount = hotHand.filter(h => h.streakiness === 'random').length
    const shootingPattern: AnalyticsSummary['shootingPattern'] =
        hotHand.length === 0 ? 'unknown' :
            hotCount > randomCount && hotCount > coldCount ? 'hot-hand' :
                coldCount > randomCount ? 'cold-streaks' : 'random'

    const fgProj = projections.find(p => p.metric === 'FG%') ?? null
    const topCausal = causalImpacts.find(c => c.significant) ?? null
    const improvingZones = zoneProgression.filter(z => z.trend === 'improving').length

    // Build headline
    let headline = ''
    if (dq === 'insufficient') {
        headline = 'Need at least 3 sessions for meaningful analytics.'
    } else if (topSig && topSig.direction === 'improved') {
        headline = `Your ${topSig.metric} improved significantly (p=${topSig.pValue.toFixed(3)}).`
    } else if (topCausal) {
        headline = topCausal.explanation
    } else if (strongCorr && strongCorr.significant) {
        headline = strongCorr.interpretation
    } else if (fgProj) {
        headline = `Projected FG%: ${fgProj.projected2w}% in 2 weeks (±${(fgProj.confidence.upper - fgProj.confidence.lower).toFixed(1)}%).`
    } else {
        headline = 'Keep training — more data will unlock deeper insights.'
    }

    return {
        dataQuality: dq,
        topSignificantChange: topSig,
        strongestCorrelation: strongCorr,
        avgFatigueIndex: avgFatigue,
        shootingPattern,
        fgProjection: fgProj,
        topCausalImpact: topCausal,
        improvingZones,
        headline,
    }
}

// ── Hook ───────────────────────────────────────────────────────

export interface AdvancedAnalyticsState {
    report: FullAnalyticsReport | null
    summary: AnalyticsSummary | null
    loading: boolean
    sessionsAnalyzed: number
    shotsAnalyzed: number
    refresh: () => void
}

export function useAdvancedAnalytics(): AdvancedAnalyticsState {
    const [report, setReport] = useState<FullAnalyticsReport | null>(null)
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
    const [loading, setLoading] = useState(true)

    const compute = useCallback(async (force = false) => {
        setLoading(true)
        try {
            // Check cache
            if (!force) {
                const cached = await AsyncStorage.getItem(CACHE_KEY)
                if (cached) {
                    const parsed: CachedReport = JSON.parse(cached)
                    if (Date.now() - parsed.generatedAt < CACHE_TTL) {
                        setReport(parsed.report)
                        setSummary(buildSummary(parsed.report))
                        setLoading(false)
                        return
                    }
                }
            }

            const storage = SessionStorageService.getInstance()
            const history = await storage.getSessionHistory(50)
            if (history.length < 2) {
                setLoading(false)
                return
            }

            // Load full sessions (with raw shots) for the most recent 20
            const fullSessions = (await Promise.all(
                history.slice(0, 20).map(item => storage.getSession(item.id)),
            )).filter((s): s is StoredSession => s != null)

            const analyticsReport = generateAnalyticsReport(history, fullSessions)
            const analyticsSum = buildSummary(analyticsReport)

            setReport(analyticsReport)
            setSummary(analyticsSum)

            // Cache
            const cacheEntry: CachedReport = {
                report: analyticsReport,
                generatedAt: Date.now(),
            }
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry))
        } catch (e) {
            // Fail silently — analytics is non-critical
            console.warn('[AdvancedAnalytics] Error computing report:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        compute()
    }, [compute])

    const refresh = useCallback(() => compute(true), [compute])

    return {
        report,
        summary,
        loading,
        sessionsAnalyzed: report?.sessionsAnalyzed ?? 0,
        shotsAnalyzed: report?.shotsAnalyzed ?? 0,
        refresh,
    }
}

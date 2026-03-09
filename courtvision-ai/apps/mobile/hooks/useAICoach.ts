/**
 * useAICoach — Cross-session intelligence engine.
 *
 * Unlike the existing CoachingEngine (single-session post-mortem),
 * this hook analyzes the FULL training history to produce:
 *  1. Trend detection (improving/declining metrics)
 *  2. Personalized predictions ("You'll hit 55% in 2 weeks")
 *  3. Adaptive training plans (focus on weakest area)
 *  4. Pattern discovery ("You shoot 18% better mornings")
 *  5. Milestone alerts ("Personal best incoming!")
 *
 * Architecture:
 *  - Pure offline, no API needed
 *  - Reads from SessionStorageService
 *  - Cached in AsyncStorage (refreshed once/day or after new session)
 */

import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SessionStorageService, type SessionHistoryItem, type StoredSession } from '../lib/sessionStorage'
import {
    analyzeSignificance,
    analyzeCorrelations,
    analyzeHotHand,
    analyzeFatigue,
    analyzeCausalImpact,
    analyzeProjections,
} from '../lib/analyticsEngine'

// ── Types ───────────────────────────────────────────────────────

export type InsightType =
    | 'trend_up'       // metric improving
    | 'trend_down'     // metric declining
    | 'prediction'     // projected future stat
    | 'pattern'        // time/behavior pattern
    | 'record'         // new personal best
    | 'plan'           // adaptive training recommendation
    | 'milestone'      // approaching a milestone
    | 'significance'   // statistically significant change (p < 0.05)
    | 'correlation'    // mechanic ↔ accuracy relationship
    | 'causal'         // causal impact detected
    | 'hot_hand'       // streak detection
    | 'fatigue'        // within-session fatigue pattern
    | 'projection'     // EWMA-based projection with confidence

export interface CoachInsight {
    id: string
    type: InsightType
    icon: string
    title: string
    body: string
    /** 1 = highest */
    priority: number
    /** Which metric this is about (optional) */
    metric?: string
    /** Progress 0-100 towards a goal, if applicable */
    progress?: number
    /** Statistical confidence: p-value when available */
    pValue?: number
}

export interface AICoachState {
    insights: CoachInsight[]
    topInsight: CoachInsight | null
    loading: boolean
    sessionsAnalyzed: number
    refresh: () => Promise<void>
}

// ── Constants ───────────────────────────────────────────────────

const CACHE_KEY = '@courtvision_ai_coach'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

// ── Analysis Logic ──────────────────────────────────────────────

function splitWeeks(sessions: SessionHistoryItem[]): { thisWeek: SessionHistoryItem[]; lastWeek: SessionHistoryItem[]; older: SessionHistoryItem[] } {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)

    const lastMonday = new Date(monday)
    lastMonday.setDate(monday.getDate() - 7)

    const thisWeek: SessionHistoryItem[] = []
    const lastWeek: SessionHistoryItem[] = []
    const older: SessionHistoryItem[] = []

    for (const s of sessions) {
        const d = new Date(s.createdAt)
        if (d >= monday) thisWeek.push(s)
        else if (d >= lastMonday) lastWeek.push(s)
        else older.push(s)
    }
    return { thisWeek, lastWeek, older }
}

function avg(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

function linearProjection(values: number[], targetWeeks: number): number {
    if (values.length < 2) return values[0] ?? 0
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = avg(values)
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
        num += (i - xMean) * (values[i] - yMean)
        den += (i - xMean) ** 2
    }
    const slope = den === 0 ? 0 : num / den
    return yMean + slope * (n - 1 + targetWeeks)
}

function generateInsights(sessions: SessionHistoryItem[], fullSessions?: StoredSession[]): CoachInsight[] {
    if (sessions.length < 2) {
        return [{
            id: 'need-data',
            type: 'plan',
            icon: '🏀',
            title: 'Train to unlock AI insights',
            body: 'Complete 2+ sessions for your personal AI coach to activate. Every shot teaches the algorithm about your game.',
            priority: 1,
        }]
    }

    const insights: CoachInsight[] = []
    const { thisWeek, lastWeek } = splitWeeks(sessions)

    // Recent 5 vs previous 5 for trend detection
    const recent5 = sessions.slice(0, Math.min(5, sessions.length))
    const prev5 = sessions.slice(5, Math.min(10, sessions.length))

    // ──────────────── TREND DETECTION ────────────────

    if (prev5.length >= 2) {
        const recentFG = avg(recent5.map(s => s.shootingPct))
        const prevFG = avg(prev5.map(s => s.shootingPct))
        const fgDelta = recentFG - prevFG

        if (fgDelta > 3) {
            insights.push({
                id: 'trend-fg-up',
                type: 'trend_up',
                icon: '📈',
                title: `Shooting up ${Math.abs(fgDelta).toFixed(1)}%`,
                body: `Your FG% improved from ${prevFG.toFixed(1)}% to ${recentFG.toFixed(1)}% over recent sessions. Your adjustments are paying off.`,
                priority: 2,
                metric: 'shootingPct',
            })
        } else if (fgDelta < -3) {
            insights.push({
                id: 'trend-fg-down',
                type: 'trend_down',
                icon: '📉',
                title: `Shooting dipped ${Math.abs(fgDelta).toFixed(1)}%`,
                body: `Your FG% dropped from ${prevFG.toFixed(1)}% to ${recentFG.toFixed(1)}%. Check your elbow angle and follow-through — they may have shifted.`,
                priority: 1,
                metric: 'shootingPct',
            })
        }

        const recentPosture = avg(recent5.map(s => s.avgPostureQuality))
        const prevPosture = avg(prev5.map(s => s.avgPostureQuality))
        const postureDelta = recentPosture - prevPosture

        if (postureDelta > 5) {
            insights.push({
                id: 'trend-posture-up',
                type: 'trend_up',
                icon: '🧍',
                title: 'Posture improving',
                body: `Your posture quality jumped +${postureDelta.toFixed(0)} pts. Your body alignment is becoming more consistent.`,
                priority: 3,
                metric: 'posture',
            })
        } else if (postureDelta < -5) {
            insights.push({
                id: 'trend-posture-down',
                type: 'trend_down',
                icon: '⚠️',
                title: 'Posture drifting',
                body: `Your posture quality dropped ${Math.abs(postureDelta).toFixed(0)} pts. Focus on your base — bend your knees and align your shoulder.`,
                priority: 1,
                metric: 'posture',
            })
        }

        const recentConsistency = avg(recent5.map(s => s.mechanicConsistency))
        const prevConsistency = avg(prev5.map(s => s.mechanicConsistency))
        const consDelta = recentConsistency - prevConsistency

        if (Math.abs(consDelta) > 4) {
            insights.push({
                id: consDelta > 0 ? 'trend-cons-up' : 'trend-cons-down',
                type: consDelta > 0 ? 'trend_up' : 'trend_down',
                icon: consDelta > 0 ? '📐' : '🎲',
                title: consDelta > 0 ? 'Getting more consistent' : 'Mechanics vary more',
                body: consDelta > 0
                    ? `Your mechanic consistency rose by ${consDelta.toFixed(0)} pts. You're building muscle memory.`
                    : `Your mechanic consistency dropped ${Math.abs(consDelta).toFixed(0)} pts. Try slowing down and focusing on form over volume.`,
                priority: consDelta > 0 ? 3 : 2,
                metric: 'consistency',
            })
        }
    }

    // ──────────────── PREDICTIONS ────────────────

    if (sessions.length >= 4) {
        // Weekly averages for projection
        const weeklyFGs: number[] = []
        for (let i = 0; i < sessions.length; i += 3) {
            const chunk = sessions.slice(i, i + 3)
            weeklyFGs.push(avg(chunk.map(s => s.shootingPct)))
        }
        weeklyFGs.reverse()

        const projected2w = linearProjection(weeklyFGs, 2)
        const currentAvg = avg(sessions.slice(0, 3).map(s => s.shootingPct))

        if (projected2w > currentAvg + 2 && projected2w <= 100) {
            insights.push({
                id: 'predict-fg',
                type: 'prediction',
                icon: '🔮',
                title: `On track for ${Math.round(projected2w)}% FG`,
                body: `At your current improvement rate, you could hit ${Math.round(projected2w)}% FG within 2 weeks. Keep training consistently.`,
                priority: 2,
                metric: 'shootingPct',
                progress: Math.min(100, Math.round((currentAvg / projected2w) * 100)),
            })
        }
    }

    // ──────────────── PATTERN DISCOVERY ────────────────

    if (sessions.length >= 4) {
        const morning: number[] = []
        const evening: number[] = []
        for (const s of sessions) {
            const hour = new Date(s.createdAt).getHours()
            if (hour < 14) morning.push(s.shootingPct)
            else evening.push(s.shootingPct)
        }
        if (morning.length >= 2 && evening.length >= 2) {
            const mornAvg = avg(morning)
            const eveAvg = avg(evening)
            const diff = Math.abs(mornAvg - eveAvg)
            if (diff > 5) {
                const better = mornAvg > eveAvg ? 'morning' : 'afternoon/evening'
                const betterPct = Math.max(mornAvg, eveAvg).toFixed(1)
                const worsePct = Math.min(mornAvg, eveAvg).toFixed(1)
                insights.push({
                    id: 'pattern-time',
                    type: 'pattern',
                    icon: better === 'morning' ? '🌅' : '🌆',
                    title: `You shoot ${diff.toFixed(0)}% better in the ${better}`,
                    body: `${better === 'morning' ? 'Morning' : 'Evening'} sessions: ${betterPct}% FG vs ${worsePct}%. Try scheduling your most important training in the ${better}.`,
                    priority: 3,
                    metric: 'shootingPct',
                })
            }
        }
    }

    // Volume pattern
    if (sessions.length >= 4) {
        const lowVol: number[] = []
        const highVol: number[] = []
        const medianShots = sessions.map(s => s.totalShots).sort((a, b) => a - b)[Math.floor(sessions.length / 2)]
        for (const s of sessions) {
            if (s.totalShots <= medianShots) lowVol.push(s.shootingPct)
            else highVol.push(s.shootingPct)
        }
        if (lowVol.length >= 2 && highVol.length >= 2) {
            const lowAvg = avg(lowVol)
            const highAvg = avg(highVol)
            const diff = lowAvg - highAvg
            if (diff > 5) {
                insights.push({
                    id: 'pattern-volume',
                    type: 'pattern',
                    icon: '🎯',
                    title: 'Quality over quantity',
                    body: `You shoot ${diff.toFixed(0)}% better in shorter sessions (${lowAvg.toFixed(1)}% vs ${highAvg.toFixed(1)}%). Consider splitting long sessions into focused blocks.`,
                    priority: 3,
                })
            } else if (diff < -5) {
                insights.push({
                    id: 'pattern-warmup',
                    type: 'pattern',
                    icon: '🔥',
                    title: 'You warm up into it',
                    body: `Longer sessions yield ${Math.abs(diff).toFixed(0)}% better accuracy (${highAvg.toFixed(1)}% vs ${lowAvg.toFixed(1)}%). You need volume to find your rhythm.`,
                    priority: 3,
                })
            }
        }
    }

    // ──────────────── PERSONAL RECORDS ────────────────

    if (sessions.length >= 3) {
        const latest = sessions[0]
        const bestFG = Math.max(...sessions.map(s => s.shootingPct))
        const bestScore = Math.max(...sessions.map(s => s.overallScore))

        if (latest.shootingPct === bestFG && latest.totalShots >= 10) {
            insights.push({
                id: 'record-fg',
                type: 'record',
                icon: '🏆',
                title: 'New personal best FG%!',
                body: `${latest.shootingPct.toFixed(1)}% — your highest shooting percentage ever. This is what consistency looks like.`,
                priority: 1,
            })
        } else if (bestFG - latest.shootingPct < 3 && latest.totalShots >= 10) {
            insights.push({
                id: 'near-record-fg',
                type: 'milestone',
                icon: '🎯',
                title: `${(bestFG - latest.shootingPct).toFixed(1)}% from your record`,
                body: `Your best is ${bestFG.toFixed(1)}% FG. You were so close last session — one more make and you'd have it.`,
                priority: 2,
                progress: Math.round((latest.shootingPct / bestFG) * 100),
            })
        }

        if (latest.overallScore === bestScore) {
            insights.push({
                id: 'record-score',
                type: 'record',
                icon: '⭐',
                title: 'Best overall score!',
                body: `Overall score ${latest.overallScore}/100 — your most complete session combining accuracy, form, and consistency.`,
                priority: 1,
            })
        }
    }

    // ──────────────── WEEK-OVER-WEEK ────────────────

    if (thisWeek.length > 0 && lastWeek.length > 0) {
        const twFG = avg(thisWeek.map(s => s.shootingPct))
        const lwFG = avg(lastWeek.map(s => s.shootingPct))
        const wowDelta = twFG - lwFG

        if (Math.abs(wowDelta) > 2) {
            insights.push({
                id: 'wow-fg',
                type: wowDelta > 0 ? 'trend_up' : 'trend_down',
                icon: wowDelta > 0 ? '📊' : '📉',
                title: `This week: ${wowDelta > 0 ? '+' : ''}${wowDelta.toFixed(1)}% vs last week`,
                body: `This week: ${twFG.toFixed(1)}% FG (${thisWeek.length} sessions) vs last week: ${lwFG.toFixed(1)}% (${lastWeek.length} sessions).`,
                priority: 2,
            })
        }

        if (thisWeek.length > lastWeek.length) {
            insights.push({
                id: 'wow-volume',
                type: 'trend_up',
                icon: '💪',
                title: 'Training more this week',
                body: `${thisWeek.length} sessions so far this week vs ${lastWeek.length} last week. Consistency is the #1 predictor of improvement.`,
                priority: 4,
            })
        }
    }

    // ──────────────── ADAPTIVE PLAN ────────────────

    if (sessions.length >= 3) {
        const recent = sessions.slice(0, 5)
        const avgFT = avg(recent.map(s => s.followThroughPct))
        const avgElbow = avg(recent.map(s => s.avgElbowAngle))
        const avgConsistency = avg(recent.map(s => s.mechanicConsistency))
        const avgFG = avg(recent.map(s => s.shootingPct))

        // Find weakest area
        const areas = [
            { key: 'follow-through', score: avgFT, threshold: 75, drill: 'Hold your finish ("gooseneck") for 2 seconds after every shot. 20 form shots before each session.' },
            { key: 'elbow-alignment', score: 100 - Math.abs(avgElbow - 93), threshold: 85, drill: 'Wall elbow drills: stand against a wall, elbow at 90°, flick wrist. 3 sets of 15.' },
            { key: 'consistency', score: avgConsistency, threshold: 70, drill: 'Same-spot repetitions: 30 shots from one spot, same routine every time. Slow is smooth, smooth is fast.' },
            { key: 'accuracy', score: avgFG, threshold: 45, drill: 'Close-range form shooting: start at 3 feet, make 5 in a row before stepping back. Build confidence.' },
        ]

        const weakest = areas.sort((a, b) => a.score - b.score)[0]
        if (weakest.score < weakest.threshold) {
            insights.push({
                id: 'plan-focus',
                type: 'plan',
                icon: '🗺️',
                title: `Focus area: ${weakest.key}`,
                body: weakest.drill,
                priority: 2,
                metric: weakest.key,
                progress: Math.round((weakest.score / weakest.threshold) * 100),
            })
        }
    }

    // ──────────────── MILESTONES ────────────────

    const totalShots = sessions.reduce((s, session) => s + session.totalShots, 0)
    const milestones = [100, 250, 500, 1000, 2500, 5000, 10000]
    for (const m of milestones) {
        if (totalShots < m && totalShots >= m * 0.8) {
            insights.push({
                id: `milestone-${m}`,
                type: 'milestone',
                icon: '🎖️',
                title: `${m - totalShots} shots to ${m.toLocaleString()} lifetime`,
                body: `You've taken ${totalShots.toLocaleString()} shots total. Only ${m - totalShots} more to reach the ${m.toLocaleString()} milestone!`,
                priority: 4,
                progress: Math.round((totalShots / m) * 100),
            })
            break
        }
    }

    // ──────────────── ANALYTICS ENGINE (data-science layer) ────────────────

    // Significance tests — real p-values
    const sigTests = analyzeSignificance(sessions)
    for (const sig of sigTests.filter(s => s.significant).slice(0, 2)) {
        const dir = sig.direction === 'improved' ? '📈' : sig.direction === 'declined' ? '📉' : '➡️'
        insights.push({
            id: `sig-${sig.metric}`,
            type: 'significance',
            icon: dir,
            title: `${sig.metric}: ${sig.direction} (p=${sig.pValue.toFixed(3)})`,
            body: `Statistically verified: your ${sig.metric} shifted from ${sig.periodB.mean.toFixed(1)} → ${sig.periodA.mean.toFixed(1)} (effect size d=${sig.effectSize.toFixed(2)}). This is NOT noise.`,
            priority: 1,
            metric: sig.metric,
            pValue: sig.pValue,
        })
    }

    // Correlation insights
    const corrs = analyzeCorrelations(sessions)
    const topCorr = corrs.find(c => c.significant && Math.abs(c.r) >= 0.4)
    if (topCorr) {
        insights.push({
            id: `corr-${topCorr.metricA}`,
            type: 'correlation',
            icon: '🔗',
            title: `${topCorr.metricA} drives your accuracy (r=${topCorr.r.toFixed(2)})`,
            body: topCorr.interpretation,
            priority: 2,
            metric: topCorr.metricA,
            pValue: topCorr.pValue,
        })
    }

    // Causal impact
    const causal = analyzeCausalImpact(sessions)
    const topCausal = causal.find(c => c.significant)
    if (topCausal) {
        insights.push({
            id: `causal-${topCausal.trigger}`,
            type: 'causal',
            icon: '⚡',
            title: `${topCausal.trigger} → ${topCausal.lift > 0 ? '+' : ''}${topCausal.lift.toFixed(1)}% FG`,
            body: topCausal.explanation,
            priority: 1,
            pValue: topCausal.pValue,
        })
    }

    // EWMA projections
    const projections = analyzeProjections(sessions)
    const fgProj = projections.find(p => p.metric === 'FG%')
    if (fgProj && fgProj.trendStrength > 0.3) {
        insights.push({
            id: 'ewma-fg',
            type: 'projection',
            icon: '🎯',
            title: `Projected: ${fgProj.projected2w}% FG in 2 weeks`,
            body: `EWMA model (95% CI: ${fgProj.confidence.lower}–${fgProj.confidence.upper}%). Momentum: ${fgProj.momentum > 0 ? 'accelerating' : fgProj.momentum < 0 ? 'decelerating' : 'steady'}. Trend strength: ${(fgProj.trendStrength * 100).toFixed(0)}%.`,
            priority: 2,
            metric: 'shootingPct',
            progress: Math.min(100, Math.round((fgProj.currentValue / fgProj.projected2w) * 100)),
        })
    }

    // Hot hand & fatigue (need full sessions)
    if (fullSessions && fullSessions.length > 0) {
        const hotHandResults = analyzeHotHand(fullSessions)
        const streaky = hotHandResults.filter(h => h.isStreaky)
        if (streaky.length > 0) {
            const hotCount = streaky.filter(h => h.streakiness === 'hot-hand').length
            const coldCount = streaky.filter(h => h.streakiness === 'cold-streaks').length
            const pattern = hotCount > coldCount ? 'hot-hand' : 'cold-streaks'
            const best = hotHandResults.reduce((a, b) => a.longestMadeStreak > b.longestMadeStreak ? a : b)
            insights.push({
                id: 'hot-hand',
                type: 'hot_hand',
                icon: pattern === 'hot-hand' ? '🔥' : '🧊',
                title: pattern === 'hot-hand'
                    ? `Hot Hand confirmed (${hotCount}/${hotHandResults.length} sessions)`
                    : `Cold streak pattern detected`,
                body: pattern === 'hot-hand'
                    ? `Runs test confirms non-random streaks. Your longest make streak: ${best.longestMadeStreak}. When you're hot, keep shooting — it's statistically real.`
                    : `You tend to go on miss streaks. When you miss 3+, take a breath and reset your routine. Your longest cold streak: ${best.longestMissStreak}.`,
                priority: 2,
                pValue: streaky[0].runsTestP,
            })
        }

        const fatigueCurves = analyzeFatigue(fullSessions)
        const highFatigue = fatigueCurves.filter(f => f.fatigueIndex > 20)
        if (highFatigue.length > fatigueCurves.length / 2 && fatigueCurves.length >= 3) {
            const avgFI = Math.round(highFatigue.reduce((s, f) => s + f.fatigueIndex, 0) / highFatigue.length)
            const avgDrop = highFatigue.filter(f => f.dropOffPoint !== null)
            const dropQ = avgDrop.length > 0
                ? Math.round(avgDrop.reduce((s, f) => s + (f.dropOffPoint ?? 0), 0) / avgDrop.length) + 1
                : null
            insights.push({
                id: 'fatigue',
                type: 'fatigue',
                icon: '🔋',
                title: `Fatigue detected (index: ${avgFI}/100)`,
                body: dropQ
                    ? `Your accuracy typically drops in Q${dropQ} of sessions. Consider shorter, more focused sessions or taking a 2-minute break at the ${(dropQ - 1) * 25}% mark.`
                    : `Your late-session accuracy drops consistently. Try splitting long sessions into 2 focused blocks with a break.`,
                priority: 2,
            })
        }
    }

    return insights.sort((a, b) => a.priority - b.priority)
}

// ── Hook ────────────────────────────────────────────────────────

export function useAICoach(): AICoachState {
    const [insights, setInsights] = useState<CoachInsight[]>([])
    const [loading, setLoading] = useState(true)
    const [sessionsAnalyzed, setSessionsAnalyzed] = useState(0)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            // Check cache
            const cached = await AsyncStorage.getItem(CACHE_KEY)
            if (cached) {
                const { insights: cachedInsights, timestamp, count } = JSON.parse(cached)
                if (Date.now() - timestamp < CACHE_TTL_MS) {
                    setInsights(cachedInsights)
                    setSessionsAnalyzed(count)
                    setLoading(false)
                    return
                }
            }

            const storage = SessionStorageService.getInstance()
            const history = await storage.getSessionHistory(100)
            setSessionsAnalyzed(history.length)

            // Load full sessions (with raw shots) for shot-level analytics
            const fullSessions: StoredSession[] = []
            for (const item of history.slice(0, 15)) {
                const full = await storage.getSession(item.id)
                if (full) fullSessions.push(full)
            }

            const generated = generateInsights(history, fullSessions)
            setInsights(generated)

            // Cache result
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                insights: generated,
                timestamp: Date.now(),
                count: history.length,
            }))
        } catch (err) {
            console.warn('[AICoach] Error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [])

    return {
        insights,
        topInsight: insights[0] ?? null,
        loading,
        sessionsAnalyzed,
        refresh,
    }
}

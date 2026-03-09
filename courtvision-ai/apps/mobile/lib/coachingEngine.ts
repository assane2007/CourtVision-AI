/**
 * CoachingEngine — Moteur de coaching intelligent post-session.
 *
 * Génère des recommandations personnalisées basées sur :
 * - Les métriques de la session actuelle
 * - L'historique des sessions précédentes
 * - Les données biomécaniques NBA de référence
 * - Les tendances détectées par le pipeline IA
 *
 * Produit :
 * - Un diagnostic clair (forces + faiblesses)
 * - Des exercices ciblés (drills)
 * - Un plan d'amélioration prioritaire
 * - Des comparaisons NBA réalistes
 *
 * Architecture :
 * - Fonctionne entièrement offline (pas de LLM nécessaire)
 * - Peut être enrichi par un appel LLM optionnel pour le texte
 */

import type { SessionRealtimeStats, DetectedShot } from './realtimeAIService'

// ==========================================
// Types
// ==========================================

export interface CoachingInsight {
    id: string
    category: 'strength' | 'weakness' | 'trend' | 'milestone'
    icon: string
    title: string
    description: string
    priority: number // 1 = highest
    metric?: string
    currentValue?: number
    targetValue?: number
    nbaReference?: string
}

export interface DrillRecommendation {
    id: string
    name: string
    description: string
    duration: string
    difficulty: 'easy' | 'medium' | 'hard'
    targetMetric: string
    icon: string
    steps: string[]
}

export interface CoachingReport {
    /** Grade global de la session (A+ à F) */
    grade: string
    /** Score numérique 0-100 */
    score: number
    /** One-line summary */
    headline: string
    /** Detailed diagnosis */
    insights: CoachingInsight[]
    /** Recommended drills */
    drills: DrillRecommendation[]
    /** Priority focus for next session */
    nextSessionFocus: string
    /** NBA comparison */
    nbaComparison: {
        closestPlayer: string
        similarity: number
        keyDifference: string
    }
    /** Motivational message */
    motivationMessage: string
}

// ==========================================
// NBA Reference Data (2023-24 Season)
// ==========================================

const NBA_BENCHMARKS = {
    eliteElbowAngle: { min: 88, max: 98, ideal: 93 },
    eliteReleaseHeight: { min: 1.10, max: 1.20, ideal: 1.15 },
    eliteReleaseTime: { min: 0.35, max: 0.50, ideal: 0.42 },
    elitePostureQuality: 85,
    eliteFollowThrough: 92,
    eliteConsistency: 85,
    eliteFgPct: 47.2,
    // League averages
    avgElbowAngle: 100,
    avgReleaseHeight: 1.08,
    avgReleaseTime: 0.52,
    avgPostureQuality: 62,
    avgFgPct: 37.6,
}

const NBA_PLAYER_COMPARISONS = [
    { name: 'Stephen Curry', elbowAngle: 91, releaseTime: 0.38, releaseHeight: 1.18, fgPct: 42.7, style: 'Quick release, deep range' },
    { name: 'Klay Thompson', elbowAngle: 93, releaseTime: 0.42, releaseHeight: 1.15, fgPct: 41.3, style: 'Textbook form, catch-and-shoot' },
    { name: 'Devin Booker', elbowAngle: 95, releaseTime: 0.44, releaseHeight: 1.14, fgPct: 49.2, style: 'Mid-range master, smooth release' },
    { name: 'Luka Doncic', elbowAngle: 98, releaseTime: 0.48, releaseHeight: 1.12, fgPct: 48.7, style: 'Step-back specialist, high arc' },
    { name: 'Kevin Durant', elbowAngle: 96, releaseTime: 0.45, releaseHeight: 1.22, fgPct: 52.3, style: 'Elevated release, unguardable' },
    { name: 'Jayson Tatum', elbowAngle: 94, releaseTime: 0.43, releaseHeight: 1.16, fgPct: 47.1, style: 'All-around scorer' },
    { name: 'Damian Lillard', elbowAngle: 92, releaseTime: 0.39, releaseHeight: 1.13, fgPct: 42.4, style: 'Logo range, ultra quick' },
    { name: 'Kyrie Irving', elbowAngle: 93, releaseTime: 0.41, releaseHeight: 1.11, fgPct: 49.7, style: 'Artistic scorer, creative finisher' },
]

// ==========================================
// Drill Library
// ==========================================

const DRILL_LIBRARY: DrillRecommendation[] = [
    {
        id: 'form_shooting',
        name: 'Form Shooting (Close Range)',
        description: 'Work on your basic mechanics from 1-2m range. Focus on 90° elbow and follow-through.',
        duration: '5 min',
        difficulty: 'easy',
        targetMetric: 'elbowAngle',
        icon: '🎯',
        steps: [
            'Stand 1m from the basket',
            'One-hand shooting (strong hand only)',
            '10 shots, focus on 90° elbow angle',
            'Add your guide hand for 10 more shots',
            'Step back to 2m and repeat',
        ],
    },
    {
        id: 'release_speed',
        name: 'Quick Release Drill',
        description: 'Speed up your release by catching and shooting as fast as possible.',
        duration: '8 min',
        difficulty: 'medium',
        targetMetric: 'releaseTime',
        icon: '⚡',
        steps: [
            'Set up 3 spots at the elbow and wings',
            'Have a partner pass you the ball',
            'Catch and shoot in < 0.5 seconds',
            '5 shots per spot, 3 rotations',
            'Time each shot if possible',
        ],
    },
    {
        id: 'arc_height',
        name: 'High Arc Training',
        description: 'Increase your shot arc for a better entry angle into the rim.',
        duration: '7 min',
        difficulty: 'medium',
        targetMetric: 'releaseHeight',
        icon: '🌈',
        steps: [
            'Shoot from the elbow (free-throw line)',
            'Aim at the top of the square on the backboard',
            'Exaggerate the arc — the ball should go really high',
            'Gradually return to a natural but elevated arc',
            '20 shots total',
        ],
    },
    {
        id: 'follow_through',
        name: 'Gooseneck Follow-Through',
        description: 'Hold your follow-through ("gooseneck") after every shot.',
        duration: '5 min',
        difficulty: 'easy',
        targetMetric: 'followThrough',
        icon: '🦢',
        steps: [
            'Shoot from the free-throw line',
            'After each shot, FREEZE your hand in the air',
            'Hold the position for 2 seconds',
            'Check: wrist snapped, fingers toward the rim',
            '15 shots focusing on follow-through',
        ],
    },
    {
        id: 'consistency_drill',
        name: 'Consistency Sets',
        description: 'Shoot identical sets to improve your mechanical consistency.',
        duration: '10 min',
        difficulty: 'hard',
        targetMetric: 'consistency',
        icon: '📐',
        steps: [
            'Pick ONE fixed spot',
            'Shoot 10 consecutive shots',
            'Goal: same mechanics on every shot',
            'Mentally note the shot that felt most different',
            'Repeat 3 sets of 10 shots',
        ],
    },
    {
        id: 'knee_flexion',
        name: 'Lower Body Power',
        description: 'Improve your lower body power for a smoother shot.',
        duration: '6 min',
        difficulty: 'medium',
        targetMetric: 'kneeFlexion',
        icon: '🦵',
        steps: [
            'Bodyweight squats (10 reps, 90° flex)',
            'Shoot with focus on knee bend',
            'Jump shots with exaggerated lift',
            'Shoot 10x counting "1-2-UP"',
            'Compare power with/without knee flex',
        ],
    },
    {
        id: 'spot_shooting',
        name: '5-Spot Challenge',
        description: 'Shoot from 5 spots around the court to diversify your zones.',
        duration: '10 min',
        difficulty: 'hard',
        targetMetric: 'zoneVariety',
        icon: '🏀',
        steps: [
            'Place 5 markers: left corner, left wing, top, right wing, right corner',
            'Shoot 5x from each spot',
            'Track your % per spot',
            'Go back to your 2 worst spots for 5 more shots',
            'Goal: 60%+ from everywhere',
        ],
    },
]

// ==========================================
// Coaching Engine
// ==========================================

export class CoachingEngine {
    /**
     * Generates a complete coaching report for a session.
     */
    generateReport(
        stats: SessionRealtimeStats,
        shots: DetectedShot[],
        previousSessions?: SessionRealtimeStats[],
    ): CoachingReport {
        const grade = this.computeGrade(stats)
        const score = this.computeScore(stats)
        const insights = this.generateInsights(stats, shots, previousSessions)
        const drills = this.recommendDrills(stats, shots)
        const nbaComp = this.findNBAComparison(stats)
        const headline = this.generateHeadline(stats, grade)
        const focus = this.determineNextFocus(insights)
        const motivation = this.generateMotivation(stats, grade)

        return {
            grade,
            score,
            headline,
            insights,
            drills: drills.slice(0, 3), // Top 3 drills
            nextSessionFocus: focus,
            nbaComparison: nbaComp,
            motivationMessage: motivation,
        }
    }

    // ---- Grade Computation ----

    private computeGrade(stats: SessionRealtimeStats): string {
        const score = this.computeScore(stats)
        if (score >= 95) return 'A+'
        if (score >= 90) return 'A'
        if (score >= 85) return 'A-'
        if (score >= 80) return 'B+'
        if (score >= 75) return 'B'
        if (score >= 70) return 'B-'
        if (score >= 65) return 'C+'
        if (score >= 60) return 'C'
        if (score >= 55) return 'C-'
        if (score >= 50) return 'D+'
        if (score >= 45) return 'D'
        return 'F'
    }

    private computeScore(stats: SessionRealtimeStats): number {
        // Score composed of multiple metrics
        const fgScore = Math.min(100, (stats.shootingPct / NBA_BENCHMARKS.eliteFgPct) * 100) * 0.30
        const elbowScore = this.scoreMetric(stats.avgElbowAngle, NBA_BENCHMARKS.eliteElbowAngle.ideal, 15) * 0.15
        const releaseTimeScore = this.scoreMetric(stats.avgReleaseTime, NBA_BENCHMARKS.eliteReleaseTime.ideal, 0.15) * 0.15
        const releaseHeightScore = this.scoreMetric(stats.avgReleaseHeight, NBA_BENCHMARKS.eliteReleaseHeight.ideal, 0.15) * 0.10
        const postureScore = Math.min(100, stats.avgPostureQuality / NBA_BENCHMARKS.elitePostureQuality * 100) * 0.10
        const ftScore = Math.min(100, stats.followThroughPct / NBA_BENCHMARKS.eliteFollowThrough * 100) * 0.10
        const consistencyScore = Math.min(100, stats.mechanicConsistency / NBA_BENCHMARKS.eliteConsistency * 100) * 0.10

        return Math.round(fgScore + elbowScore + releaseTimeScore + releaseHeightScore + postureScore + ftScore + consistencyScore)
    }

    private scoreMetric(value: number, ideal: number, tolerance: number): number {
        const deviation = Math.abs(value - ideal)
        return Math.max(0, Math.min(100, 100 - (deviation / tolerance) * 100))
    }

    // ---- Insights Generation ----

    private generateInsights(
        stats: SessionRealtimeStats,
        shots: DetectedShot[],
        previousSessions?: SessionRealtimeStats[],
    ): CoachingInsight[] {
        const insights: CoachingInsight[] = []

        // ---- Strengths ----
        if (stats.shootingPct >= 50) {
            insights.push({
                id: 'high_fg', category: 'strength', icon: '🔥',
                title: 'Shooting on Fire',
                description: `${stats.shootingPct}% FG — you're above the NBA average (${NBA_BENCHMARKS.avgFgPct}%).`,
                priority: 2, metric: 'fgPct', currentValue: stats.shootingPct,
            })
        }

        if (stats.avgElbowAngle >= NBA_BENCHMARKS.eliteElbowAngle.min && stats.avgElbowAngle <= NBA_BENCHMARKS.eliteElbowAngle.max) {
            insights.push({
                id: 'elite_elbow', category: 'strength', icon: '💪',
                title: 'NBA-Level Elbow Angle',
                description: `Your average angle of ${stats.avgElbowAngle.toFixed(1)}° is in the NBA elite zone (${NBA_BENCHMARKS.eliteElbowAngle.min}-${NBA_BENCHMARKS.eliteElbowAngle.max}°).`,
                priority: 3, metric: 'elbowAngle', currentValue: stats.avgElbowAngle, targetValue: NBA_BENCHMARKS.eliteElbowAngle.ideal,
            })
        }

        if (stats.avgReleaseTime <= 0.45) {
            insights.push({
                id: 'quick_release', category: 'strength', icon: '⚡',
                title: 'Quick Release',
                description: `${stats.avgReleaseTime.toFixed(2)}s — comparable to the best NBA shooters.`,
                priority: 3, metric: 'releaseTime', currentValue: stats.avgReleaseTime,
                nbaReference: 'Curry: 0.38s, Thompson: 0.42s',
            })
        }

        if (stats.followThroughPct >= 90) {
            insights.push({
                id: 'great_ft', category: 'strength', icon: '🦢',
                title: 'Excellent Follow-Through',
                description: `${stats.followThroughPct.toFixed(0)}% of your shots had proper follow-through. Elite discipline.`,
                priority: 4, metric: 'followThrough', currentValue: stats.followThroughPct,
            })
        }

        if (stats.mechanicConsistency >= 80) {
            insights.push({
                id: 'consistent', category: 'strength', icon: '📐',
                title: 'Highly Consistent Mechanics',
                description: `Consistency score of ${stats.mechanicConsistency}/100 — your repeatability is your strength.`,
                priority: 3, metric: 'consistency', currentValue: stats.mechanicConsistency,
            })
        }

        // ---- Weaknesses ----
        if (stats.avgElbowAngle > 105) {
            insights.push({
                id: 'wide_elbow', category: 'weakness', icon: '⚠️',
                title: 'Elbow Too Wide',
                description: `Your average angle of ${stats.avgElbowAngle.toFixed(1)}° is too wide. Aim for ${NBA_BENCHMARKS.eliteElbowAngle.ideal}° for better accuracy.`,
                priority: 1, metric: 'elbowAngle', currentValue: stats.avgElbowAngle, targetValue: NBA_BENCHMARKS.eliteElbowAngle.ideal,
            })
        }

        if (stats.avgReleaseTime > 0.55) {
            insights.push({
                id: 'slow_release', category: 'weakness', icon: '🐌',
                title: 'Release Too Slow',
                description: `${stats.avgReleaseTime.toFixed(2)}s — you're losing time and can get blocked. Target: < 0.50s.`,
                priority: 1, metric: 'releaseTime', currentValue: stats.avgReleaseTime, targetValue: 0.45,
            })
        }

        if (stats.avgReleaseHeight < 1.05) {
            insights.push({
                id: 'low_release', category: 'weakness', icon: '📉',
                title: 'Low Release Point',
                description: `Release at ${stats.avgReleaseHeight.toFixed(2)}x your height — you're shooting too low. Target: > 1.10x.`,
                priority: 2, metric: 'releaseHeight', currentValue: stats.avgReleaseHeight, targetValue: 1.12,
            })
        }

        if (stats.followThroughPct < 60) {
            insights.push({
                id: 'bad_ft', category: 'weakness', icon: '❌',
                title: 'Insufficient Follow-Through',
                description: `Only ${stats.followThroughPct.toFixed(0)}% follow-through. Hold your hand up after every shot.`,
                priority: 1, metric: 'followThrough', currentValue: stats.followThroughPct, targetValue: 85,
            })
        }

        if (stats.mechanicConsistency < 50) {
            insights.push({
                id: 'inconsistent', category: 'weakness', icon: '🎲',
                title: 'Inconsistent Mechanics',
                description: `Score of ${stats.mechanicConsistency}/100 — every shot is different. Focus on repetition.`,
                priority: 1, metric: 'consistency', currentValue: stats.mechanicConsistency, targetValue: 75,
            })
        }

        if (stats.shootingPct < 35 && stats.totalShots >= 5) {
            insights.push({
                id: 'low_fg', category: 'weakness', icon: '📊',
                title: 'Accuracy Needs Work',
                description: `${stats.shootingPct}% FG on ${stats.totalShots} attempts. Work on fundamentals.`,
                priority: 1, metric: 'fgPct', currentValue: stats.shootingPct, targetValue: 45,
            })
        }

        // ---- Trends ----
        for (const trend of stats.trends) {
            insights.push({
                id: `trend_${trend.metric}`,
                category: 'trend',
                icon: trend.direction === 'improving' ? '📈' : trend.direction === 'declining' ? '📉' : '➡️',
                title: trend.description,
                description: `${trend.direction === 'improving' ? 'Positive' : trend.direction === 'declining' ? 'Declining' : 'Stable'} trend detected this session.`,
                priority: trend.direction === 'declining' ? 2 : 4,
                metric: trend.metric,
            })
        }

        // ---- Milestones ----
        if (stats.totalShots >= 50) {
            insights.push({
                id: 'milestone_50', category: 'milestone', icon: '🏆',
                title: '50 shots this session!',
                description: 'Great training intensity. Repetition builds muscle memory.',
                priority: 5,
            })
        }
        if (stats.totalShots >= 100) {
            insights.push({
                id: 'milestone_100', category: 'milestone', icon: '💯',
                title: '100 shots! Machine!',
                description: 'Pro-level training volume. Kobe would be proud.',
                priority: 5,
            })
        }

        // Sort by priority
        return insights.sort((a, b) => a.priority - b.priority)
    }

    // ---- Drill Recommendations ----

    private recommendDrills(
        stats: SessionRealtimeStats,
        shots: DetectedShot[],
    ): DrillRecommendation[] {
        const scored: Array<{ drill: DrillRecommendation; relevance: number }> = []

        for (const drill of DRILL_LIBRARY) {
            let relevance = 0

            switch (drill.targetMetric) {
                case 'elbowAngle':
                    relevance = Math.abs(stats.avgElbowAngle - NBA_BENCHMARKS.eliteElbowAngle.ideal)
                    break
                case 'releaseTime':
                    relevance = Math.max(0, (stats.avgReleaseTime - 0.45) * 200)
                    break
                case 'releaseHeight':
                    relevance = Math.max(0, (1.12 - stats.avgReleaseHeight) * 200)
                    break
                case 'followThrough':
                    relevance = Math.max(0, (85 - stats.followThroughPct))
                    break
                case 'consistency':
                    relevance = Math.max(0, (75 - stats.mechanicConsistency))
                    break
                case 'kneeFlexion':
                    relevance = 20 // Always somewhat relevant
                    break
                case 'zoneVariety':
                    relevance = 15 // Always somewhat relevant
                    break
                default:
                    relevance = 10
            }

            scored.push({ drill, relevance })
        }

        return scored
            .sort((a, b) => b.relevance - a.relevance)
            .map(s => s.drill)
    }

    // ---- NBA Comparison ----

    private findNBAComparison(stats: SessionRealtimeStats): {
        closestPlayer: string
        similarity: number
        keyDifference: string
    } {
        let closest = NBA_PLAYER_COMPARISONS[0]
        let minDist = Infinity

        for (const player of NBA_PLAYER_COMPARISONS) {
            const dist =
                Math.abs(stats.avgElbowAngle - player.elbowAngle) / 10 +
                Math.abs(stats.avgReleaseTime - player.releaseTime) / 0.1 +
                Math.abs(stats.avgReleaseHeight - player.releaseHeight) / 0.1

            if (dist < minDist) {
                minDist = dist
                closest = player
            }
        }

        const similarity = Math.max(0, Math.min(100, Math.round(100 - minDist * 5)))

        // Find the biggest difference
        const diffs = [
            { metric: 'elbow angle', diff: Math.abs(stats.avgElbowAngle - closest.elbowAngle), unit: '°' },
            { metric: 'release time', diff: Math.abs(stats.avgReleaseTime - closest.releaseTime), unit: 's' },
            { metric: 'release height', diff: Math.abs(stats.avgReleaseHeight - closest.releaseHeight), unit: 'x' },
        ].sort((a, b) => b.diff - a.diff)

        const keyDiff = diffs[0]
        const direction = stats.avgElbowAngle > closest.elbowAngle ? 'wider' : 'tighter'

        return {
            closestPlayer: closest.name,
            similarity,
            keyDifference: `${keyDiff.metric}: ${keyDiff.diff.toFixed(1)}${keyDiff.unit} difference (${closest.style})`,
        }
    }

    // ---- Headline ----

    private generateHeadline(stats: SessionRealtimeStats, grade: string): string {
        if (grade.startsWith('A')) {
            return `Outstanding session! ${stats.totalShots} shots at ${stats.shootingPct}% — NBA-level form.`
        }
        if (grade.startsWith('B')) {
            return `Solid session. ${stats.madeShots}/${stats.totalShots} made — keep building on this.`
        }
        if (grade.startsWith('C')) {
            return `Decent session. Key areas for improvement identified to level up fast.`
        }
        return `Training session completed. Focus on fundamentals to reach the next level.`
    }

    // ---- Next Focus ----

    private determineNextFocus(insights: CoachingInsight[]): string {
        const weakness = insights.find(i => i.category === 'weakness')
        if (weakness) {
            return `Focus on: ${weakness.title.toLowerCase()}`
        }
        const trend = insights.find(i => i.category === 'trend' && i.icon === '📉')
        if (trend) {
            return `Watch out: ${trend.title.toLowerCase()}`
        }
        return 'Keep refining your overall shooting mechanics'
    }

    // ---- Motivation ----

    private generateMotivation(stats: SessionRealtimeStats, grade: string): string {
        const messages = {
            'A+': '🔥 You\'re a scoring machine. Keep up the champion\'s work.',
            'A': '💪 Elite mechanics. One more push to reach the summit.',
            'A-': '⭐ Excellent work. You\'re showing high-level shooter qualities.',
            'B+': '🏀 Great workout. Consistency will come with repetition.',
            'B': '👍 Solid. Every session brings you closer to your best.',
            'B-': '📈 Good foundation! Focus on details to reach the next level.',
            'C+': '💪 You\'re improving. Rome wasn\'t built in a day.',
            'C': '🎯 Keep working. The best shooters were average once.',
            'C-': '📚 Every shot is a lesson. Come back tomorrow, you\'ll be better.',
            'D+': '🔄 Not your best session, but showing up is what counts.',
            'D': '💪 Persistence is key. Curry shot 500 shots a day at your age.',
            'F': '🏀 Every expert was once a beginner. Keep going, you\'ll get there.',
        }
        return messages[grade as keyof typeof messages] || messages['C']
    }
}

/** Singleton global */
let _coachingEngine: CoachingEngine | null = null
export function getCoachingEngine(): CoachingEngine {
    if (!_coachingEngine) {
        _coachingEngine = new CoachingEngine()
    }
    return _coachingEngine
}

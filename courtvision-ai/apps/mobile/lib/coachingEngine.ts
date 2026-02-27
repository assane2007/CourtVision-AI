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
    /** Résumé en une phrase */
    headline: string
    /** Diagnostic détaillé */
    insights: CoachingInsight[]
    /** Exercices recommandés */
    drills: DrillRecommendation[]
    /** Objectif prioritaire pour la prochaine session */
    nextSessionFocus: string
    /** Comparaison NBA */
    nbaComparison: {
        closestPlayer: string
        similarity: number
        keyDifference: string
    }
    /** Message motivant */
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
        description: 'Travaille ta mécanique de base à 1-2m du panier. Focus sur le coude à 90° et le follow-through.',
        duration: '5 min',
        difficulty: 'easy',
        targetMetric: 'elbowAngle',
        icon: '🎯',
        steps: [
            'Place-toi à 1m du panier',
            'Tir à une main (main forte uniquement)',
            '10 tirs, focus sur le coude à 90°',
            'Ajoute la main guide pour 10 tirs',
            'Recule à 2m et répète',
        ],
    },
    {
        id: 'release_speed',
        name: 'Quick Release Drill',
        description: 'Accélère ton release en attrapant et tirant le plus vite possible.',
        duration: '8 min',
        difficulty: 'medium',
        targetMetric: 'releaseTime',
        icon: '⚡',
        steps: [
            'Place 3 spots au coude et aux ailes',
            'Un partenaire te passe le ballon',
            'Attrape et tire en < 0.5 secondes',
            '5 tirs par spot, 3 rotations',
            'Chronomètre chaque tir si possible',
        ],
    },
    {
        id: 'arc_height',
        name: 'High Arc Training',
        description: 'Augmente l\'arc de ton tir pour un meilleur angle d\'entrée dans le panier.',
        duration: '7 min',
        difficulty: 'medium',
        targetMetric: 'releaseHeight',
        icon: '🌈',
        steps: [
            'Tire depuis le coude (free-throw)',
            'Vise le haut du rectangle sur la planche',
            'Exagère l\'arc — le ballon doit monter très haut',
            'Progressivement reviens à un arc naturel mais élevé',
            '20 tirs au total',
        ],
    },
    {
        id: 'follow_through',
        name: 'Gooseneck Follow-Through',
        description: 'Maintiens ton follow-through ("gooseneck") après chaque tir.',
        duration: '5 min',
        difficulty: 'easy',
        targetMetric: 'followThrough',
        icon: '🦢',
        steps: [
            'Tire depuis la ligne de lancer franc',
            'Après chaque tir, GÈLE ta main en l\'air',
            'Maintiens la position 2 secondes',
            'Vérifie : poignet cassé, doigts vers le panier',
            '15 tirs avec focus follow-through',
        ],
    },
    {
        id: 'consistency_drill',
        name: 'Consistency Sets',
        description: 'Tire des séries identiques pour améliorer ta constance mécanique.',
        duration: '10 min',
        difficulty: 'hard',
        targetMetric: 'consistency',
        icon: '📐',
        steps: [
            'Choisis UN spot fixe',
            'Tire 10 tirs consécutifs',
            'Objectif : même mécanique à chaque tir',
            'Note mentalement le tir le plus différent',
            'Répète 3 séries de 10 tirs',
        ],
    },
    {
        id: 'knee_flexion',
        name: 'Lower Body Power',
        description: 'Améliore la puissance de tes jambes pour un tir plus fluide.',
        duration: '6 min',
        difficulty: 'medium',
        targetMetric: 'kneeFlexion',
        icon: '🦵',
        steps: [
            'Squats sans ballon (10 reps, flex à 90°)',
            'Tir avec focus sur la flexion des genoux',
            'Jump shots avec exagération de la montée',
            'Tire 10x en comptant "1-2-UP"',
            'Compare la puissance avec/sans flexion',
        ],
    },
    {
        id: 'spot_shooting',
        name: '5-Spot Challenge',
        description: 'Tire depuis 5 spots autour du terrain pour varier les zones.',
        duration: '10 min',
        difficulty: 'hard',
        targetMetric: 'zoneVariety',
        icon: '🏀',
        steps: [
            'Place 5 marqueurs : coin gauche, aile gauche, top, aile droite, coin droit',
            'Tire 5x depuis chaque spot',
            'Note ton % par spot',
            'Reviens aux 2 pires spots pour 5 tirs supplémentaires',
            'Objectif : 60%+ partout',
        ],
    },
]

// ==========================================
// Coaching Engine
// ==========================================

export class CoachingEngine {
    /**
     * Génère un rapport de coaching complet pour une session.
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
        // Score composé de plusieurs métriques
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
                title: 'Tir de feu',
                description: `${stats.shootingPct}% au tir — tu es au-dessus de la moyenne NBA (${NBA_BENCHMARKS.avgFgPct}%).`,
                priority: 2, metric: 'fgPct', currentValue: stats.shootingPct,
            })
        }

        if (stats.avgElbowAngle >= NBA_BENCHMARKS.eliteElbowAngle.min && stats.avgElbowAngle <= NBA_BENCHMARKS.eliteElbowAngle.max) {
            insights.push({
                id: 'elite_elbow', category: 'strength', icon: '💪',
                title: 'Angle coude NBA',
                description: `Ton angle moyen de ${stats.avgElbowAngle.toFixed(1)}° est dans la zone élite NBA (${NBA_BENCHMARKS.eliteElbowAngle.min}-${NBA_BENCHMARKS.eliteElbowAngle.max}°).`,
                priority: 3, metric: 'elbowAngle', currentValue: stats.avgElbowAngle, targetValue: NBA_BENCHMARKS.eliteElbowAngle.ideal,
            })
        }

        if (stats.avgReleaseTime <= 0.45) {
            insights.push({
                id: 'quick_release', category: 'strength', icon: '⚡',
                title: 'Release rapide',
                description: `${stats.avgReleaseTime.toFixed(2)}s — comparable aux meilleurs shooteurs NBA.`,
                priority: 3, metric: 'releaseTime', currentValue: stats.avgReleaseTime,
                nbaReference: 'Curry: 0.38s, Thompson: 0.42s',
            })
        }

        if (stats.followThroughPct >= 90) {
            insights.push({
                id: 'great_ft', category: 'strength', icon: '🦢',
                title: 'Follow-through exemplaire',
                description: `${stats.followThroughPct.toFixed(0)}% de tes tirs ont un bon follow-through. Discipline élite.`,
                priority: 4, metric: 'followThrough', currentValue: stats.followThroughPct,
            })
        }

        if (stats.mechanicConsistency >= 80) {
            insights.push({
                id: 'consistent', category: 'strength', icon: '📐',
                title: 'Mécanique très consistante',
                description: `Score de consistance de ${stats.mechanicConsistency}/100 — ta répétabilité est ta force.`,
                priority: 3, metric: 'consistency', currentValue: stats.mechanicConsistency,
            })
        }

        // ---- Weaknesses ----
        if (stats.avgElbowAngle > 105) {
            insights.push({
                id: 'wide_elbow', category: 'weakness', icon: '⚠️',
                title: 'Coude trop ouvert',
                description: `Ton angle moyen de ${stats.avgElbowAngle.toFixed(1)}° est trop large. Vise ${NBA_BENCHMARKS.eliteElbowAngle.ideal}° pour plus de précision.`,
                priority: 1, metric: 'elbowAngle', currentValue: stats.avgElbowAngle, targetValue: NBA_BENCHMARKS.eliteElbowAngle.ideal,
            })
        }

        if (stats.avgReleaseTime > 0.55) {
            insights.push({
                id: 'slow_release', category: 'weakness', icon: '🐌',
                title: 'Release trop lent',
                description: `${stats.avgReleaseTime.toFixed(2)}s — tu perds du temps et tu peux être contré. Objectif : < 0.50s.`,
                priority: 1, metric: 'releaseTime', currentValue: stats.avgReleaseTime, targetValue: 0.45,
            })
        }

        if (stats.avgReleaseHeight < 1.05) {
            insights.push({
                id: 'low_release', category: 'weakness', icon: '📉',
                title: 'Point de release bas',
                description: `Release à ${stats.avgReleaseHeight.toFixed(2)}x ta taille — tu tires trop bas. Objectif : > 1.10x.`,
                priority: 2, metric: 'releaseHeight', currentValue: stats.avgReleaseHeight, targetValue: 1.12,
            })
        }

        if (stats.followThroughPct < 60) {
            insights.push({
                id: 'bad_ft', category: 'weakness', icon: '❌',
                title: 'Follow-through insuffisant',
                description: `Seulement ${stats.followThroughPct.toFixed(0)}% de follow-through. Maintiens ta main en l'air après chaque tir.`,
                priority: 1, metric: 'followThrough', currentValue: stats.followThroughPct, targetValue: 85,
            })
        }

        if (stats.mechanicConsistency < 50) {
            insights.push({
                id: 'inconsistent', category: 'weakness', icon: '🎲',
                title: 'Mécanique inconstante',
                description: `Score de ${stats.mechanicConsistency}/100 — chaque tir est différent. Focus sur la répétition.`,
                priority: 1, metric: 'consistency', currentValue: stats.mechanicConsistency, targetValue: 75,
            })
        }

        if (stats.shootingPct < 35 && stats.totalShots >= 5) {
            insights.push({
                id: 'low_fg', category: 'weakness', icon: '📊',
                title: 'Efficacité à améliorer',
                description: `${stats.shootingPct}% au tir sur ${stats.totalShots} tentatives. Travaille les fondamentaux.`,
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
                description: `Tendance ${trend.direction === 'improving' ? 'positive' : trend.direction === 'declining' ? 'à surveiller' : 'stable'} détectée sur cette session.`,
                priority: trend.direction === 'declining' ? 2 : 4,
                metric: trend.metric,
            })
        }

        // ---- Milestones ----
        if (stats.totalShots >= 50) {
            insights.push({
                id: 'milestone_50', category: 'milestone', icon: '🏆',
                title: '50 tirs cette session !',
                description: 'Belle intensité d\'entraînement. La répétition forge la mémoire musculaire.',
                priority: 5,
            })
        }
        if (stats.totalShots >= 100) {
            insights.push({
                id: 'milestone_100', category: 'milestone', icon: '💯',
                title: '100 tirs ! Machine !',
                description: 'Volume d\'entraînement digne d\'un pro. Kobe serait fier.',
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
            { metric: 'angle coude', diff: Math.abs(stats.avgElbowAngle - closest.elbowAngle), unit: '°' },
            { metric: 'temps release', diff: Math.abs(stats.avgReleaseTime - closest.releaseTime), unit: 's' },
            { metric: 'hauteur release', diff: Math.abs(stats.avgReleaseHeight - closest.releaseHeight), unit: 'x' },
        ].sort((a, b) => b.diff - a.diff)

        const keyDiff = diffs[0]
        const direction = stats.avgElbowAngle > closest.elbowAngle ? 'plus ouvert' : 'plus serré'

        return {
            closestPlayer: closest.name,
            similarity,
            keyDifference: `${keyDiff.metric} : ${keyDiff.diff.toFixed(1)}${keyDiff.unit} de différence (${closest.style})`,
        }
    }

    // ---- Headline ----

    private generateHeadline(stats: SessionRealtimeStats, grade: string): string {
        if (grade.startsWith('A')) {
            return `Session exceptionnelle ! ${stats.totalShots} tirs à ${stats.shootingPct}% — forme NBA.`
        }
        if (grade.startsWith('B')) {
            return `Bonne session. ${stats.madeShots}/${stats.totalShots} réussis — continue sur cette lancée.`
        }
        if (grade.startsWith('C')) {
            return `Session correcte. Points d'amélioration identifiés pour progresser rapidement.`
        }
        return `Session d'entraînement complétée. Focus sur les fondamentaux pour monter en niveau.`
    }

    // ---- Next Focus ----

    private determineNextFocus(insights: CoachingInsight[]): string {
        const weakness = insights.find(i => i.category === 'weakness')
        if (weakness) {
            return `Focus sur : ${weakness.title.toLowerCase()}`
        }
        const trend = insights.find(i => i.category === 'trend' && i.icon === '📉')
        if (trend) {
            return `Attention : ${trend.title.toLowerCase()}`
        }
        return 'Continue de perfectionner ta mécanique globale'
    }

    // ---- Motivation ----

    private generateMotivation(stats: SessionRealtimeStats, grade: string): string {
        const messages = {
            'A+': '🔥 Tu es une machine à scorer. Continue ce travail de champion.',
            'A': '💪 Mécanique élite. Encore un petit effort pour atteindre le sommet.',
            'A-': '⭐ Excellent travail. Tu montres des qualités de shooteur de haut niveau.',
            'B+': '🏀 Très bon entraînement. La constance va venir avec la répétition.',
            'B': '👍 Solide. Chaque session te rapproche de ton meilleur niveau.',
            'B-': '📈 Bonne base ! Focus sur les détails pour passer au niveau supérieur.',
            'C+': '💪 Tu progresses. Rome ne s\'est pas construite en un jour.',
            'C': '🎯 Continue de travailler. Les meilleurs shooteurs étaient moyens un jour.',
            'C-': '📚 Chaque tir est un apprentissage. Reviens demain, tu seras meilleur.',
            'D+': '🔄 Pas ta meilleure session, mais le fait d\'être là compte.',
            'D': '💪 La persévérance est la clé. Curry tirait 500 tirs par jour à ton âge.',
            'F': '🏀 Chaque expert a un jour été un débutant. Continue, tu vas y arriver.',
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

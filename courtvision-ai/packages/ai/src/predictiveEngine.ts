import type { ShotZone } from './shotAnalysis'

/**
 * Predictive Engine — Prédictions IA Avant Match
 *
 * Prédit la performance du joueur AVANT la session en utilisant :
 * - Historique des performances
 * - Score de récupération
 * - Tendances récentes (3 dernières sessions)
 * - Jour de la semaine (patterns comportementaux)
 * - Temps depuis la dernière session
 *
 * Inspiré par :
 * - Whoop (readiness score → performance prediction)
 * - Apple Health trends
 * - NBA injury prediction models
 * - Expected Goals (xG) en football
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt = aucune prédiction
 * - CourtVision = prédiction pré-match + validation post-match
 */

// ==========================================
// Types
// ==========================================

export interface PredictionInput {
    // Historical performance (last 10-20 sessions)
    historicalSessions: HistoricalSession[]
    // Recovery context
    recoveryScore?: number    // 0-100
    sleepHours?: number
    sleepQuality?: number     // 1-5
    energyLevel?: number      // 1-10
    stressLevel?: number      // 1-5
    // Time context
    daysSinceLastSession: number
    dayOfWeek: number         // 0-6 (Sun-Sat)
    timeOfDay: 'morning' | 'afternoon' | 'evening'
    // Session context
    sessionType: 'match' | 'training' | 'shootaround'
}

export interface HistoricalSession {
    date: string
    type: 'match' | 'training' | 'shootaround'
    fgPct: number
    mentalScore: number
    shotsAttempted: number
    fatigueIndex: number
    zones: Record<ShotZone, { attempts: number; made: number }>
}

export interface PerformancePrediction {
    // Main predictions
    predictedFGPct: number          // 0-100
    predictedMentalScore: number    // 0-100
    predictedFatigueOnset: number   // minute when fatigue kicks in

    // Zone predictions
    zonePredictions: Record<ShotZone, ZonePrediction>

    // Momentum prediction
    momentumCurve: MomentumPoint[]

    // Confidence
    confidence: number    // 0-1
    sampleSize: number    // number of historical sessions used

    // Risk factors
    riskFactors: RiskFactor[]

    // Recommendations
    preGameTips: string[]

    // Readiness
    readinessScore: number  // 0-100 (overall readiness to play)
    readinessGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
}

export interface ZonePrediction {
    predictedPct: number
    confidence: number
    recommendation: 'attack' | 'moderate' | 'avoid'
    trend: 'improving' | 'stable' | 'declining'
}

export interface MomentumPoint {
    minute: number
    predictedMentalScore: number
    predictedFGPct: number
    fatigueFactor: number
    notes: string
}

export interface RiskFactor {
    type: 'fatigue' | 'mental' | 'mechanical' | 'recovery' | 'rust'
    severity: 'low' | 'medium' | 'high'
    description: string
    mitigation: string
}

// ==========================================
// Engine
// ==========================================

export class PredictiveEngine {

    /**
     * Generate a full pre-game prediction.
     */
    static predict(input: PredictionInput): PerformancePrediction {
        const history = input.historicalSessions
        if (history.length === 0) {
            return this.defaultPrediction()
        }

        const confidence = Math.min(1, history.length / 10) // max at 10+ sessions

        // 1. Base FG% prediction (weighted recent average)
        const predictedFGPct = this.predictFGPct(history, input)

        // 2. Mental score prediction
        const predictedMentalScore = this.predictMentalScore(history, input)

        // 3. Fatigue onset prediction
        const predictedFatigueOnset = this.predictFatigueOnset(history, input)

        // 4. Zone predictions
        const zonePredictions = this.predictZones(history, input)

        // 5. Momentum curve
        const momentumCurve = this.buildMomentumCurve(predictedMentalScore, predictedFatigueOnset, history)

        // 6. Risk factors
        const riskFactors = this.assessRiskFactors(input, predictedFGPct, predictedMentalScore)

        // 7. Readiness
        const readinessScore = this.computeReadiness(input, predictedFGPct, predictedMentalScore)
        const readinessGrade = this.gradeReadiness(readinessScore)

        // 8. Pre-game tips
        const preGameTips = this.generatePreGameTips(riskFactors, zonePredictions, input)

        return {
            predictedFGPct: Math.round(predictedFGPct * 10) / 10,
            predictedMentalScore: Math.round(predictedMentalScore),
            predictedFatigueOnset,
            zonePredictions,
            momentumCurve,
            confidence: Math.round(confidence * 100) / 100,
            sampleSize: history.length,
            riskFactors,
            preGameTips,
            readinessScore: Math.round(readinessScore),
            readinessGrade,
        }
    }

    /**
     * Validate a prediction against actual results (post-game).
     * Returns accuracy score (0-100).
     */
    static validatePrediction(
        prediction: PerformancePrediction,
        actual: { fgPct: number; mentalScore: number }
    ): number {
        const fgError = Math.abs(prediction.predictedFGPct - actual.fgPct)
        const mentalError = Math.abs(prediction.predictedMentalScore - actual.mentalScore)

        // Max error = 50 points for each metric
        const fgAccuracy = Math.max(0, 100 - fgError * 2)
        const mentalAccuracy = Math.max(0, 100 - mentalError * 2)

        return Math.round((fgAccuracy * 0.5 + mentalAccuracy * 0.5))
    }

    // ── Private prediction models ────────────────────

    private static predictFGPct(history: HistoricalSession[], input: PredictionInput): number {
        // Weighted moving average (recent sessions weigh more)
        const recent = history.slice(-10)
        let weightedSum = 0
        let weightTotal = 0

        for (let i = 0; i < recent.length; i++) {
            const weight = (i + 1) / recent.length  // Linear weight
            weightedSum += recent[i].fgPct * weight
            weightTotal += weight
        }

        let predicted = weightTotal > 0 ? weightedSum / weightTotal : 40

        // Recovery adjustment
        if (input.recoveryScore !== undefined) {
            if (input.recoveryScore < 40) predicted -= 5  // Low recovery = worse shooting
            if (input.recoveryScore > 80) predicted += 3  // High recovery = slight boost
        }

        // Rest day adjustment
        if (input.daysSinceLastSession === 0) predicted -= 2  // Playing twice in a day
        if (input.daysSinceLastSession === 1) predicted += 1  // Ideal rest
        if (input.daysSinceLastSession >= 4) predicted -= 3  // Rust factor

        // Session type adjustment
        if (input.sessionType === 'shootaround') predicted += 5  // Less pressure
        if (input.sessionType === 'match') predicted -= 2  // Pressure adjustment

        // Sleep adjustment
        if (input.sleepHours !== undefined) {
            if (input.sleepHours < 6) predicted -= 4
            if (input.sleepHours >= 8) predicted += 2
        }

        // Stress adjustment
        if (input.stressLevel !== undefined) {
            if (input.stressLevel >= 4) predicted -= 3
            if (input.stressLevel <= 2) predicted += 1
        }

        return Math.max(10, Math.min(90, predicted))
    }

    private static predictMentalScore(history: HistoricalSession[], input: PredictionInput): number {
        const recent = history.slice(-5)
        const avgMental = recent.reduce((sum, s) => sum + s.mentalScore, 0) / (recent.length || 1)

        let predicted = avgMental

        // Recovery impacts mental (strong correlation)
        if (input.recoveryScore !== undefined) {
            const recoveryImpact = (input.recoveryScore - 60) * 0.3
            predicted += recoveryImpact
        }

        // Stress direct impact
        if (input.stressLevel !== undefined) {
            predicted -= (input.stressLevel - 3) * 5
        }

        // Energy level impact
        if (input.energyLevel !== undefined) {
            predicted += (input.energyLevel - 5) * 2
        }

        // Winning/losing momentum from recent sessions
        const recentTrend = this.computeMentalTrend(recent)
        predicted += recentTrend * 3

        return Math.max(20, Math.min(100, predicted))
    }

    private static predictFatigueOnset(history: HistoricalSession[], input: PredictionInput): number {
        // Average fatigue onset from history (approximated)
        const avgFatigue = history.reduce((sum, s) => sum + s.fatigueIndex, 0) / (history.length || 1)

        // Higher fatigue index historically = earlier onset
        let onset = 30  // baseline: 30 minutes in

        if (avgFatigue > 50) onset -= 8
        if (avgFatigue > 70) onset -= 5

        // Recovery impact
        if (input.recoveryScore !== undefined) {
            if (input.recoveryScore > 80) onset += 10
            if (input.recoveryScore < 40) onset -= 10
        }

        // Sleep impact
        if (input.sleepHours !== undefined && input.sleepHours < 6) {
            onset -= 5
        }

        return Math.max(10, Math.min(45, onset))
    }

    private static predictZones(history: HistoricalSession[], _input: PredictionInput): Record<ShotZone, ZonePrediction> {
        const zones: ShotZone[] = ['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']
        const predictions: Record<ShotZone, ZonePrediction> = {} as any

        for (const zone of zones) {
            const zoneData = history
                .map(s => s.zones[zone])
                .filter(z => z && z.attempts > 0)

            if (zoneData.length === 0) {
                predictions[zone] = {
                    predictedPct: 35,
                    confidence: 0.1,
                    recommendation: 'moderate',
                    trend: 'stable',
                }
                continue
            }

            // Weighted average (recent first)
            let weightedPct = 0
            let weightTotal = 0
            for (let i = 0; i < zoneData.length; i++) {
                const weight = (i + 1) / zoneData.length
                const pct = (zoneData[i].made / zoneData[i].attempts) * 100
                weightedPct += pct * weight
                weightTotal += weight
            }
            const predictedPct = weightedPct / weightTotal

            // Trend detection
            const recentPcts = zoneData.slice(-3).map(z => (z.made / z.attempts) * 100)
            const trend = recentPcts.length >= 2
                ? recentPcts[recentPcts.length - 1] > recentPcts[0] + 5 ? 'improving'
                : recentPcts[recentPcts.length - 1] < recentPcts[0] - 5 ? 'declining'
                : 'stable'
                : 'stable'

            // Recommendation
            const recommendation = predictedPct > 45 ? 'attack'
                : predictedPct < 30 ? 'avoid'
                : 'moderate'

            predictions[zone] = {
                predictedPct: Math.round(predictedPct * 10) / 10,
                confidence: Math.min(1, zoneData.length / 5),
                recommendation,
                trend,
            }
        }

        return predictions
    }

    private static buildMomentumCurve(
        mentalBaseline: number,
        fatigueOnset: number,
        history: HistoricalSession[]
    ): MomentumPoint[] {
        const points: MomentumPoint[] = []
        const matchDuration = 48 // minutes

        for (let minute = 0; minute <= matchDuration; minute += 4) {
            // Mental score decreases with fatigue
            const fatigueEffect = minute > fatigueOnset
                ? (minute - fatigueOnset) * 0.5
                : 0

            const predictedMental = Math.max(20, mentalBaseline - fatigueEffect)

            // FG% follows mental with some lag
            const baseFG = history.length > 0
                ? history.reduce((s, h) => s + h.fgPct, 0) / history.length
                : 40
            const predictedFG = Math.max(15, baseFG - fatigueEffect * 0.3)

            // Fatigue factor (0-100)
            const fatigueFactor = Math.min(100, Math.max(0, (minute / fatigueOnset) * 50))

            let notes = ''
            if (minute === 0) notes = 'Début du match — énergie maximale'
            if (minute === Math.round(fatigueOnset)) notes = '⚠️ Début de la fatigue'
            if (minute === 24) notes = 'Mi-temps'
            if (minute >= 40) notes = 'Dernières minutes — gestion mentale cruciale'

            points.push({
                minute,
                predictedMentalScore: Math.round(predictedMental),
                predictedFGPct: Math.round(predictedFG * 10) / 10,
                fatigueFactor: Math.round(fatigueFactor),
                notes,
            })
        }

        return points
    }

    private static assessRiskFactors(
        input: PredictionInput,
        _predictedFG: number,
        predictedMental: number
    ): RiskFactor[] {
        const risks: RiskFactor[] = []

        // Recovery risk
        if (input.recoveryScore !== undefined && input.recoveryScore < 40) {
            risks.push({
                type: 'recovery',
                severity: input.recoveryScore < 25 ? 'high' : 'medium',
                description: `Score de récupération bas (${input.recoveryScore}/100) — risque de fatigue précoce`,
                mitigation: 'Hydratation ++ avant le match, échauffement prolongé de 10 min',
            })
        }

        // Rust risk
        if (input.daysSinceLastSession >= 5) {
            risks.push({
                type: 'rust',
                severity: input.daysSinceLastSession >= 7 ? 'high' : 'medium',
                description: `${input.daysSinceLastSession} jours sans jouer — risque de "rouille" mécanique`,
                mitigation: '50 form shots à 1m + 30 tirs mid-range en échauffement',
            })
        }

        // Mental risk
        if (predictedMental < 50) {
            risks.push({
                type: 'mental',
                severity: 'high',
                description: 'Score mental prédit bas — risque de spirale négative après un raté',
                mitigation: 'Exercice de respiration 4-4-4-4 avant le match. Objectif : ne juge aucun tir.',
            })
        }

        // Sleep risk
        if (input.sleepHours !== undefined && input.sleepHours < 6) {
            risks.push({
                type: 'fatigue',
                severity: 'high',
                description: `Seulement ${input.sleepHours}h de sommeil — impact significatif sur la réactivité`,
                mitigation: 'Sieste de 20 min si possible, caféine modérée 45 min avant',
            })
        }

        return risks
    }

    private static computeReadiness(
        input: PredictionInput,
        predictedFG: number,
        predictedMental: number
    ): number {
        let readiness = 50

        // Recovery (30%)
        if (input.recoveryScore !== undefined) {
            readiness += (input.recoveryScore - 50) * 0.30
        }

        // Sleep (20%)
        if (input.sleepHours !== undefined) {
            readiness += (Math.min(input.sleepHours, 9) - 6) * 6  // 6h baseline
        }

        // Energy (15%)
        if (input.energyLevel !== undefined) {
            readiness += (input.energyLevel - 5) * 3
        }

        // Recent form (20%)
        readiness += (predictedFG - 40) * 0.5

        // Mental state (15%)
        readiness += (predictedMental - 50) * 0.3

        return Math.max(0, Math.min(100, readiness))
    }

    private static gradeReadiness(score: number): PerformancePrediction['readinessGrade'] {
        if (score >= 90) return 'A+'
        if (score >= 80) return 'A'
        if (score >= 70) return 'B+'
        if (score >= 60) return 'B'
        if (score >= 50) return 'C+'
        if (score >= 40) return 'C'
        if (score >= 30) return 'D'
        return 'F'
    }

    private static computeMentalTrend(sessions: HistoricalSession[]): number {
        if (sessions.length < 2) return 0
        const first = sessions.slice(0, Math.ceil(sessions.length / 2))
        const second = sessions.slice(Math.ceil(sessions.length / 2))
        const firstAvg = first.reduce((s, h) => s + h.mentalScore, 0) / first.length
        const secondAvg = second.reduce((s, h) => s + h.mentalScore, 0) / second.length
        return (secondAvg - firstAvg) / 10  // Normalized to ~[-3, 3]
    }

    private static generatePreGameTips(
        risks: RiskFactor[],
        zones: Record<ShotZone, ZonePrediction>,
        _input: PredictionInput
    ): string[] {
        const tips: string[] = []

        // Risk mitigations
        for (const risk of risks.slice(0, 2)) {
            tips.push(`⚠️ ${risk.mitigation}`)
        }

        // Zone recommendations
        const attackZones = Object.entries(zones)
            .filter(([_, z]) => z.recommendation === 'attack')
            .map(([zone]) => zone)
        if (attackZones.length > 0) {
            tips.push(`🎯 Attaque tes zones fortes : ${attackZones.join(', ')}`)
        }

        const avoidZones = Object.entries(zones)
            .filter(([_, z]) => z.recommendation === 'avoid')
            .map(([zone]) => zone)
        if (avoidZones.length > 0) {
            tips.push(`🚫 Évite les tirs en ${avoidZones.join(', ')} aujourd'hui`)
        }

        // General tips
        tips.push('🧠 Rappelle-toi : le premier tir ne définit pas le match')

        return tips.slice(0, 5)
    }

    private static defaultPrediction(): PerformancePrediction {
        return {
            predictedFGPct: 40,
            predictedMentalScore: 65,
            predictedFatigueOnset: 30,
            zonePredictions: {
                restricted: { predictedPct: 55, confidence: 0.1, recommendation: 'attack', trend: 'stable' },
                paint: { predictedPct: 40, confidence: 0.1, recommendation: 'moderate', trend: 'stable' },
                midrange: { predictedPct: 38, confidence: 0.1, recommendation: 'moderate', trend: 'stable' },
                corner3: { predictedPct: 35, confidence: 0.1, recommendation: 'moderate', trend: 'stable' },
                wing3: { predictedPct: 33, confidence: 0.1, recommendation: 'moderate', trend: 'stable' },
                top3: { predictedPct: 34, confidence: 0.1, recommendation: 'moderate', trend: 'stable' },
            },
            momentumCurve: [],
            confidence: 0.1,
            sampleSize: 0,
            riskFactors: [{ type: 'rust', severity: 'low', description: 'Pas assez de données pour une prédiction fiable', mitigation: 'Joue 3-5 sessions pour calibrer les prédictions' }],
            preGameTips: ['🏀 Continue à jouer pour que l\'IA apprenne ton style !'],
            readinessScore: 50,
            readinessGrade: 'C+',
        }
    }
}

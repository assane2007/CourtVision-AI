/**
 * Recovery Engine — Wellness Intelligence
 *
 * Calcule un score de récupération basé sur :
 * - Sommeil (durée + qualité)
 * - HRV (Heart Rate Variability)
 * - Énergie subjective
 * - Douleurs musculaires
 * - Stress
 * - Nutrition/Hydratation
 *
 * Inspiré par : Whoop, OURA Ring, Apple Health
 *
 * Output :
 * - Recovery Score (0-100)
 * - Readiness to Play (0-100)
 * - Training intensity recommendation
 * - Personalized tips
 */

export interface RecoveryInput {
    sleepHours: number
    sleepQuality: number        // 1-5
    energyLevel: number         // 1-10
    muscleSoreness: number      // 1-5 (1=none, 5=severe)
    stressLevel: number         // 1-5
    hrv?: number                // milliseconds
    restingHR?: number          // BPM
    hydrationLiters?: number
    mealsQuality?: number       // 1-5
    mood?: number               // 1-5
}

export interface RecoveryResult {
    recoveryScore: number       // 0-100
    readinessScore: number      // 0-100
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
    recommendation: string
    trainingIntensity: 'rest' | 'light' | 'moderate' | 'normal' | 'push'
    tips: string[]
    breakdown: {
        sleep: number           // 0-30
        energy: number          // 0-20
        soreness: number        // 0-15
        stress: number          // 0-15
        biometrics: number      // 0-10
        nutrition: number       // 0-10
    }
    riskFactors: string[]
}

export class RecoveryEngine {

    static compute(input: RecoveryInput): RecoveryResult {
        const breakdown = {
            sleep: 0,
            energy: 0,
            soreness: 0,
            stress: 0,
            biometrics: 0,
            nutrition: 0,
        }

        // ── Sleep (30 points max) ──
        // Optimal: 7-9h with quality 4-5
        const sleepDurationScore = Math.min(1, input.sleepHours / 8) * 0.6
        const sleepQualityScore = (input.sleepQuality / 5) * 0.4
        breakdown.sleep = Math.round((sleepDurationScore + sleepQualityScore) * 30)

        // ── Energy (20 points max) ──
        breakdown.energy = Math.round((input.energyLevel / 10) * 20)

        // ── Soreness inversé (15 points max) ──
        breakdown.soreness = Math.round(((6 - input.muscleSoreness) / 5) * 15)

        // ── Stress inversé (15 points max) ──
        breakdown.stress = Math.round(((6 - input.stressLevel) / 5) * 15)

        // ── Biometrics (10 points max) ──
        if (input.hrv !== undefined) {
            breakdown.biometrics += Math.round(Math.min(1, input.hrv / 80) * 5)
        } else {
            breakdown.biometrics += 3 // neutral if not provided
        }
        if (input.restingHR !== undefined) {
            breakdown.biometrics += Math.round(Math.max(0, (1 - (input.restingHR - 45) / 40)) * 5)
        } else {
            breakdown.biometrics += 3
        }

        // ── Nutrition (10 points max) ──
        if (input.hydrationLiters !== undefined) {
            breakdown.nutrition += Math.round(Math.min(1, input.hydrationLiters / 2.5) * 5)
        } else {
            breakdown.nutrition += 3
        }
        if (input.mealsQuality !== undefined) {
            breakdown.nutrition += Math.round((input.mealsQuality / 5) * 5)
        } else {
            breakdown.nutrition += 3
        }

        // Total
        const recoveryScore = Math.min(100, Math.max(0,
            breakdown.sleep + breakdown.energy + breakdown.soreness +
            breakdown.stress + breakdown.biometrics + breakdown.nutrition
        ))

        // Readiness = recovery + mood bonus
        const moodBonus = input.mood ? (input.mood - 3) * 3 : 0
        const readinessScore = Math.min(100, Math.max(0, recoveryScore + moodBonus))

        // Grade
        const grade = this.computeGrade(recoveryScore)

        // Training intensity recommendation
        const trainingIntensity = this.recommendIntensity(recoveryScore)

        // Risk factors
        const riskFactors: string[] = []
        if (input.sleepHours < 6) riskFactors.push('⚠️ Sommeil insuffisant — risque de blessure +30%')
        if (input.muscleSoreness >= 4) riskFactors.push('⚠️ Douleurs musculaires élevées — risque de surentraînement')
        if (input.stressLevel >= 4) riskFactors.push('⚠️ Stress élevé — impact négatif sur la concentration')
        if (input.energyLevel <= 3) riskFactors.push('⚠️ Énergie très basse — performance réduite estimée à -15%')
        if (input.hrv !== undefined && input.hrv < 30) riskFactors.push('⚠️ HRV très basse — système nerveux fatigué')

        // Tips
        const tips = this.generateTips(input, recoveryScore)

        // Recommendation text
        const recommendation = this.generateRecommendation(recoveryScore, trainingIntensity, riskFactors)

        return {
            recoveryScore: Math.round(recoveryScore),
            readinessScore: Math.round(readinessScore),
            grade,
            recommendation,
            trainingIntensity,
            tips,
            breakdown,
            riskFactors,
        }
    }

    private static computeGrade(score: number): RecoveryResult['grade'] {
        if (score >= 90) return 'A+'
        if (score >= 80) return 'A'
        if (score >= 70) return 'B+'
        if (score >= 60) return 'B'
        if (score >= 50) return 'C+'
        if (score >= 40) return 'C'
        if (score >= 25) return 'D'
        return 'F'
    }

    private static recommendIntensity(score: number): RecoveryResult['trainingIntensity'] {
        if (score >= 85) return 'push'
        if (score >= 70) return 'normal'
        if (score >= 55) return 'moderate'
        if (score >= 35) return 'light'
        return 'rest'
    }

    private static generateTips(input: RecoveryInput, score: number): string[] {
        const tips: string[] = []

        if (input.sleepHours < 7) {
            tips.push('💤 Essaie de dormir au moins 7h ce soir — chaque heure supplémentaire = +5% de performance')
        }
        if (input.sleepQuality < 3) {
            tips.push('🌙 Pas d\'écran 1h avant de dormir + chambre fraîche (18-20°C) pour une meilleure qualité')
        }
        if (input.muscleSoreness >= 3) {
            tips.push('🧊 20 min de cryothérapie ou bain froid post-entraînement pour la récupération musculaire')
        }
        if (input.stressLevel >= 3) {
            tips.push('🧘 5 min de respiration box breathing (4-4-4-4) pour réduire le cortisol')
        }
        if (input.hydrationLiters !== undefined && input.hydrationLiters < 2) {
            tips.push('💧 Augmente ton hydratation — vise 2.5L aujourd\'hui. La déshydratation réduit la précision de 12%')
        }
        if (input.energyLevel <= 4) {
            tips.push('🍌 Prends un snack riche en glucides 45 min avant ta session (banane + granola)')
        }
        if (score >= 85) {
            tips.push('🔥 Ton corps est prêt — c\'est le moment de pousser et de tester tes limites!')
        }
        if (score < 40) {
            tips.push('⚠️ Jour de repos recommandé — la progression vient aussi de la récupération')
        }

        return tips.slice(0, 4) // Max 4 tips
    }

    private static generateRecommendation(
        score: number,
        intensity: RecoveryResult['trainingIntensity'],
        risks: string[]
    ): string {
        if (score >= 85) {
            return '🟢 Tu es en pleine forme! C\'est le moment idéal pour une session intense avec focus sur tes zones faibles.'
        }
        if (score >= 70) {
            return '🟢 Bonne récupération. Session normale recommandée — maintiens le rythme!'
        }
        if (score >= 55) {
            return '🟡 Récupération moyenne. Session modérée recommandée — privilégie le tir posé et le mental.'
        }
        if (score >= 35) {
            return '🟠 Récupération basse. Session légère uniquement — form shooting et visualisation.'
        }
        return '🔴 Corps fatigué. Repos actif recommandé — étirements, mobilité, et sommeil de qualité.'
    }
}

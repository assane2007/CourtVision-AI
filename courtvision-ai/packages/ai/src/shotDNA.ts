import { ShotResult, ShotStats, computeShotStats, ShotZone } from './shotAnalysis'

/**
 * Shot DNA™ — Empreinte de Tir Unique
 *
 * Chaque joueur a une "empreinte de tir" unique, comme une empreinte digitale,
 * basée sur sa biomécanique. Le Shot DNA Engine analyse et compare cette signature
 * avec les joueurs NBA et détecte les dérives mécaniques au fil du temps.
 *
 * Inspiré par :
 * - NBA Second Spectrum (tracking data)
 * - HomeCourt shot tracking
 * - Apple Watch health metrics trending
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt track juste le % de réussite
 * - CourtVision AI analyse la BIOMÉCANIQUE de chaque tir
 * - Drift detection (comme Apple Health trends)
 * - Shot Quality Score prédictif (expected make %)
 */

// ==========================================
// Types
// ==========================================

export interface ShotDNASignature {
    avgElbowAngle: number
    avgReleaseHeight: number
    avgReleaseTime: number
    followThroughPct: number
    dominantHand: 'right' | 'left'
    /** Écart-type de l'angle du coude (consistance) */
    elbowStdDev: number
    /** Écart-type de la hauteur de release */
    releaseHeightStdDev: number
}

export interface ShotDNAProfile {
    signature: ShotDNASignature
    /** Score de pureté mécanique (0-100) */
    purityScore: number
    /** Similarité avec le joueur NBA le plus proche (0-100) */
    nbaSimilarity: number
    closestNBAPlayer: string
    /** Zones optimales et sous-optimales */
    zoneEfficiency: Record<ShotZone, ZoneEfficiencyData>
    /** Détection de dérive mécanique */
    mechanicalDrift: MechanicalDrift[]
    /** Score de qualité de tir moyen */
    avgShotQuality: number
    /** Total de tirs analysés */
    totalShotsAnalyzed: number
}

export interface ZoneEfficiencyData {
    attempts: number
    made: number
    pct: number
    avgShotQuality: number
    isOptimal: boolean
    isUnderperforming: boolean
    trend: 'improving' | 'stable' | 'declining'
}

export interface MechanicalDrift {
    metric: string
    direction: 'up' | 'down'
    delta: number
    severity: 'minor' | 'moderate' | 'critical'
    description: string
    recommendation: string
    detectedAt: string
}

export interface ShotQualityResult {
    /** Probabilité de réussite prédite (0-100) */
    expectedMakePct: number
    /** Facteurs influençant la qualité */
    factors: {
        mechanicScore: number    // 0-100
        zoneScore: number        // 0-100
        fatigueImpact: number    // -20 to 0
        mentalImpact: number     // -15 to +15
        clutchPressure: number   // -25 to +5
        contestedPenalty: number // -30 to 0
    }
    /** Grade global */
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
}

// ==========================================
// NBA Reference Database étendue
// ==========================================

interface NBABiomechanics {
    name: string
    elbowAngle: number
    releaseHeight: number
    releaseTime: number
    followThroughPct: number
    bestZone: ShotZone
    avgFGPct: number
}

const NBA_BIOMECHANICS: NBABiomechanics[] = [
    { name: 'Stephen Curry', elbowAngle: 95, releaseHeight: 0.92, releaseTime: 0.38, followThroughPct: 98, bestZone: 'top3', avgFGPct: 47.3 },
    { name: 'Kevin Durant', elbowAngle: 100, releaseHeight: 0.98, releaseTime: 0.42, followThroughPct: 95, bestZone: 'midrange', avgFGPct: 49.6 },
    { name: 'Klay Thompson', elbowAngle: 93, releaseHeight: 0.90, releaseTime: 0.35, followThroughPct: 97, bestZone: 'wing3', avgFGPct: 45.8 },
    { name: 'Devin Booker', elbowAngle: 92, releaseHeight: 0.88, releaseTime: 0.40, followThroughPct: 93, bestZone: 'midrange', avgFGPct: 46.7 },
    { name: 'LeBron James', elbowAngle: 88, releaseHeight: 0.85, releaseTime: 0.45, followThroughPct: 88, bestZone: 'paint', avgFGPct: 50.4 },
    { name: 'Luka Dončić', elbowAngle: 87, releaseHeight: 0.84, releaseTime: 0.48, followThroughPct: 85, bestZone: 'top3', avgFGPct: 45.7 },
    { name: 'Damian Lillard', elbowAngle: 94, releaseHeight: 0.91, releaseTime: 0.37, followThroughPct: 96, bestZone: 'top3', avgFGPct: 44.5 },
    { name: 'Jayson Tatum', elbowAngle: 91, releaseHeight: 0.89, releaseTime: 0.41, followThroughPct: 92, bestZone: 'midrange', avgFGPct: 45.3 },
    { name: 'Trae Young', elbowAngle: 90, releaseHeight: 0.87, releaseTime: 0.36, followThroughPct: 91, bestZone: 'top3', avgFGPct: 43.4 },
    { name: 'Shai Gilgeous-Alexander', elbowAngle: 89, releaseHeight: 0.90, releaseTime: 0.43, followThroughPct: 90, bestZone: 'midrange', avgFGPct: 53.5 },
]

// ==========================================
// Zone baseline FG% (NBA averages 2023-24)
// ==========================================

const NBA_ZONE_AVG: Record<ShotZone, number> = {
    restricted: 65.0,
    paint: 42.0,
    midrange: 41.5,
    corner3: 38.5,
    wing3: 36.0,
    top3: 37.0,
}

// ==========================================
// Shot DNA Engine
// ==========================================

export class ShotDNAEngine {

    /**
     * Compute the Shot DNA signature from a collection of shots.
     */
    static computeSignature(shots: ShotResult[]): ShotDNASignature {
        if (shots.length === 0) {
            return {
                avgElbowAngle: 0, avgReleaseHeight: 0, avgReleaseTime: 0,
                followThroughPct: 0, dominantHand: 'right',
                elbowStdDev: 0, releaseHeightStdDev: 0,
            }
        }

        const elbowAngles = shots.map(s => s.posture.elbowAngle)
        const releaseHeights = shots.map(s => s.posture.releaseHeight)
        const releaseTimes = shots.map(s => s.posture.releaseTime)
        const followThroughs = shots.filter(s => s.posture.followThrough).length

        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
        const stdDev = (arr: number[]) => {
            const mean = avg(arr)
            return Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length)
        }

        return {
            avgElbowAngle: Math.round(avg(elbowAngles) * 10) / 10,
            avgReleaseHeight: Math.round(avg(releaseHeights) * 1000) / 1000,
            avgReleaseTime: Math.round(avg(releaseTimes) * 1000) / 1000,
            followThroughPct: Math.round((followThroughs / shots.length) * 100),
            dominantHand: 'right', // TODO: detect from landmarks
            elbowStdDev: Math.round(stdDev(elbowAngles) * 10) / 10,
            releaseHeightStdDev: Math.round(stdDev(releaseHeights) * 1000) / 1000,
        }
    }

    /**
     * Score de pureté mécanique (0-100).
     * Plus la mécanique est consistante (faible écart-type), plus le score est haut.
     * Un follow-through systématique augmente aussi le score.
     */
    static computePurityScore(signature: ShotDNASignature): number {
        // Écart-type cible : <5° pour le coude, <0.05 pour la hauteur
        const elbowConsistency = Math.max(0, 100 - signature.elbowStdDev * 8)
        const releaseConsistency = Math.max(0, 100 - signature.releaseHeightStdDev * 400)
        const followThrough = signature.followThroughPct

        // Angle du coude dans la plage optimale (88-98°)
        const elbowOptimal = signature.avgElbowAngle >= 88 && signature.avgElbowAngle <= 98
            ? 100
            : Math.max(0, 100 - Math.abs(signature.avgElbowAngle - 93) * 4)

        return Math.round(
            elbowConsistency * 0.30 +
            releaseConsistency * 0.25 +
            followThrough * 0.25 +
            elbowOptimal * 0.20
        )
    }

    /**
     * Compare la signature avec les joueurs NBA et trouve le plus proche.
     */
    static findNBAMatch(signature: ShotDNASignature): { player: string; similarity: number; traits: string[] } {
        let bestMatch = NBA_BIOMECHANICS[0]
        let bestScore = Infinity

        for (const nba of NBA_BIOMECHANICS) {
            const angleDiff = Math.abs(nba.elbowAngle - signature.avgElbowAngle)
            const heightDiff = Math.abs(nba.releaseHeight - signature.avgReleaseHeight) * 50
            const timeDiff = Math.abs(nba.releaseTime - signature.avgReleaseTime) * 30
            const ftDiff = Math.abs(nba.followThroughPct - signature.followThroughPct) * 0.3
            const score = angleDiff + heightDiff + timeDiff + ftDiff

            if (score < bestScore) {
                bestScore = score
                bestMatch = nba
            }
        }

        const similarity = Math.max(0, Math.min(100, Math.round(100 - bestScore * 1.5)))

        const traits: string[] = []
        if (Math.abs(bestMatch.elbowAngle - signature.avgElbowAngle) < 3) traits.push('angle_coude_similaire')
        if (Math.abs(bestMatch.releaseHeight - signature.avgReleaseHeight) < 0.05) traits.push('hauteur_release_similaire')
        if (Math.abs(bestMatch.releaseTime - signature.avgReleaseTime) < 0.05) traits.push('vitesse_release_similaire')
        if (signature.followThroughPct > 90 && bestMatch.followThroughPct > 90) traits.push('follow_through_constant')

        return { player: bestMatch.name, similarity, traits }
    }

    /**
     * Compare la signature avec TOUS les joueurs NBA et renvoie le classement.
     */
    static compareWithAllNBA(signature: ShotDNASignature): { player: string; similarity: number; traits: string[] }[] {
        return NBA_BIOMECHANICS.map(nba => {
            const angleDiff = Math.abs(nba.elbowAngle - signature.avgElbowAngle)
            const heightDiff = Math.abs(nba.releaseHeight - signature.avgReleaseHeight) * 50
            const timeDiff = Math.abs(nba.releaseTime - signature.avgReleaseTime) * 30
            const ftDiff = Math.abs(nba.followThroughPct - signature.followThroughPct) * 0.3
            const score = angleDiff + heightDiff + timeDiff + ftDiff

            const similarity = Math.max(0, Math.min(100, Math.round(100 - score * 1.5)))

            const traits: string[] = []
            if (Math.abs(nba.elbowAngle - signature.avgElbowAngle) < 3) traits.push('angle_coude_similaire')
            if (Math.abs(nba.releaseHeight - signature.avgReleaseHeight) < 0.05) traits.push('hauteur_release_similaire')
            if (Math.abs(nba.releaseTime - signature.avgReleaseTime) < 0.05) traits.push('vitesse_release_similaire')
            if (signature.followThroughPct > 90 && nba.followThroughPct > 90) traits.push('follow_through_constant')

            return { player: nba.name, similarity, traits }
        }).sort((a, b) => b.similarity - a.similarity)
    }

    /**
     * Calcule le Shot Quality Score pour un tir individuel.
     * Prédit la probabilité de réussite basée sur multiples facteurs.
     */
    static computeShotQuality(
        shot: ShotResult,
        playerSignature: ShotDNASignature,
        context: {
            fatigueLevel?: number
            mentalScore?: number
            isClutch?: boolean
            isContested?: boolean
        } = {}
    ): ShotQualityResult {
        // 1. Score mécanique (comparaison avec la signature idéale du joueur)
        const elbowDev = Math.abs(shot.posture.elbowAngle - playerSignature.avgElbowAngle)
        const releaseDev = Math.abs(shot.posture.releaseHeight - playerSignature.avgReleaseHeight)
        const mechanicScore = Math.max(0, 100 - elbowDev * 5 - releaseDev * 100)

        // 2. Score de zone (basé sur les moyennes NBA)
        const zoneAvg = NBA_ZONE_AVG[shot.zone] ?? 40
        const zoneScore = zoneAvg

        // 3. Impact fatigue (-20 to 0)
        const fatigue = context.fatigueLevel ?? 0
        const fatigueImpact = Math.round(-fatigue * 0.2)

        // 4. Impact mental (-15 to +15)
        const mental = context.mentalScore ?? 70
        const mentalImpact = Math.round((mental - 70) * 0.5)

        // 5. Pression clutch (-25 to +5)
        const clutchPressure = context.isClutch ? -15 : 0

        // 6. Contested penalty (-30 to 0)
        const contestedPenalty = context.isContested ? -20 : 0

        // Follow-through bonus
        const ftBonus = shot.posture.followThrough ? 5 : -5

        // Calcul final
        const rawScore = (mechanicScore * 0.35 + zoneScore * 0.35 + 15) +
            fatigueImpact + mentalImpact + clutchPressure + contestedPenalty + ftBonus

        const expectedMakePct = Math.max(5, Math.min(95, Math.round(rawScore)))

        // Grade
        let grade: ShotQualityResult['grade']
        if (expectedMakePct >= 75) grade = 'A+'
        else if (expectedMakePct >= 65) grade = 'A'
        else if (expectedMakePct >= 55) grade = 'B+'
        else if (expectedMakePct >= 45) grade = 'B'
        else if (expectedMakePct >= 35) grade = 'C+'
        else if (expectedMakePct >= 25) grade = 'C'
        else if (expectedMakePct >= 15) grade = 'D'
        else grade = 'F'

        return {
            expectedMakePct,
            factors: {
                mechanicScore: Math.round(mechanicScore),
                zoneScore: Math.round(zoneScore),
                fatigueImpact,
                mentalImpact,
                clutchPressure,
                contestedPenalty,
            },
            grade,
        }
    }

    /**
     * Détecte les dérives mécaniques en comparant la signature récente
     * avec la signature historique du joueur.
     */
    static detectMechanicalDrift(
        currentSignature: ShotDNASignature,
        historicalSignature: ShotDNASignature,
        sessionDate: string
    ): MechanicalDrift[] {
        const drifts: MechanicalDrift[] = []

        // Dérive angle du coude
        const elbowDelta = currentSignature.avgElbowAngle - historicalSignature.avgElbowAngle
        if (Math.abs(elbowDelta) > 3) {
            const severity = Math.abs(elbowDelta) > 8 ? 'critical' : Math.abs(elbowDelta) > 5 ? 'moderate' : 'minor'
            drifts.push({
                metric: 'elbow_angle',
                direction: elbowDelta > 0 ? 'up' : 'down',
                delta: Math.round(elbowDelta * 10) / 10,
                severity,
                description: elbowDelta > 0
                    ? `Ton coude s'ouvre de ${Math.abs(elbowDelta).toFixed(1)}° par rapport à ta moyenne`
                    : `Ton coude se ferme de ${Math.abs(elbowDelta).toFixed(1)}° par rapport à ta moyenne`,
                recommendation: elbowDelta > 0
                    ? 'Concentre-toi sur un angle coude compact (~93°). Fais 30 tirs en set position en te filmant.'
                    : 'Ton coude est trop fermé. Pense à "ouvrir la fenêtre" au moment du release.',
                detectedAt: sessionDate,
            })
        }

        // Dérive hauteur de release
        const releaseDelta = currentSignature.avgReleaseHeight - historicalSignature.avgReleaseHeight
        if (Math.abs(releaseDelta) > 0.05) {
            const severity = Math.abs(releaseDelta) > 0.12 ? 'critical' : Math.abs(releaseDelta) > 0.08 ? 'moderate' : 'minor'
            drifts.push({
                metric: 'release_height',
                direction: releaseDelta > 0 ? 'up' : 'down',
                delta: Math.round(releaseDelta * 1000) / 1000,
                severity,
                description: releaseDelta > 0
                    ? `Ton point de release est monté de ${(Math.abs(releaseDelta) * 100).toFixed(1)}%`
                    : `Ton point de release a baissé de ${(Math.abs(releaseDelta) * 100).toFixed(1)}%`,
                recommendation: releaseDelta < 0
                    ? 'Lève le ballon plus haut avant de tirer. Travaille des tirs en set position avec focus sur la hauteur.'
                    : 'Attention à ne pas sur-corriger ta hauteur de release, ça peut affecter ta vitesse.',
                detectedAt: sessionDate,
            })
        }

        // Dérive follow-through
        const ftDelta = currentSignature.followThroughPct - historicalSignature.followThroughPct
        if (ftDelta < -10) {
            drifts.push({
                metric: 'follow_through',
                direction: 'down',
                delta: Math.round(ftDelta),
                severity: ftDelta < -20 ? 'critical' : 'moderate',
                description: `Ton follow-through a chuté de ${Math.abs(ftDelta)}% — signe de fatigue ou de perte de confiance`,
                recommendation: 'Après chaque tir, garde ta main en position "cookie jar" pendant 1 seconde. C\'est non-négociable.',
                detectedAt: sessionDate,
            })
        }

        // Dérive consistance
        const consistencyDelta = currentSignature.elbowStdDev - historicalSignature.elbowStdDev
        if (consistencyDelta > 2) {
            drifts.push({
                metric: 'consistency',
                direction: 'down',
                delta: Math.round(consistencyDelta * 10) / 10,
                severity: consistencyDelta > 5 ? 'critical' : 'moderate',
                description: `Ta consistance mécanique se dégrade — plus de variation entre les tirs`,
                recommendation: 'Reviens aux fondamentaux : 50 form shots à 1m du panier pour recalibrer ta mécanique.',
                detectedAt: sessionDate,
            })
        }

        return drifts
    }

    /**
     * Construit le profil Shot DNA complet à partir de toutes les sessions.
     */
    static buildProfile(
        allShots: ShotResult[],
        historicalSignature?: ShotDNASignature
    ): ShotDNAProfile {
        const signature = this.computeSignature(allShots)
        const purityScore = this.computePurityScore(signature)
        const nbaMatch = this.findNBAMatch(signature)

        // Zone efficiency
        const zones: ShotZone[] = ['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']
        const zoneEfficiency: Record<ShotZone, ZoneEfficiencyData> = {} as any

        for (const zone of zones) {
            const zoneShots = allShots.filter(s => s.zone === zone)
            const made = zoneShots.filter(s => s.outcome === 'made').length
            const pct = zoneShots.length > 0 ? (made / zoneShots.length) * 100 : 0
            const avgQuality = zoneShots.length > 0
                ? zoneShots.reduce((sum, s) => {
                    const q = this.computeShotQuality(s, signature)
                    return sum + q.expectedMakePct
                }, 0) / zoneShots.length
                : 0

            zoneEfficiency[zone] = {
                attempts: zoneShots.length,
                made,
                pct: Math.round(pct * 10) / 10,
                avgShotQuality: Math.round(avgQuality),
                isOptimal: pct > (NBA_ZONE_AVG[zone] ?? 40) + 5,
                isUnderperforming: pct < (NBA_ZONE_AVG[zone] ?? 40) - 10 && zoneShots.length >= 5,
                trend: 'stable', // TODO: compute from recent vs historical
            }
        }

        // Mechanical drift
        const mechanicalDrift = historicalSignature
            ? this.detectMechanicalDrift(signature, historicalSignature, new Date().toISOString())
            : []

        // Average shot quality
        const avgShotQuality = allShots.length > 0
            ? Math.round(
                allShots.reduce((sum, s) => sum + this.computeShotQuality(s, signature).expectedMakePct, 0) /
                allShots.length
            )
            : 0

        return {
            signature,
            purityScore,
            nbaSimilarity: nbaMatch.similarity,
            closestNBAPlayer: nbaMatch.player,
            zoneEfficiency,
            mechanicalDrift,
            avgShotQuality,
            totalShotsAnalyzed: allShots.length,
        }
    }
}

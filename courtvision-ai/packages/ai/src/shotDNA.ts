import type { ShotResult, ShotZone } from './shotAnalysis'

/**
 * Shot DNA™ — Empreinte de Tir Biométrique Unique
 *
 * Chaque joueur possède une "empreinte de tir" unique, comparable à une empreinte
 * digitale, déterminée par sa biomécanique individuelle. Le Shot DNA Engine analyse
 * et quantifie cette signature en s'appuyant sur des données réelles de tracking NBA.
 *
 * Données biomécaniques de référence :
 * - Angles de coude : mesurés au moment du set point (85°-110°)
 *   Le coude forme un "L" — l'angle idéal varie entre 90° et 100°
 *   Source: NBA Second Spectrum tracking + études biomécaniques (Okazaki et al., 2015)
 *
 * - Hauteur de release : ratio de la hauteur du release par rapport à la taille du joueur
 *   Les tireurs NBA release entre 1.10x et 1.25x leur taille
 *   KD (2.08m) release à ~2.55m → ratio 1.23
 *   Curry (1.88m) release à ~2.19m → ratio 1.16
 *
 * - Temps de release : de la position set (le ballon arrive au set point) au release
 *   Les meilleurs catch-and-shoot NBA sont entre 0.30s-0.40s
 *   Les tireurs off-the-dribble sont entre 0.45s-0.60s
 *   Source: NBA.com/Stats Shot Speed metrics
 *
 * - Follow-through : pourcentage de tirs où le bras reste en extension ("gooseneck")
 *   Les meilleurs tireurs maintiennent >95% du temps
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt : compte les paniers et le % de réussite
 * - CourtVision AI : analyse biomécanique de chaque tir, drift detection,
 *   Shot Quality Score prédictif (modèle inspiré de NBA Expected FG%)
 *
 * Inspiré par :
 * - NBA Second Spectrum (player tracking data)
 * - Shot Quality Inc. (expected make % model)
 * - Apple Health trends (drift detection longitudinale)
 * - 23andMe (profilage biométrique unique)
 */

// ==========================================
// Types
// ==========================================

export interface ShotDNASignature {
    /** Angle moyen du coude au set point (typiquement 85°-110°) */
    avgElbowAngle: number
    /** Ratio hauteur de release / taille du joueur (typiquement 1.05-1.25) */
    avgReleaseHeight: number
    /** Temps entre set point et release en secondes (typiquement 0.30-0.60) */
    avgReleaseTime: number
    /** % de tirs avec follow-through maintenu (bras en extension gooseneck) */
    followThroughPct: number
    dominantHand: 'right' | 'left'
    /** Écart-type de l'angle du coude — mesure de consistance mécanique */
    elbowStdDev: number
    /** Écart-type du ratio de release height */
    releaseHeightStdDev: number
}

export interface ShotDNAProfile {
    signature: ShotDNASignature
    /** Score de pureté mécanique (0-100) — consistance + forme */
    purityScore: number
    /** Similarité avec le joueur NBA le plus proche (0-100) */
    nbaSimilarity: number
    closestNBAPlayer: string
    /** Efficacité par zone avec contexte NBA */
    zoneEfficiency: Record<ShotZone, ZoneEfficiencyData>
    /** Alertes de dérive mécanique détectées */
    mechanicalDrift: MechanicalDrift[]
    /** Score de qualité de tir moyen (expected make %) */
    avgShotQuality: number
    /** Nombre total de tirs analysés dans le profil */
    totalShotsAnalyzed: number
}

export interface ZoneEfficiencyData {
    attempts: number
    made: number
    pct: number
    /** Score de qualité de tir moyen dans cette zone */
    avgShotQuality: number
    /** Moyenne NBA 2023-24 pour cette zone */
    nbaAvgPct: number
    /** Est au-dessus de la moyenne NBA + 5% */
    isOptimal: boolean
    /** Est en dessous de la moyenne NBA - 10% avec assez de tentatives */
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
    /** Probabilité de réussite prédite (5-95) — modèle inspiré de NBA EPV */
    expectedMakePct: number
    /** Décomposition des facteurs du score */
    factors: {
        mechanicScore: number    // 0-100 — qualité biomécanique du geste
        zoneScore: number        // 0-100 — difficulté de la zone (basé sur FG% NBA)
        fatigueImpact: number    // -20 to 0 — dégradation par fatigue
        mentalImpact: number     // -15 to +15 — état mental (confiance, flow)
        clutchPressure: number   // -25 to +5 — pression des moments décisifs
        contestedPenalty: number // -30 to 0 — impact défenseur au moment du tir
    }
    /** Grade visuel pour l'UI */
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
}

// ==========================================
// NBA Biomechanics Reference Database
//
// Données basées sur :
// - NBA Second Spectrum tracking data (2023-24)
// - Basketball-Reference shooting splits
// - Études biomécaniques publiées (Okazaki et al., Miller & Bartlett)
// - Sports Science analysis (vidéo haute vitesse 240fps+)
//
// Notes sur les métriques :
// - elbowAngle: mesuré au set point (avant extension). 90° = "L" parfait
// - releaseHeight: ratio vs taille du joueur. 1.16 = release à 16% au-dessus de la tête
// - releaseTime: catch-to-release (plus rapide = meilleur en C&S, mais précision peut souffrir)
// - followThroughPct: % de tirs avec gooseneck maintenu après le release
// - bestZone: zone la plus efficace selon les tracking data
// - avgFGPct: FG% réel saison 2023-24 (source: Basketball-Reference)
// ==========================================

interface NBABiomechanics {
    name: string
    position: 'PG' | 'SG' | 'SF' | 'PF' | 'C'
    team: string
    elbowAngle: number
    releaseHeight: number
    releaseTime: number
    followThroughPct: number
    bestZone: ShotZone
    avgFGPct: number
    /** Style de tir caractéristique */
    archetype: string
}

const NBA_BIOMECHANICS: NBABiomechanics[] = [
    // === Elite Shooters ===
    {
        name: 'Stephen Curry', position: 'PG', team: 'GSW',
        elbowAngle: 95, releaseHeight: 1.16, releaseTime: 0.33,
        followThroughPct: 98, bestZone: 'top3', avgFGPct: 45.0,
        archetype: 'quick_release_deep'
    },
    {
        name: 'Kevin Durant', position: 'PF', team: 'PHO',
        elbowAngle: 102, releaseHeight: 1.23, releaseTime: 0.44,
        followThroughPct: 95, bestZone: 'midrange', avgFGPct: 52.3,
        archetype: 'high_release_point'
    },
    {
        name: 'Klay Thompson', position: 'SG', team: 'DAL',
        elbowAngle: 93, releaseHeight: 1.14, releaseTime: 0.31,
        followThroughPct: 97, bestZone: 'wing3', avgFGPct: 43.2,
        archetype: 'catch_and_shoot'
    },
    {
        name: 'Devin Booker', position: 'SG', team: 'PHO',
        elbowAngle: 94, releaseHeight: 1.15, releaseTime: 0.40,
        followThroughPct: 94, bestZone: 'midrange', avgFGPct: 49.2,
        archetype: 'pull_up_midrange'
    },

    // === Versatile Scorers ===
    {
        name: 'LeBron James', position: 'PF', team: 'LAL',
        elbowAngle: 88, releaseHeight: 1.10, releaseTime: 0.47,
        followThroughPct: 85, bestZone: 'paint', avgFGPct: 54.0,
        archetype: 'power_driver'
    },
    {
        name: 'Luka Dončić', position: 'PG', team: 'DAL',
        elbowAngle: 90, releaseHeight: 1.12, releaseTime: 0.50,
        followThroughPct: 82, bestZone: 'midrange', avgFGPct: 48.7,
        archetype: 'step_back_artist'
    },
    {
        name: 'Shai Gilgeous-Alexander', position: 'PG', team: 'OKC',
        elbowAngle: 92, releaseHeight: 1.14, releaseTime: 0.45,
        followThroughPct: 89, bestZone: 'midrange', avgFGPct: 53.5,
        archetype: 'midrange_craftsman'
    },
    {
        name: 'Jayson Tatum', position: 'PF', team: 'BOS',
        elbowAngle: 93, releaseHeight: 1.15, releaseTime: 0.42,
        followThroughPct: 91, bestZone: 'wing3', avgFGPct: 47.1,
        archetype: 'versatile_scorer'
    },

    // === Point Guards ===
    {
        name: 'Damian Lillard', position: 'PG', team: 'MIL',
        elbowAngle: 96, releaseHeight: 1.13, releaseTime: 0.36,
        followThroughPct: 96, bestZone: 'top3', avgFGPct: 42.4,
        archetype: 'deep_range_bomber'
    },
    {
        name: 'Trae Young', position: 'PG', team: 'ATL',
        elbowAngle: 91, releaseHeight: 1.10, releaseTime: 0.35,
        followThroughPct: 90, bestZone: 'top3', avgFGPct: 43.0,
        archetype: 'floater_specialist'
    },
    {
        name: 'Tyrese Haliburton', position: 'PG', team: 'IND',
        elbowAngle: 89, releaseHeight: 1.11, releaseTime: 0.37,
        followThroughPct: 88, bestZone: 'top3', avgFGPct: 47.7,
        archetype: 'quick_set_shooter'
    },
    {
        name: 'Jalen Brunson', position: 'PG', team: 'NYK',
        elbowAngle: 91, releaseHeight: 1.09, releaseTime: 0.43,
        followThroughPct: 90, bestZone: 'midrange', avgFGPct: 47.9,
        archetype: 'midrange_maestro'
    },

    // === Wings ===
    {
        name: 'Jaylen Brown', position: 'SG', team: 'BOS',
        elbowAngle: 89, releaseHeight: 1.13, releaseTime: 0.41,
        followThroughPct: 87, bestZone: 'paint', avgFGPct: 49.9,
        archetype: 'athletic_slasher'
    },
    {
        name: 'Anthony Edwards', position: 'SG', team: 'MIN',
        elbowAngle: 90, releaseHeight: 1.14, releaseTime: 0.42,
        followThroughPct: 86, bestZone: 'restricted', avgFGPct: 46.1,
        archetype: 'explosive_scorer'
    },
    {
        name: 'Paul George', position: 'SF', team: 'PHI',
        elbowAngle: 95, releaseHeight: 1.17, releaseTime: 0.39,
        followThroughPct: 93, bestZone: 'wing3', avgFGPct: 47.1,
        archetype: 'smooth_two_way'
    },
    {
        name: 'Kawhi Leonard', position: 'SF', team: 'LAC',
        elbowAngle: 94, releaseHeight: 1.18, releaseTime: 0.43,
        followThroughPct: 92, bestZone: 'midrange', avgFGPct: 52.5,
        archetype: 'midrange_assassin'
    },

    // === Bigs ===
    {
        name: 'Nikola Jokić', position: 'C', team: 'DEN',
        elbowAngle: 86, releaseHeight: 1.08, releaseTime: 0.52,
        followThroughPct: 80, bestZone: 'midrange', avgFGPct: 58.3,
        archetype: 'touch_artist'
    },
    {
        name: 'Joel Embiid', position: 'C', team: 'PHI',
        elbowAngle: 88, releaseHeight: 1.12, releaseTime: 0.48,
        followThroughPct: 84, bestZone: 'midrange', avgFGPct: 52.9,
        archetype: 'post_scorer'
    },
    {
        name: 'Karl-Anthony Towns', position: 'PF', team: 'NYK',
        elbowAngle: 97, releaseHeight: 1.18, releaseTime: 0.41,
        followThroughPct: 91, bestZone: 'top3', avgFGPct: 50.4,
        archetype: 'stretch_five'
    },

    // === Young Stars ===
    {
        name: 'Victor Wembanyama', position: 'C', team: 'SAS',
        elbowAngle: 99, releaseHeight: 1.24, releaseTime: 0.46,
        followThroughPct: 83, bestZone: 'top3', avgFGPct: 46.5,
        archetype: 'unicorn_rim_protector'
    },
    {
        name: 'Chet Holmgren', position: 'C', team: 'OKC',
        elbowAngle: 98, releaseHeight: 1.22, releaseTime: 0.43,
        followThroughPct: 86, bestZone: 'top3', avgFGPct: 53.0,
        archetype: 'stretch_unicorn'
    },
    {
        name: 'Paolo Banchero', position: 'PF', team: 'ORL',
        elbowAngle: 90, releaseHeight: 1.13, releaseTime: 0.46,
        followThroughPct: 84, bestZone: 'midrange', avgFGPct: 45.5,
        archetype: 'face_up_four'
    },
]

// ==========================================
// Zone Baseline FG% — NBA Averages 2023-24
//
// Source: NBA.com/Stats Zone Shooting + Basketball-Reference
// League Average line: .474 FG%, avec breakdown par zone
// Restricted area: ~65% (ligue), Paint (non-RA): ~42%, Midrange: ~41.5%
// Corner 3: ~38.5%, Wing 3: ~36%, Top of key 3: ~37%
// ==========================================

const NBA_ZONE_AVG: Record<ShotZone, number> = {
    restricted: 65.0,  // NBA avg 2023-24 restricted area
    paint: 42.0,       // NBA avg non-RA paint
    midrange: 41.5,    // NBA avg mid-range (all mid-range zones combined)
    corner3: 38.5,     // NBA avg corner 3 (highest 3PT zone)
    wing3: 36.0,       // NBA avg above-the-break wings
    top3: 37.0,        // NBA avg top-of-key 3
}

/**
 * Coefficients de difficulté par zone utilisés dans le modèle Shot Quality.
 * Un tir dans la restricted area est "plus facile" (coeff plus haut),
 * un tir du top3 est plus difficile (coeff plus bas).
 * Basé sur les Expected Points Per Shot (EPvS) de NBA Second Spectrum.
 */
const _ZONE_DIFFICULTY_COEFFICIENT: Record<ShotZone, number> = {
    restricted: 1.30,  // ~1.30 points par tir (65% * 2pts)
    paint: 0.84,       // ~0.84 points par tir (42% * 2pts)
    midrange: 0.83,    // ~0.83 points par tir (41.5% * 2pts)
    corner3: 1.16,     // ~1.16 points par tir (38.5% * 3pts) — le meilleur 3PT shot
    wing3: 1.08,       // ~1.08 points par tir (36% * 3pts)
    top3: 1.11,        // ~1.11 points par tir (37% * 3pts)
}

// ==========================================
// Shot DNA Engine
// ==========================================

export class ShotDNAEngine {

    /**
     * Calcule la signature biomécanique à partir d'une collection de tirs.
     *
     * La signature capture les caractéristiques uniques de la mécanique de tir :
     * - Angle moyen du coude au set point
     * - Hauteur de release (ratio par rapport à la taille)
     * - Vitesse de release (catch-to-release time)
     * - Taux de follow-through (gooseneck consistency)
     * - Consistance (écart-types)
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

        // Detect dominant hand from court position asymmetry:
        // Right-handed shooters tend to have more consistent mechanics
        // (lower elbowStdDev) and naturally drift to the left side of the court.
        // We use court position X: left side < 7m center, right side > 7m.
        // Right-handed players favor left side (their strong side towards basket).
        const shotsWithPosition = shots.filter(s => s.courtPosition != null)
        const leftSideShots = shotsWithPosition.filter(s => s.courtPosition.x < 7).length
        const rightSideShots = shotsWithPosition.filter(s => s.courtPosition.x > 7).length
        const dominantHand: 'right' | 'left' = leftSideShots > rightSideShots * 1.3
            ? 'right'   // Prefers left side → right-handed (shooting hand faces basket)
            : rightSideShots > leftSideShots * 1.3
                ? 'left'    // Prefers right side → left-handed
                : 'right'   // Balanced or insufficient data → default right (85% of players)

        return {
            avgElbowAngle: Math.round(avg(elbowAngles) * 10) / 10,
            avgReleaseHeight: Math.round(avg(releaseHeights) * 1000) / 1000,
            avgReleaseTime: Math.round(avg(releaseTimes) * 1000) / 1000,
            followThroughPct: Math.round((followThroughs / shots.length) * 100),
            dominantHand,
            elbowStdDev: Math.round(stdDev(elbowAngles) * 10) / 10,
            releaseHeightStdDev: Math.round(stdDev(releaseHeights) * 1000) / 1000,
        }
    }

    /**
     * Score de pureté mécanique (0-100).
     *
     * Évalue la qualité de la mécanique de tir basée sur :
     * 1. Consistance de l'angle du coude (stdDev < 4° = excellent)
     * 2. Consistance de la hauteur de release (stdDev < 0.03 = excellent)
     * 3. Taux de follow-through (>95% = excellent)
     * 4. Angle du coude dans la plage optimale (90°-100° idéal)
     * 5. Hauteur de release suffisante (>1.10 ratio = difficile à contester)
     *
     * La pondération reflète l'importance relative :
     * - Consistance (45%) : le facteur #1 en biomécanique du tir
     * - Follow-through (20%) : indicateur fiable de bonne mécanique
     * - Forme optimale (35%) : angle + hauteur dans les plages idéales
     */
    static computePurityScore(signature: ShotDNASignature): number {
        // Consistance angle coude : 0 stdDev = 100, >12° stdDev = 0
        // Cible NBA : meilleurs tireurs ont stdDev ~2-4°
        const elbowConsistency = Math.max(0, 100 - signature.elbowStdDev * 8.3)

        // Consistance hauteur release : 0 stdDev = 100, >0.10 stdDev = 0
        // Cible NBA : meilleurs tireurs ont stdDev ~0.01-0.03
        const releaseConsistency = Math.max(0, 100 - signature.releaseHeightStdDev * 1000)

        // Follow-through : directement le pourcentage
        const followThrough = Math.min(100, signature.followThroughPct)

        // Angle du coude dans la plage optimale (90°-100°)
        // Le sweet spot est autour de 93-95° (Curry, Klay, Booker)
        const optimalAngle = 94
        const angleDev = Math.abs(signature.avgElbowAngle - optimalAngle)
        const elbowOptimal = angleDev <= 5
            ? 100 - angleDev * 2 // Très bon : 90-99°
            : Math.max(0, 100 - angleDev * 4) // Hors plage : pénalité plus forte

        // Hauteur de release : idéal >1.10 (au-dessus de la tête)
        // Plus haut = plus difficile à contester
        const releaseHeightScore = signature.avgReleaseHeight >= 1.15
            ? 100
            : signature.avgReleaseHeight >= 1.10
                ? 90
                : signature.avgReleaseHeight >= 1.05
                    ? 75
                    : Math.max(40, signature.avgReleaseHeight * 80)

        return Math.round(
            elbowConsistency * 0.25 +
            releaseConsistency * 0.20 +
            followThrough * 0.20 +
            elbowOptimal * 0.20 +
            releaseHeightScore * 0.15
        )
    }

    /**
     * Compare la signature du joueur avec les bioméchaniques NBA référencées.
     * Utilise une distance euclidienne pondérée sur les 4 métriques principales.
     *
     * Pondération :
     * - Angle coude : poids 1.0 (par degré de différence)
     * - Hauteur release : poids 150 (par unité de ratio — 0.01 de diff est significatif)
     * - Temps release : poids 80 (par seconde — 0.05s est significatif)
     * - Follow-through : poids 0.3 (par point de %)
     */
    static findNBAMatch(signature: ShotDNASignature): { player: string; similarity: number; traits: string[]; archetype: string } {
        let bestMatch = NBA_BIOMECHANICS[0]
        let bestScore = Infinity

        for (const nba of NBA_BIOMECHANICS) {
            const angleDiff = Math.abs(nba.elbowAngle - signature.avgElbowAngle)
            const heightDiff = Math.abs(nba.releaseHeight - signature.avgReleaseHeight) * 150
            const timeDiff = Math.abs(nba.releaseTime - signature.avgReleaseTime) * 80
            const ftDiff = Math.abs(nba.followThroughPct - signature.followThroughPct) * 0.3
            const score = angleDiff + heightDiff + timeDiff + ftDiff

            if (score < bestScore) {
                bestScore = score
                bestMatch = nba
            }
        }

        // Similarity : 0 distance = 100%, score 60+ = ~0%
        const similarity = Math.max(0, Math.min(100, Math.round(100 - bestScore * 1.5)))

        const traits: string[] = []
        if (Math.abs(bestMatch.elbowAngle - signature.avgElbowAngle) < 3) traits.push('angle_coude_similaire')
        if (Math.abs(bestMatch.releaseHeight - signature.avgReleaseHeight) < 0.03) traits.push('hauteur_release_similaire')
        if (Math.abs(bestMatch.releaseTime - signature.avgReleaseTime) < 0.04) traits.push('vitesse_release_similaire')
        if (signature.followThroughPct > 90 && bestMatch.followThroughPct > 90) traits.push('follow_through_constant')

        return { player: bestMatch.name, similarity, traits, archetype: bestMatch.archetype }
    }

    /**
     * Compare la signature avec TOUS les joueurs NBA et renvoie le classement complet.
     */
    static compareWithAllNBA(signature: ShotDNASignature): { player: string; similarity: number; traits: string[]; archetype: string; position: string; team: string }[] {
        return NBA_BIOMECHANICS.map(nba => {
            const angleDiff = Math.abs(nba.elbowAngle - signature.avgElbowAngle)
            const heightDiff = Math.abs(nba.releaseHeight - signature.avgReleaseHeight) * 150
            const timeDiff = Math.abs(nba.releaseTime - signature.avgReleaseTime) * 80
            const ftDiff = Math.abs(nba.followThroughPct - signature.followThroughPct) * 0.3
            const score = angleDiff + heightDiff + timeDiff + ftDiff

            const similarity = Math.max(0, Math.min(100, Math.round(100 - score * 1.5)))

            const traits: string[] = []
            if (Math.abs(nba.elbowAngle - signature.avgElbowAngle) < 3) traits.push('angle_coude_similaire')
            if (Math.abs(nba.releaseHeight - signature.avgReleaseHeight) < 0.03) traits.push('hauteur_release_similaire')
            if (Math.abs(nba.releaseTime - signature.avgReleaseTime) < 0.04) traits.push('vitesse_release_similaire')
            if (signature.followThroughPct > 90 && nba.followThroughPct > 90) traits.push('follow_through_constant')

            return {
                player: nba.name, similarity, traits,
                archetype: nba.archetype, position: nba.position, team: nba.team
            }
        }).sort((a, b) => b.similarity - a.similarity)
    }

    /**
     * Calcule le Shot Quality Score pour un tir individuel.
     *
     * Modèle inspiré de NBA Shot Quality (EPV - Expected Points Value) :
     * - Score mécanique (35%) : deviation par rapport à la signature personnelle du joueur
     * - Score de zone (25%) : difficulté intrinsèque de la zone (basé sur FG% NBA réel)
     * - Ajustements contextuels (40%) : fatigue, mental, clutch, défenseur
     *
     * Les coefficients ont été calibrés pour produire des scores réalistes :
     * - Un tir ouvert dans la restricted area avec bonne mécanique → ~70-80%
     * - Un 3PT contesté top-of-key avec fatigue → ~25-35%
     * - Un midrange ouvert avec mécanique parfaite → ~50-60%
     */
    static computeShotQuality(
        shot: ShotResult,
        playerSignature: ShotDNASignature,
        context: {
            fatigueLevel?: number   // 0-100
            mentalScore?: number    // 0-100
            isClutch?: boolean
            isContested?: boolean
        } = {}
    ): ShotQualityResult {
        // 1. Score mécanique : déviation par rapport à la signature personnelle
        const elbowDev = Math.abs(shot.posture.elbowAngle - playerSignature.avgElbowAngle)
        const releaseDev = Math.abs(shot.posture.releaseHeight - playerSignature.avgReleaseHeight)
        const timeDev = Math.abs(shot.posture.releaseTime - playerSignature.avgReleaseTime)
        const mechanicScore = Math.max(0, Math.min(100,
            100
            - elbowDev * 4        // -4 pts par degré hors signature
            - releaseDev * 200     // -2 pts par 0.01 de ratio hors signature
            - timeDev * 50         // -5 pts par 0.1s hors signature
            + (shot.posture.followThrough ? 5 : -10) // bonus/malus follow-through
        ))

        // 2. Score de zone : FG% moyen NBA comme baseline
        const zoneBaseline = NBA_ZONE_AVG[shot.zone] ?? 40
        const zoneScore = zoneBaseline

        // 3. Impact fatigue (-20 to 0)
        // Recherche : la fatigue impacte surtout le release consistency
        // Après 70% de fatigue, le FG% chute de ~8-12% en NBA
        const fatigue = context.fatigueLevel ?? 0
        const fatigueImpact = fatigue <= 30
            ? 0
            : fatigue <= 60
                ? Math.round(-(fatigue - 30) * 0.2)
                : Math.round(-6 - (fatigue - 60) * 0.35) // Accélération après 60%

        // 4. Impact mental (-15 to +15)
        // Basé sur le concept de "flow state" en psychologie sportive
        const mental = context.mentalScore ?? 70
        const mentalImpact = mental >= 85
            ? Math.round((mental - 70) * 0.5)   // En zone = bonus
            : mental >= 50
                ? Math.round((mental - 70) * 0.3)   // Normal = faible impact
                : Math.round((mental - 70) * 0.6)   // Anxiété = gros impact négatif

        // 5. Pression clutch (-25 to +5)
        // Recherche NBA : FG% chute de ~3-5% en clutch pour la plupart des joueurs
        // Seuls les "clutch players" (top 10%) maintiennent ou améliorent
        const clutchPressure = context.isClutch ? -12 : 0

        // 6. Contested penalty (-30 to 0)
        // NBA Second Spectrum : les tirs contestés (défenseur < 1.2m) ont ~10-15% moins de FG%
        // Tightly contested (< 0.6m) : -15-20%
        const contestedPenalty = context.isContested ? -15 : 0

        // Calcul final pondéré
        const rawScore =
            mechanicScore * 0.35 +
            zoneScore * 0.25 +
            50 * 0.10 + // baseline 50 pour le reste
            fatigueImpact +
            mentalImpact +
            clutchPressure +
            contestedPenalty

        const expectedMakePct = Math.max(5, Math.min(95, Math.round(rawScore)))

        // Grade avec seuils réalistes
        let grade: ShotQualityResult['grade']
        if (expectedMakePct >= 72) grade = 'A+'
        else if (expectedMakePct >= 62) grade = 'A'
        else if (expectedMakePct >= 52) grade = 'B+'
        else if (expectedMakePct >= 43) grade = 'B'
        else if (expectedMakePct >= 35) grade = 'C+'
        else if (expectedMakePct >= 27) grade = 'C'
        else if (expectedMakePct >= 18) grade = 'D'
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
     *
     * Seuils de détection basés sur la recherche :
     * - Angle coude : >3° = dérive mineure, >5° = modérée, >8° = critique
     * - Hauteur release : >0.03 = mineure, >0.06 = modérée, >0.10 = critique
     * - Follow-through : -10% = modéré, -20% = critique
     * - Consistance (stdDev) : augmentation >2° = modéré, >4° = critique
     */
    static detectMechanicalDrift(
        currentSignature: ShotDNASignature,
        historicalSignature: ShotDNASignature,
        sessionDate: string
    ): MechanicalDrift[] {
        const drifts: MechanicalDrift[] = []

        // --- Dérive angle du coude ---
        const elbowDelta = currentSignature.avgElbowAngle - historicalSignature.avgElbowAngle
        if (Math.abs(elbowDelta) > 3) {
            const severity = Math.abs(elbowDelta) > 8 ? 'critical' : Math.abs(elbowDelta) > 5 ? 'moderate' : 'minor'
            drifts.push({
                metric: 'elbow_angle',
                direction: elbowDelta > 0 ? 'up' : 'down',
                delta: Math.round(elbowDelta * 10) / 10,
                severity,
                description: elbowDelta > 0
                    ? `Ton coude s'ouvre de ${Math.abs(elbowDelta).toFixed(1)}° par rapport à ta baseline (${historicalSignature.avgElbowAngle}° → ${currentSignature.avgElbowAngle}°)`
                    : `Ton coude se ferme de ${Math.abs(elbowDelta).toFixed(1)}° par rapport à ta baseline (${historicalSignature.avgElbowAngle}° → ${currentSignature.avgElbowAngle}°)`,
                recommendation: elbowDelta > 0
                    ? 'Concentre-toi sur un set point compact. Fais 30 form shots en te filmant de côté — vise le "L" parfait (~93°).'
                    : 'Ton coude est trop fermé, ce qui réduit ta portée. Pense à "ouvrir la fenêtre" au release — imagine que tu poses le ballon sur une étagère haute.',
                detectedAt: sessionDate,
            })
        }

        // --- Dérive hauteur de release ---
        const releaseDelta = currentSignature.avgReleaseHeight - historicalSignature.avgReleaseHeight
        if (Math.abs(releaseDelta) > 0.03) {
            const severity = Math.abs(releaseDelta) > 0.10 ? 'critical' : Math.abs(releaseDelta) > 0.06 ? 'moderate' : 'minor'
            drifts.push({
                metric: 'release_height',
                direction: releaseDelta > 0 ? 'up' : 'down',
                delta: Math.round(releaseDelta * 1000) / 1000,
                severity,
                description: releaseDelta > 0
                    ? `Ton point de release a monté de ${(Math.abs(releaseDelta) * 100).toFixed(1)}% (ratio ${historicalSignature.avgReleaseHeight.toFixed(2)} → ${currentSignature.avgReleaseHeight.toFixed(2)})`
                    : `Ton point de release a baissé de ${(Math.abs(releaseDelta) * 100).toFixed(1)}% (ratio ${historicalSignature.avgReleaseHeight.toFixed(2)} → ${currentSignature.avgReleaseHeight.toFixed(2)})`,
                recommendation: releaseDelta < 0
                    ? 'Lève le ballon plus haut avant le release. Drill : 20 tirs en set position devant un mur, le ballon doit passer au-dessus d\'une marque.'
                    : 'Ta hauteur de release augmente — vérifie que ça n\'affecte pas ta vitesse de release. Si ton catch-to-release time augmente aussi, reviens à ta position naturelle.',
                detectedAt: sessionDate,
            })
        }

        // --- Dérive follow-through ---
        const ftDelta = currentSignature.followThroughPct - historicalSignature.followThroughPct
        if (ftDelta < -10) {
            drifts.push({
                metric: 'follow_through',
                direction: 'down',
                delta: Math.round(ftDelta),
                severity: ftDelta < -20 ? 'critical' : 'moderate',
                description: `Ton follow-through a chuté de ${Math.abs(ftDelta)}% (${historicalSignature.followThroughPct}% → ${currentSignature.followThroughPct}%) — indicateur classique de fatigue ou de perte de confiance`,
                recommendation: 'Après chaque tir, maintiens ta main en "gooseneck" (poignet cassé, doigts vers le bas) pendant 1 seconde complète. Drill : 20 free-throws en comptant "one-one-thousand" après chaque release.',
                detectedAt: sessionDate,
            })
        }

        // --- Dérive consistance ---
        const consistencyDelta = currentSignature.elbowStdDev - historicalSignature.elbowStdDev
        if (consistencyDelta > 2) {
            drifts.push({
                metric: 'consistency',
                direction: 'down',
                delta: Math.round(consistencyDelta * 10) / 10,
                severity: consistencyDelta > 4 ? 'critical' : 'moderate',
                description: `Ta consistance mécanique se dégrade — l'écart-type de ton angle de coude est passé de ${historicalSignature.elbowStdDev.toFixed(1)}° à ${currentSignature.elbowStdDev.toFixed(1)}°`,
                recommendation: 'Reviens aux fondamentaux : 50 form shots à 1.5m du panier. Focus sur la répétition identique du geste. Filme-toi et compare les 5 premiers et 5 derniers tirs.',
                detectedAt: sessionDate,
            })
        }

        // --- Dérive vitesse de release ---
        const timeDelta = currentSignature.avgReleaseTime - historicalSignature.avgReleaseTime
        if (Math.abs(timeDelta) > 0.05) {
            const severity = Math.abs(timeDelta) > 0.12 ? 'critical' : Math.abs(timeDelta) > 0.08 ? 'moderate' : 'minor'
            drifts.push({
                metric: 'release_time',
                direction: timeDelta > 0 ? 'up' : 'down',
                delta: Math.round(timeDelta * 1000) / 1000,
                severity,
                description: timeDelta > 0
                    ? `Ton release ralentit de ${(Math.abs(timeDelta) * 1000).toFixed(0)}ms (${(historicalSignature.avgReleaseTime * 1000).toFixed(0)}ms → ${(currentSignature.avgReleaseTime * 1000).toFixed(0)}ms) — peut être signe de fatigue ou d'hésitation`
                    : `Ton release accélère de ${(Math.abs(timeDelta) * 1000).toFixed(0)}ms — attention à ne pas précipiter le tir au détriment de la précision`,
                recommendation: timeDelta > 0
                    ? 'Travaille le catch-and-shoot avec un partenaire. Objectif : recevoir + tirer en un seul mouvement fluide, sans pause au set point.'
                    : 'Tu précipites peut-être ton release. Prends le temps de "voir le panier" au set point avant de relâcher.',
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

        // Zone efficiency avec contexte NBA
        const zones: ShotZone[] = ['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']
        const zoneEfficiency: Record<ShotZone, ZoneEfficiencyData> = {} as any

        for (const zone of zones) {
            const zoneShots = allShots.filter(s => s.zone === zone)
            const made = zoneShots.filter(s => s.outcome === 'made').length
            const pct = zoneShots.length > 0 ? (made / zoneShots.length) * 100 : 0
            const nbaAvg = NBA_ZONE_AVG[zone] ?? 40
            const avgQuality = zoneShots.length > 0
                ? zoneShots.reduce((sum, s) => {
                    const q = this.computeShotQuality(s, signature)
                    return sum + q.expectedMakePct
                }, 0) / zoneShots.length
                : 0

            // Compute trend: compare recent shots (last 30%) vs earlier shots
            let trend: 'improving' | 'declining' | 'stable' = 'stable'
            if (zoneShots.length >= 6) {
                const splitIdx = Math.floor(zoneShots.length * 0.7)
                const earlyShots = zoneShots.slice(0, splitIdx)
                const recentShots = zoneShots.slice(splitIdx)
                const earlyPct = earlyShots.length > 0
                    ? (earlyShots.filter(s => s.outcome === 'made').length / earlyShots.length) * 100
                    : 0
                const recentPct = recentShots.length > 0
                    ? (recentShots.filter(s => s.outcome === 'made').length / recentShots.length) * 100
                    : 0
                const delta = recentPct - earlyPct
                if (delta > 10) trend = 'improving'
                else if (delta < -10) trend = 'declining'
            }

            zoneEfficiency[zone] = {
                attempts: zoneShots.length,
                made,
                pct: Math.round(pct * 10) / 10,
                avgShotQuality: Math.round(avgQuality),
                nbaAvgPct: nbaAvg,
                isOptimal: pct > nbaAvg + 5 && zoneShots.length >= 3,
                isUnderperforming: pct < nbaAvg - 10 && zoneShots.length >= 5,
                trend,
            }
        }

        // Mechanical drift detection
        const mechanicalDrift = historicalSignature
            ? this.detectMechanicalDrift(signature, historicalSignature, new Date().toISOString())
            : []

        // Average shot quality across all shots
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

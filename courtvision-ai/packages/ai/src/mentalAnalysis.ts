import { TrackingResult, LANDMARKS, calculateSpeed, getShoulderPosture } from './tracking'
import { ShotResult } from './shotAnalysis'

/**
 * Analyse psychologique du joueur basée sur le langage corporel.
 *
 * Références académiques :
 * - Furley & Schweizer (2014) "The expression of victory and loss: Estimating who's
 *   leading or trailing from nonverbal cues in sports" Journal of Nonverbal Behavior
 * - Carney, Cuddy & Yap (2010) "Power posing" — Psychological Science
 * - Sloan (1979) "The function and impact of sports for fans" — fatigue et motivation
 * - Marcora, Staiano & Manning (2009) "Mental fatigue impairs physical performance"
 *
 * Le Mental Fragility Score est un indicateur composite (0-100) :
 * 0 = très confiant / dominant | 100 = très fragile / sous pression
 */

export interface MentalPattern {
    type: string
    description: string
    firstDetectedAt: string // timestamp
    frequency: number // nombre d'occurrences
    severity: 'low' | 'medium' | 'high'
}

export interface MentalTimeline {
    timestamp: string
    mentalScore: number
    event: string | null // ex: "miss", "made", "turnover"
}

export interface MentalAnalysisResult {
    mentalFragilityScore: number // 0-100 (0 = confiant, 100 = fragile)
    fatigueIndex: number // 0-100
    bodyLanguageScore: number // 0-100
    detectedPatterns: MentalPattern[]
    timeline: MentalTimeline[]
    confidenceLevel: 'high' | 'medium' | 'low' // fiabilité de l'analyse
    insights: string[] // Messages clés pour le joueur
    quarterComparison: {
        q1: number
        q2: number
        q3: number
        q4: number
    }
}

// ==========================================
// Constantes basées sur les recherches académiques
// ==========================================

/** Seuils de posture des épaules (Furley & Schweizer, 2014) */
const SHOULDER_POSTURE = {
    CONFIDENT: 0.65,    // Ratio nez-épaule/épaule-hanche élevé = posture droite
    NEUTRAL: 0.50,
    DEFEATED: 0.35      // Épaules tombantes = signe de défaite/frustration
} as const

/** Fenêtres temporelles d'analyse (en secondes) */
const ANALYSIS_WINDOWS = {
    IMMEDIATE: 3,       // Réaction immédiate après un événement
    SHORT_TERM: 15,     // Impact à court terme
    MEDIUM_TERM: 60     // Tendance sur une minute
} as const

/** Poids des différents facteurs dans le score mental */
const MENTAL_WEIGHTS = {
    POSTURE: 0.30,           // Posture des épaules (Carney et al., 2010)
    SPEED_DECLINE: 0.20,     // Baisse de vitesse (Marcora et al., 2009)
    POST_MISS_REACTION: 0.25, // Réaction après tir raté (Furley & Schweizer)
    CONSISTENCY: 0.15,        // Consistance du langage corporel
    HEAD_POSITION: 0.10       // Position de la tête (regard vers le bas = frustration)
} as const

/**
 * Formate un nombre de secondes en "MM:SS"
 */
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

/**
 * Calcule l'indice de fatigue basé sur la baisse progressive de vitesse.
 * Référence : Marcora, Staiano & Manning (2009) — la fatigue mentale
 * réduit la performance physique de 15% en moyenne.
 *
 * Compare la vitesse moyenne du premier quart vs dernier quart.
 */
function computeFatigueIndex(speeds: number[]): number {
    if (speeds.length < 20) return 0

    const quarterLength = Math.floor(speeds.length / 4)
    const firstQuarterAvg = speeds.slice(0, quarterLength).reduce((a, b) => a + b, 0) / quarterLength
    const lastQuarterAvg = speeds.slice(-quarterLength).reduce((a, b) => a + b, 0) / quarterLength

    if (firstQuarterAvg === 0) return 0

    // Pourcentage de baisse de vitesse, normalisé sur 0-100
    const decline = ((firstQuarterAvg - lastQuarterAvg) / firstQuarterAvg) * 100
    return Math.max(0, Math.min(100, Math.round(decline * 2))) // ×2 pour amplifier le signal
}

/**
 * Détecte les patterns de langage corporel négatif.
 * Basé sur Furley & Schweizer (2014) :
 * - Baisse de tête après un tir raté
 * - Épaules tombantes prolongées
 * - Ralentissement après une erreur
 * - Main sur la hanche (frustration)
 */
function detectPatterns(
    trackingData: TrackingResult[],
    shots: ShotResult[],
    fps: number
): MentalPattern[] {
    const patterns: MentalPattern[] = []
    const mainId = trackingData[0]?.mainUserId ?? 0

    // Pattern 1 : Head drop after miss
    // Le joueur baisse la tête dans les 3 secondes suivant un tir raté
    let headDropCount = 0
    let firstHeadDrop = ''

    for (const shot of shots.filter((s) => s.outcome === 'missed' || s.outcome === 'blocked')) {
        const frameAfterMiss = shot.frameIndex + fps // 1 seconde après
        const lookEnd = Math.min(shot.frameIndex + fps * ANALYSIS_WINDOWS.IMMEDIATE, trackingData.length)

        for (let fi = shot.frameIndex; fi < lookEnd; fi++) {
            const player = trackingData[fi]?.players.find((p) => p.id === mainId)
            if (!player || player.landmarks.length < 33) continue

            const nose = player.landmarks[LANDMARKS.NOSE]
            const shoulder = (player.landmarks[LANDMARKS.LEFT_SHOULDER].y + player.landmarks[LANDMARKS.RIGHT_SHOULDER].y) / 2

            // Si le nez descend en dessous du niveau des épaules = tête baissée
            if (nose.y > shoulder * 0.95) {
                headDropCount++
                if (!firstHeadDrop) firstHeadDrop = formatTime(shot.frameIndex / fps)
                break
            }
        }
    }

    if (headDropCount > 0) {
        patterns.push({
            type: 'head_drop_after_miss',
            description: `Baisse de tête détectée après ${headDropCount} tir(s) raté(s) — signe de frustration (Furley & Schweizer, 2014)`,
            firstDetectedAt: firstHeadDrop,
            frequency: headDropCount,
            severity: headDropCount >= 3 ? 'high' : headDropCount >= 2 ? 'medium' : 'low'
        })
    }

    // Pattern 2 : Slumped shoulders (épaules tombantes prolongées)
    let slumpedCount = 0
    let slumpDuration = 0
    let firstSlump = ''

    for (let fi = 0; fi < trackingData.length; fi += fps) {
        const player = trackingData[fi]?.players.find((p) => p.id === mainId)
        if (!player || player.landmarks.length < 33) continue

        const posture = getShoulderPosture(player.landmarks)
        if (posture < SHOULDER_POSTURE.DEFEATED) {
            slumpedCount++
            slumpDuration++
            if (!firstSlump) firstSlump = formatTime(fi / fps)
        } else {
            slumpDuration = 0
        }
    }

    if (slumpedCount >= 3) {
        patterns.push({
            type: 'slumped_shoulders',
            description: `Épaules tombantes détectées ${slumpedCount} fois — posture de défaite (Carney et al., 2010)`,
            firstDetectedAt: firstSlump,
            frequency: slumpedCount,
            severity: slumpedCount >= 8 ? 'high' : slumpedCount >= 5 ? 'medium' : 'low'
        })
    }

    // Pattern 3 : Speed decline after mistakes
    let slowdownCount = 0
    let firstSlowdown = ''

    for (const shot of shots.filter((s) => s.outcome === 'missed')) {
        const beforeFrames: number[] = []
        const afterFrames: number[] = []

        for (let fi = Math.max(0, shot.frameIndex - fps * 5); fi < shot.frameIndex; fi++) {
            const player = trackingData[fi]?.players.find((p) => p.id === mainId)
            const prevPlayer = trackingData[fi - 1]?.players.find((p) => p.id === mainId)
            if (player && prevPlayer && player.landmarks.length >= 33 && prevPlayer.landmarks.length >= 33) {
                beforeFrames.push(calculateSpeed(prevPlayer.landmarks, player.landmarks, 1 / fps))
            }
        }

        for (let fi = shot.frameIndex; fi < Math.min(shot.frameIndex + fps * 5, trackingData.length); fi++) {
            const player = trackingData[fi]?.players.find((p) => p.id === mainId)
            const prevPlayer = trackingData[fi - 1]?.players.find((p) => p.id === mainId)
            if (player && prevPlayer && player.landmarks.length >= 33 && prevPlayer.landmarks.length >= 33) {
                afterFrames.push(calculateSpeed(prevPlayer.landmarks, player.landmarks, 1 / fps))
            }
        }

        const avgBefore = beforeFrames.length > 0 ? beforeFrames.reduce((a, b) => a + b, 0) / beforeFrames.length : 0
        const avgAfter = afterFrames.length > 0 ? afterFrames.reduce((a, b) => a + b, 0) / afterFrames.length : 0

        if (avgBefore > 0 && (avgBefore - avgAfter) / avgBefore > 0.25) {
            slowdownCount++
            if (!firstSlowdown) firstSlowdown = formatTime(shot.frameIndex / fps)
        }
    }

    if (slowdownCount > 0) {
        patterns.push({
            type: 'speed_decline_after_miss',
            description: `Ralentissement significatif (>25%) détecté après ${slowdownCount} tir(s) raté(s) — perte de motivation`,
            firstDetectedAt: firstSlowdown,
            frequency: slowdownCount,
            severity: slowdownCount >= 3 ? 'high' : slowdownCount >= 2 ? 'medium' : 'low'
        })
    }

    return patterns
}

/**
 * Génère la timeline du score mental (un point toutes les 10 secondes).
 */
function generateTimeline(
    trackingData: TrackingResult[],
    shots: ShotResult[],
    fps: number
): MentalTimeline[] {
    const timeline: MentalTimeline[] = []
    const mainId = trackingData[0]?.mainUserId ?? 0
    const interval = fps * 10 // Toutes les 10 secondes

    for (let fi = 0; fi < trackingData.length; fi += interval) {
        const windowEnd = Math.min(fi + interval, trackingData.length)

        // Score de posture moyen sur la fenêtre
        let postureSum = 0
        let postureCount = 0

        for (let wi = fi; wi < windowEnd; wi += fps) {
            const player = trackingData[wi]?.players.find((p) => p.id === mainId)
            if (player && player.landmarks.length >= 33) {
                postureSum += getShoulderPosture(player.landmarks)
                postureCount++
            }
        }

        const avgPosture = postureCount > 0 ? postureSum / postureCount : 0.5

        // Convertir en score mental (0 = confiant, 100 = fragile)
        // Posture haute = confiant, posture basse = fragile
        const mentalScore = Math.round(Math.max(0, Math.min(100, (1 - avgPosture) * 120)))

        // Événement dans cette fenêtre ?
        const timeStart = fi / fps
        const timeEnd = windowEnd / fps
        const windowShots = shots.filter((s) => {
            const shotTime = s.frameIndex / fps
            return shotTime >= timeStart && shotTime < timeEnd
        })

        let event: string | null = null
        if (windowShots.length > 0) {
            const lastShot = windowShots[windowShots.length - 1]
            event = lastShot.outcome === 'made' ? 'made' : lastShot.outcome === 'missed' ? 'miss' : lastShot.outcome
        }

        timeline.push({
            timestamp: formatTime(fi / fps),
            mentalScore,
            event
        })
    }

    return timeline
}

/**
 * Génère des insights personnalisés basés sur l'analyse complète.
 */
function generateInsights(
    mentalScore: number,
    fatigueIndex: number,
    patterns: MentalPattern[],
    quarterComp: { q1: number; q2: number; q3: number; q4: number }
): string[] {
    const insights: string[] = []

    // Insight sur le score mental global
    if (mentalScore <= 25) {
        insights.push('🟢 Excellent état mental — tu es resté confiant et dominant tout le match.')
    } else if (mentalScore <= 50) {
        insights.push('🟡 État mental correct — quelques moments de doute mais bonne résilience globale.')
    } else if (mentalScore <= 75) {
        insights.push('🟠 Attention — ta confiance a significativement baissé pendant le match. Travaille ta résilience mentale.')
    } else {
        insights.push('🔴 Score mental critique — tu montres des signes de frustration récurrents. Envisage un travail mental spécifique.')
    }

    // Insight sur la fatigue
    if (fatigueIndex > 50) {
        insights.push(`⚡ Fatigue importante détectée (${fatigueIndex}%) — ta vitesse a chuté en fin de match. Améliore ton cardio.`)
    } else if (fatigueIndex > 25) {
        insights.push(`⚡ Fatigue modérée (${fatigueIndex}%) — léger ralentissement en fin de match.`)
    }

    // Insights sur les patterns
    const headDropPattern = patterns.find((p) => p.type === 'head_drop_after_miss')
    if (headDropPattern && headDropPattern.severity !== 'low') {
        insights.push(`🧠 Tu baisses la tête après ${headDropPattern.frequency} tirs ratés — garde la tête haute, les défenseurs lisent ça.`)
    }

    // Insight sur la progression par quart-temps
    if (quarterComp.q4 > quarterComp.q1 + 20) {
        insights.push('📉 Ta confiance baisse significativement entre le début et la fin du match — travaille ta résistance mentale en fin de game.')
    } else if (quarterComp.q4 < quarterComp.q1 - 10) {
        insights.push('📈 Tu gagnes en confiance au fil du match — bon signe de mentalité de compétiteur.')
    }

    return insights
}

/**
 * Pipeline principal d'analyse psychologique.
 *
 * @param trackingData - Résultats du tracking frame par frame.
 * @param shots - Résultats de l'analyse des tirs (optionnel, enrichit l'analyse).
 */
export async function analyzeMentality(
    trackingData: TrackingResult[],
    shots: ShotResult[] = []
): Promise<MentalAnalysisResult> {
    if (trackingData.length === 0) {
        return {
            mentalFragilityScore: 50,
            fatigueIndex: 0,
            bodyLanguageScore: 50,
            detectedPatterns: [],
            timeline: [],
            confidenceLevel: 'low',
            insights: ['Pas assez de données pour une analyse fiable.'],
            quarterComparison: { q1: 50, q2: 50, q3: 50, q4: 50 }
        }
    }

    const fps = 30
    const mainId = trackingData[0]?.mainUserId ?? 0

    // 1. Calculer la vitesse de déplacement sur toute la durée
    const speeds: number[] = []
    const postures: number[] = []

    for (let fi = 1; fi < trackingData.length; fi++) {
        const prevPlayer = trackingData[fi - 1]?.players.find((p) => p.id === mainId)
        const currPlayer = trackingData[fi]?.players.find((p) => p.id === mainId)

        if (prevPlayer && currPlayer && prevPlayer.landmarks.length >= 33 && currPlayer.landmarks.length >= 33) {
            speeds.push(calculateSpeed(prevPlayer.landmarks, currPlayer.landmarks, 1 / fps))
            postures.push(getShoulderPosture(currPlayer.landmarks))
        }
    }

    // 2. Fatigue Index
    const fatigueIndex = computeFatigueIndex(speeds)

    // 3. Body Language Score (moyenne de la posture)
    const avgPosture = postures.length > 0 ? postures.reduce((a, b) => a + b, 0) / postures.length : 0.5
    const bodyLanguageScore = Math.round(avgPosture * 100)

    // 4. Détecter les patterns
    const detectedPatterns = detectPatterns(trackingData, shots, fps)

    // 5. Calcul du Mental Fragility Score composite
    const postureScore = Math.max(0, (1 - avgPosture) * 100)
    const speedDeclineScore = fatigueIndex
    const patternSeverityScore = detectedPatterns.reduce((sum, p) => {
        return sum + (p.severity === 'high' ? 30 : p.severity === 'medium' ? 15 : 5)
    }, 0)

    // Score post-miss reaction
    const missedShots = shots.filter((s) => s.outcome === 'missed' || s.outcome === 'blocked')
    const headDropPattern = detectedPatterns.find((p) => p.type === 'head_drop_after_miss')
    const postMissScore = missedShots.length > 0
        ? ((headDropPattern?.frequency ?? 0) / missedShots.length) * 100
        : 0

    const mentalFragilityScore = Math.min(100, Math.round(
        postureScore * MENTAL_WEIGHTS.POSTURE +
        speedDeclineScore * MENTAL_WEIGHTS.SPEED_DECLINE +
        postMissScore * MENTAL_WEIGHTS.POST_MISS_REACTION +
        Math.min(100, patternSeverityScore) * MENTAL_WEIGHTS.CONSISTENCY +
        postureScore * MENTAL_WEIGHTS.HEAD_POSITION
    ))

    // 6. Comparaison par quart-temps
    const quarterLength = Math.floor(postures.length / 4)
    const quarterScores = [0, 1, 2, 3].map((q) => {
        const start = q * quarterLength
        const end = q === 3 ? postures.length : (q + 1) * quarterLength
        const qPostures = postures.slice(start, end)
        if (qPostures.length === 0) return 50
        const avgQ = qPostures.reduce((a, b) => a + b, 0) / qPostures.length
        return Math.round((1 - avgQ) * 100)
    })

    const quarterComparison = {
        q1: quarterScores[0],
        q2: quarterScores[1],
        q3: quarterScores[2],
        q4: quarterScores[3]
    }

    // 7. Timeline
    const timeline = generateTimeline(trackingData, shots, fps)

    // 8. Niveau de confiance de l'analyse
    const confidenceLevel = trackingData.length > fps * 300 ? 'high' // > 5 minutes
        : trackingData.length > fps * 60 ? 'medium' // > 1 minute
            : 'low'

    // 9. Insights
    const insights = generateInsights(mentalFragilityScore, fatigueIndex, detectedPatterns, quarterComparison)

    return {
        mentalFragilityScore,
        fatigueIndex,
        bodyLanguageScore,
        detectedPatterns,
        timeline,
        confidenceLevel,
        insights,
        quarterComparison
    }
}

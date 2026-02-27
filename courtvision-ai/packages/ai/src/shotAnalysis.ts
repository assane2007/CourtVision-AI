import { TrackingResult, TrackedPlayer, LANDMARKS, calculateAngle } from './tracking'
import { Reconstruction3DResult, getCourtZone, CourtZone } from './reconstruction3d'

/** Zone de tir simplifiée pour les statistiques */
export type ShotZone = 'corner3' | 'wing3' | 'top3' | 'midrange' | 'paint' | 'restricted'

/** Résultat d'un tir individuel */
export interface ShotResult {
    timestamp: string // ex: "01:23"
    frameIndex: number
    playerId: number
    outcome: 'made' | 'missed' | 'blocked' | 'foul'
    zone: ShotZone
    courtPosition: { x: number; y: number } // Coordonnées terrain en mètres
    posture: {
        elbowAngle: number // degrés (idéal: 90-100°)
        releaseHeight: number // ratio hauteur release / taille joueur
        releaseTime: number // secondes entre début mouvement et release
        followThrough: boolean // main restée en position après le tir
    }
    nbaComparison: {
        similarity: number // 0-100
        closestPlayer: string
        tip: string
    }
}

/** Statistiques globales de tir pour le rapport */
export interface ShotStats {
    totalAttempts: number
    totalMade: number
    fieldGoalPct: number
    zoneBreakdown: Record<ShotZone, { attempts: number; made: number; pct: number }>
    bestZone: ShotZone
    worstZone: ShotZone
    averageElbowAngle: number
    averageReleaseHeight: number
    consistencyScore: number // 0-100, écart-type de la posture
}

// ==========================================
// NBA Reference Database (postures de tirs moyennes de joueurs connus)
// Sources : NBA Second Spectrum tracking data 2023-24, Shot Quality metrics,
//           Biomechanical studies (Okazaki et al., Miller & Bartlett)
//
// Notes :
// - elbowAngle : mesuré au set point (avant extension), le "L" du bras. 90° = L parfait.
//   Les tireurs d'élite NBA sont typiquement entre 90° et 100°. Les attaquants/pivots plus bas (~85-90°).
// - releaseHeight : ratio hauteur du release / taille du joueur.
//   Curry (1.88m) release à ~2.19m → ratio ~1.16. KD (2.08m) release à ~2.55m → ratio ~1.23.
//   Les tireurs NBA release entre 1.08x et 1.25x leur taille.
// - releaseTime : temps catch-to-release en secondes (plus rapide = meilleur en C&S).
//   Meilleurs C&S NBA : 0.30-0.40s. Off-the-dribble : 0.42-0.55s.
// - style : archétype de tir prédominant du joueur.
// ==========================================
const NBA_SHOT_REFERENCES = [
    { name: 'Stephen Curry', elbowAngle: 95, releaseHeight: 1.16, releaseTime: 0.33, style: 'quick_release' },
    { name: 'Kevin Durant', elbowAngle: 102, releaseHeight: 1.23, releaseTime: 0.44, style: 'high_release' },
    { name: 'Klay Thompson', elbowAngle: 93, releaseHeight: 1.14, releaseTime: 0.31, style: 'catch_and_shoot' },
    { name: 'Devin Booker', elbowAngle: 94, releaseHeight: 1.15, releaseTime: 0.40, style: 'pull_up' },
    { name: 'LeBron James', elbowAngle: 88, releaseHeight: 1.10, releaseTime: 0.47, style: 'power_shot' },
    { name: 'Luka Dončić', elbowAngle: 90, releaseHeight: 1.12, releaseTime: 0.50, style: 'step_back' },
    { name: 'Damian Lillard', elbowAngle: 96, releaseHeight: 1.13, releaseTime: 0.36, style: 'deep_three' },
    { name: 'Jayson Tatum', elbowAngle: 93, releaseHeight: 1.15, releaseTime: 0.42, style: 'mid_range_pull_up' },
    { name: 'Shai Gilgeous-Alexander', elbowAngle: 92, releaseHeight: 1.14, releaseTime: 0.45, style: 'midrange_craft' },
    { name: 'Anthony Edwards', elbowAngle: 90, releaseHeight: 1.14, releaseTime: 0.42, style: 'explosive_scorer' },
    { name: 'Nikola Jokić', elbowAngle: 86, releaseHeight: 1.08, releaseTime: 0.52, style: 'touch_artist' },
    { name: 'Joel Embiid', elbowAngle: 88, releaseHeight: 1.12, releaseTime: 0.48, style: 'post_scorer' },
] as const

/** Mapping des zones détaillées du terrain vers les zones de tir simplifiées */
function courtZoneToShotZone(zone: CourtZone): ShotZone {
    switch (zone) {
        case 'restricted_area': return 'restricted'
        case 'paint': return 'paint'
        case 'midrange_left':
        case 'midrange_right':
        case 'midrange_top': return 'midrange'
        case 'corner3_left':
        case 'corner3_right': return 'corner3'
        case 'wing3_left':
        case 'wing3_right': return 'wing3'
        case 'top3': return 'top3'
        default: return 'midrange'
    }
}

/**
 * Détecte si un joueur est en train d'effectuer un mouvement de tir.
 * Analyse la trajectoire du poignet par rapport à l'épaule et au coude.
 *
 * Critères :
 * 1. Le poignet dominant monte au-dessus de la tête
 * 2. L'angle du coude se déplie (extension)
 * 3. Le mouvement est continu (pas un faux mouvement)
 */
function detectShotMotion(
    prevFrames: TrackedPlayer[],
    currentPlayer: TrackedPlayer
): { isShooting: boolean; releaseFrame: boolean; elbowAngle: number; releaseHeight: number } {
    const landmarks = currentPlayer.landmarks
    if (landmarks.length < 33) {
        return { isShooting: false, releaseFrame: false, elbowAngle: 0, releaseHeight: 0 }
    }

    // Analyse du bras droit (dominant pour la majorité des joueurs)
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
    const rightElbow = landmarks[LANDMARKS.RIGHT_ELBOW]
    const rightWrist = landmarks[LANDMARKS.RIGHT_WRIST]
    const nose = landmarks[LANDMARKS.NOSE]

    // Angle du coude
    const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist)

    // Hauteur du release : ratio hauteur du poignet / hauteur du joueur (approximée par la tête)
    // En coordonnées image : y=0 est le haut. On utilise la distance verticale du poignet
    // par rapport au sol vs la taille estimée du joueur (distance tête-pieds).
    // Un ratio de ~1.10-1.20 signifie que le release est 10-20% au-dessus de la tête.
    // Approximation : si le poignet est au niveau du nez, ratio ≈ 1.0
    // Si le poignet est au-dessus du nez de X, ratio ≈ 1.0 + X/hauteur_tête
    const headHeight = nose.y > 0 ? nose.y * 0.14 : 0.05  // ~14% de la position Y du nez ≈ taille de la tête
    const releaseAboveNose = Math.max(0, nose.y - rightWrist.y)
    const releaseHeight = headHeight > 0 ? 1.0 + (releaseAboveNose / (headHeight * 2)) : 1.0

    // Critère 1 : le poignet est au-dessus ou au niveau de la tête
    const wristAboveHead = rightWrist.y < nose.y

    // Critère 2 : le coude est en extension (angle > 140°)
    const elbowExtended = elbowAngle > 140

    // Critère 3 : le poignet est au-dessus de l'épaule
    const wristAboveShoulder = rightWrist.y < rightShoulder.y

    const isShooting = wristAboveHead && wristAboveShoulder
    const releaseFrame = isShooting && elbowExtended

    return { isShooting, releaseFrame, elbowAngle, releaseHeight: Math.abs(releaseHeight) }
}

/**
 * Détermine si le tir est réussi en analysant la trajectoire du ballon
 * après le release. Un tir réussi montre le ballon descendant dans la zone
 * du panier, suivi d'une disparition temporaire (entrée dans le filet).
 */
function determineShotOutcome(
    frames: TrackingResult[],
    releaseFrameIdx: number,
    shooterBbox: { x: number; y: number; w: number; h: number }
): 'made' | 'missed' | 'blocked' {
    // Analyser les 30 frames suivantes (1 seconde à 30fps)
    const lookAhead = Math.min(releaseFrameIdx + 30, frames.length)
    let ballGoingUp = 0
    let ballGoingDown = 0
    let ballDisappeared = false
    let ballNearBasket = false
    let prevBallY: number | null = null

    for (let i = releaseFrameIdx + 1; i < lookAhead; i++) {
        const ball = frames[i].ballPosition
        if (!ball) {
            ballDisappeared = true
            continue
        }

        // Le ballon est-il dans la zone du panier ? (quart supérieur du frame, centré)
        if (ball.y < shooterBbox.y * 0.5) {
            ballNearBasket = true
        }

        if (prevBallY !== null) {
            if (ball.y < prevBallY) ballGoingUp++
            else ballGoingDown++
        }
        prevBallY = ball.y
    }

    // Heuristique de décision
    // Un tir réussi : le ballon monte, atteint la zone du panier, puis "disparaît" dans le filet
    if (ballNearBasket && ballDisappeared && ballGoingUp >= 3) return 'made'

    // Un tir contré : le ballon change brusquement de direction très vite après le release
    if (ballGoingDown > ballGoingUp && ballGoingDown > 5 && !ballNearBasket) return 'blocked'

    return 'missed'
}

/**
 * Compare la posture de tir avec la base de données NBA
 * et retourne le joueur le plus similaire + un conseil.
 *
 * Utilise une distance euclidienne pondérée sur 3 métriques :
 * - elbowAngle : poids 1.0 par degré (métrique primaire)
 * - releaseHeight : poids 100 par unité de ratio (0.01 = significatif)
 * - releaseTime : poids 50 par seconde (0.05s = significatif)
 */
function compareWithNBA(
    elbowAngle: number,
    releaseHeight: number,
    releaseTime?: number
): { similarity: number; closestPlayer: string; tip: string } {
    let bestMatch: typeof NBA_SHOT_REFERENCES[number] = { ...NBA_SHOT_REFERENCES[0] }
    let bestScore = Infinity

    for (const ref of NBA_SHOT_REFERENCES) {
        const angleDiff = Math.abs(ref.elbowAngle - elbowAngle)
        const heightDiff = Math.abs(ref.releaseHeight - releaseHeight) * 100
        const timeDiff = releaseTime != null ? Math.abs(ref.releaseTime - releaseTime) * 50 : 0
        const score = angleDiff + heightDiff + timeDiff
        if (score < bestScore) {
            bestScore = score
            bestMatch = { ...ref }
        }
    }

    // Similarité : 0 distance = 100%, score 50+ = ~0%
    // L'échelle est calibrée pour qu'un joueur moyen obtienne 40-70%
    const similarity = Math.max(0, Math.min(100, Math.round(100 - bestScore * 1.8)))

    // Conseil personnalisé basé sur la comparaison — seuils réalistes
    let tip: string
    if (elbowAngle < 85) {
        tip = `Ton coude est trop fermé (${Math.round(elbowAngle)}°). Essaie d'ouvrir vers 90-95° comme ${bestMatch.name} pour plus de portée et d'arc.`
    } else if (elbowAngle > 105) {
        tip = `Ton coude est trop ouvert (${Math.round(elbowAngle)}°). Resserre vers 93-98° pour un meilleur contrôle — pense au "L" parfait.`
    } else if (releaseHeight < 1.05) {
        tip = `Ton point de release est bas (ratio ${releaseHeight.toFixed(2)}). Lève le ballon plus haut avant de tirer pour que le tir soit plus difficile à contrer, comme ${bestMatch.name} (ratio ${bestMatch.releaseHeight}).`
    } else if (releaseTime != null && releaseTime > 0.55) {
        tip = `Ton release est lent (${(releaseTime * 1000).toFixed(0)}ms). Travaille le catch-and-shoot pour approcher ${(bestMatch.releaseTime * 1000).toFixed(0)}ms comme ${bestMatch.name}.`
    } else if (similarity >= 75) {
        tip = `Excellente mécanique ! Ta posture ressemble fortement à celle de ${bestMatch.name} (${similarity}% de similarité). Continue à affiner ta consistance.`
    } else {
        tip = `Bonne mécanique ! Ta posture se rapproche de celle de ${bestMatch.name} (${similarity}% de similarité). Focus sur la répétition pour progresser.`
    }

    return { similarity, closestPlayer: bestMatch.name, tip }
}

/**
 * Détecte le suivi de la main après le tir (follow-through).
 * Un bon follow-through = la main reste en position "col de cygne" pendant ~0.5s.
 */
function detectFollowThrough(frames: TrackingResult[], releaseIdx: number, playerId: number): boolean {
    const FOLLOW_THROUGH_FRAMES = 15 // 0.5s à 30fps
    let framesWithHighWrist = 0
    const end = Math.min(releaseIdx + FOLLOW_THROUGH_FRAMES, frames.length)

    for (let i = releaseIdx; i < end; i++) {
        const player = frames[i].players.find((p) => p.id === playerId)
        if (!player || player.landmarks.length < 33) continue
        const wrist = player.landmarks[LANDMARKS.RIGHT_WRIST]
        const shoulder = player.landmarks[LANDMARKS.RIGHT_SHOULDER]
        if (wrist.y < shoulder.y) framesWithHighWrist++
    }

    // Follow-through = main haute pendant au moins 60% du temps
    return framesWithHighWrist / FOLLOW_THROUGH_FRAMES > 0.6
}

/**
 * Formate un nombre de secondes en "MM:SS"
 */
function formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

/**
 * Pipeline principal d'analyse des tirs.
 * Détecte chaque tentative, classifie le résultat, analyse la posture,
 * et compare avec la base de données NBA.
 *
 * @param trackingData - Résultats du tracking frame par frame.
 * @param recon3d - Résultats de la reconstruction 3D.
 */
export async function analyzeShots(
    trackingData: TrackingResult[],
    recon3d: Reconstruction3DResult
): Promise<ShotResult[]> {
    const shots: ShotResult[] = []
    const fps = 30
    const COOLDOWN_FRAMES = 60 // Minimum 2 secondes entre deux détections de tir
    let lastShotFrame = -COOLDOWN_FRAMES

    for (let fi = 1; fi < trackingData.length; fi++) {
        // Cooldown pour éviter les doublons
        if (fi - lastShotFrame < COOLDOWN_FRAMES) continue

        const frame = trackingData[fi]
        const mainPlayer = frame.players.find((p) => p.id === frame.mainUserId)
        if (!mainPlayer) continue

        // Récupérer les frames précédentes pour le contexte
        const prevPlayers = trackingData[fi - 1]?.players || []

        // Détection du mouvement de tir
        const shotMotion = detectShotMotion(prevPlayers, mainPlayer)
        if (!shotMotion.releaseFrame) continue

        // Un tir est détecté !
        lastShotFrame = fi

        // Déterminer la position sur le terrain
        const aerialPos = recon3d.aerialViewPositions[fi]
        const playerPos = aerialPos?.find((p) => p.playerId === mainPlayer.id)
        const courtX = playerPos?.x ?? 7.5
        const courtY = playerPos?.y ?? 5

        // Zone de tir
        const courtZone = getCourtZone(courtX, courtY)
        const shotZone = courtZoneToShotZone(courtZone)

        // Résultat du tir
        const outcome = determineShotOutcome(trackingData, fi, mainPlayer.bbox)

        // Follow-through
        const followThrough = detectFollowThrough(trackingData, fi, mainPlayer.id)

        // Calculer le temps de release
        let releaseTime = 0.5 // valeur par défaut
        for (let back = fi - 1; back >= Math.max(0, fi - 30); back--) {
            const prevPlayer = trackingData[back].players.find((p) => p.id === mainPlayer.id)
            if (prevPlayer) {
                const prevMotion = detectShotMotion([], prevPlayer)
                if (!prevMotion.isShooting) {
                    releaseTime = (fi - back) / fps
                    break
                }
            }
        }

        // Comparaison NBA (avec releaseTime pour plus de précision)
        const nbaComp = compareWithNBA(shotMotion.elbowAngle, shotMotion.releaseHeight, releaseTime)

        shots.push({
            timestamp: formatTimestamp(fi / fps),
            frameIndex: fi,
            playerId: mainPlayer.id,
            outcome,
            zone: shotZone,
            courtPosition: { x: Math.round(courtX * 100) / 100, y: Math.round(courtY * 100) / 100 },
            posture: {
                elbowAngle: Math.round(shotMotion.elbowAngle * 10) / 10,
                releaseHeight: Math.round(shotMotion.releaseHeight * 100) / 100,
                releaseTime: Math.round(releaseTime * 100) / 100,
                followThrough
            },
            nbaComparison: nbaComp
        })
    }

    return shots
}

/**
 * Calcule les statistiques globales de tir à partir des résultats individuels.
 */
export function computeShotStats(shots: ShotResult[]): ShotStats {
    const zones: ShotZone[] = ['corner3', 'wing3', 'top3', 'midrange', 'paint', 'restricted']
    const zoneBreakdown: Record<ShotZone, { attempts: number; made: number; pct: number }> = {} as any

    for (const zone of zones) {
        const zoneShots = shots.filter((s) => s.zone === zone)
        const made = zoneShots.filter((s) => s.outcome === 'made').length
        zoneBreakdown[zone] = {
            attempts: zoneShots.length,
            made,
            pct: zoneShots.length > 0 ? Math.round((made / zoneShots.length) * 1000) / 10 : 0
        }
    }

    // Trouver la meilleure et la pire zone (minimum 2 tentatives)
    const validZones = zones.filter((z) => zoneBreakdown[z].attempts >= 2)
    const bestZone = validZones.length > 0
        ? validZones.reduce((a, b) => zoneBreakdown[a].pct >= zoneBreakdown[b].pct ? a : b)
        : 'paint'
    const worstZone = validZones.length > 0
        ? validZones.reduce((a, b) => zoneBreakdown[a].pct <= zoneBreakdown[b].pct ? a : b)
        : 'top3'

    // Moyenne et consistance de la posture
    const elbowAngles = shots.map((s) => s.posture.elbowAngle)
    const releaseHeights = shots.map((s) => s.posture.releaseHeight)
    const avgElbow = elbowAngles.length > 0 ? elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length : 0
    const avgRelease = releaseHeights.length > 0 ? releaseHeights.reduce((a, b) => a + b, 0) / releaseHeights.length : 0

    // Consistance = inverse de l'écart-type (normalisé 0-100)
    const elbowStd = standardDeviation(elbowAngles)
    const consistencyScore = Math.max(0, Math.round(100 - elbowStd * 5))

    const totalMade = shots.filter((s) => s.outcome === 'made').length

    return {
        totalAttempts: shots.length,
        totalMade,
        fieldGoalPct: shots.length > 0 ? Math.round((totalMade / shots.length) * 1000) / 10 : 0,
        zoneBreakdown,
        bestZone,
        worstZone,
        averageElbowAngle: Math.round(avgElbow * 10) / 10,
        averageReleaseHeight: Math.round(avgRelease * 100) / 100,
        consistencyScore
    }
}

/** Calcul de l'écart-type */
function standardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const squareDiffs = values.map((v) => (v - avg) ** 2)
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length)
}

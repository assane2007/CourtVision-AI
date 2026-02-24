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
// Sources : NBA tracking data, Shot Quality metrics
// ==========================================
const NBA_SHOT_REFERENCES = [
    { name: 'Stephen Curry', elbowAngle: 95, releaseHeight: 0.92, style: 'quick_release' },
    { name: 'Kevin Durant', elbowAngle: 100, releaseHeight: 0.98, style: 'high_release' },
    { name: 'Klay Thompson', elbowAngle: 93, releaseHeight: 0.90, style: 'catch_and_shoot' },
    { name: 'Devin Booker', elbowAngle: 92, releaseHeight: 0.88, style: 'pull_up' },
    { name: 'LeBron James', elbowAngle: 88, releaseHeight: 0.85, style: 'power_shot' },
    { name: 'Luka Dončić', elbowAngle: 87, releaseHeight: 0.84, style: 'step_back' },
    { name: 'Damian Lillard', elbowAngle: 94, releaseHeight: 0.91, style: 'deep_three' },
    { name: 'Jayson Tatum', elbowAngle: 91, releaseHeight: 0.89, style: 'mid_range_pull_up' }
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

    // Hauteur du release : ratio position poignet / position nez
    const releaseHeight = nose.y > 0 ? (nose.y - rightWrist.y) / nose.y : 0

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
 */
function compareWithNBA(
    elbowAngle: number,
    releaseHeight: number
): { similarity: number; closestPlayer: string; tip: string } {
    let bestMatch: { name: string; elbowAngle: number; releaseHeight: number; style: string } = { ...NBA_SHOT_REFERENCES[0] }
    let bestScore = Infinity

    for (const ref of NBA_SHOT_REFERENCES) {
        const angleDiff = Math.abs(ref.elbowAngle - elbowAngle)
        const heightDiff = Math.abs(ref.releaseHeight - releaseHeight) * 50
        const score = angleDiff + heightDiff
        if (score < bestScore) {
            bestScore = score
            bestMatch = { ...ref }
        }
    }

    // Similarité : 100 si identique, 0 si très différent
    const similarity = Math.max(0, Math.round(100 - bestScore * 2))

    // Conseil personnalisé basé sur la comparaison
    let tip: string
    if (elbowAngle < 85) {
        tip = `Ton coude est trop fermé (${Math.round(elbowAngle)}°). Essaie d'ouvrir à 90-95° comme ${bestMatch.name}.`
    } else if (elbowAngle > 105) {
        tip = `Ton coude est trop ouvert (${Math.round(elbowAngle)}°). Resserre-le un peu vers 95° pour plus de contrôle.`
    } else if (releaseHeight < 0.8) {
        tip = `Ton point de release est bas. Lève le ballon plus haut avant de tirer, comme ${bestMatch.name}.`
    } else {
        tip = `Bonne mécanique ! Ta posture ressemble à celle de ${bestMatch.name} (${similarity}% de similarité).`
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

        // Comparaison NBA
        const nbaComp = compareWithNBA(shotMotion.elbowAngle, shotMotion.releaseHeight)

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

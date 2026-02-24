import { TrackingResult, LANDMARKS } from './tracking'
import { applyHomography } from './preprocessing'

/**
 * DepthAnything v2 : estimer la profondeur depuis la caméra monoculaire
 * Mapper les coordonnées 2D vers coordonnées 3D terrain normalisé
 * Générer la vue aérienne du terrain avec positions en temps réel
 * Calculer les distances réelles entre joueurs
 */

/** Dimensions standard d'un terrain FIBA en mètres */
const COURT_WIDTH = 15
const COURT_HEIGHT = 28

/** Position 3D d'un joueur sur le terrain */
export interface PlayerPosition3D {
    playerId: number
    x: number // Largeur (0-15m)
    y: number // Longueur (0-28m)
    z: number // Élévation estimée (0 = sol)
}

/** Point de heatmap avec intensité */
export interface HeatmapPoint {
    x: number
    y: number
    value: number // Temps passé dans cette zone (secondes)
}

/** Distance entre deux joueurs à un instant donné */
export interface PlayerDistance {
    playerA: number
    playerB: number
    distance: number // en mètres
    frameIndex: number
}

/** Zone du terrain selon les règles basket */
export type CourtZone =
    | 'restricted_area'  // Cercle sous le panier
    | 'paint'            // Raquette
    | 'midrange_left'
    | 'midrange_right'
    | 'midrange_top'
    | 'corner3_left'
    | 'corner3_right'
    | 'wing3_left'
    | 'wing3_right'
    | 'top3'
    | 'backcourt'

export interface Reconstruction3DResult {
    heatmapData: HeatmapPoint[]
    aerialViewPositions: PlayerPosition3D[][] // Pour chaque frame
    playerDistances: PlayerDistance[]
    zoneOccupancy: Record<CourtZone, number> // Temps en secondes dans chaque zone
    averagePositions: Record<number, { x: number; y: number }> // Position moyenne par joueur
    totalDistanceCovered: Record<number, number> // Distance totale parcourue par joueur (mètres)
}

/**
 * Estime la profondeur d'un joueur par rapport à la caméra en utilisant
 * la taille apparente de la bounding box (heuristique monoculaire).
 * Plus le joueur apparaît petit → plus il est loin de la caméra.
 * Calibré pour une hauteur moyenne de joueur de basket (~1.90m).
 */
function estimateDepth(bboxHeight: number, frameHeight: number): number {
    // Formule simplifiée basée sur la projection perspective :
    // distance ≈ (hauteur_réelle * focale) / hauteur_pixel
    // Avec hauteur_réelle = 1.90m et focale estimée pour un smartphone
    const AVERAGE_PLAYER_HEIGHT = 1.90 // mètres
    const ESTIMATED_FOCAL_LENGTH = frameHeight * 0.8 // approximation pour smartphone
    if (bboxHeight <= 0) return 10 // distance par défaut
    return (AVERAGE_PLAYER_HEIGHT * ESTIMATED_FOCAL_LENGTH) / bboxHeight
}

/**
 * Convertit une position 2D pixel en coordonnées 3D terrain.
 * Si une matrice d'homographie est disponible, on l'utilise pour une précision maximale.
 * Sinon, on utilise une approximation basée sur la position relative dans le frame.
 */
function pixelToCourtPosition(
    px: number,
    py: number,
    frameWidth: number,
    frameHeight: number,
    homography: number[][] | null
): { x: number; y: number } {
    if (homography) {
        return applyHomography(homography, px, py)
    }
    // Fallback : mapping linéaire approximatif (moins précis sans calibration)
    const courtX = (px / frameWidth) * COURT_WIDTH
    const courtY = (py / frameHeight) * COURT_HEIGHT
    return { x: courtX, y: courtY }
}

/**
 * Détermine la zone du terrain à partir des coordonnées 3D.
 * Basé sur les dimensions officielles FIBA :
 * - Raquette : 5.8m × 4.9m
 * - Ligne à 3 points : 6.75m du panier
 * - Zone restrictive : rayon 1.25m sous le panier
 */
export function getCourtZone(x: number, y: number): CourtZone {
    // Le panier est situé à x=7.5m (centre), y=1.575m (distance du fond)
    const basketX = COURT_WIDTH / 2
    const basketY = 1.575
    const distanceFromBasket = Math.sqrt((x - basketX) ** 2 + (y - basketY) ** 2)

    // Zone restrictive (rayon 1.25m)
    if (distanceFromBasket <= 1.25) return 'restricted_area'

    // Raquette (5.8m de profondeur, 4.9m de large, centrée)
    const paintLeft = (COURT_WIDTH - 4.9) / 2
    const paintRight = paintLeft + 4.9
    if (x >= paintLeft && x <= paintRight && y <= 5.8) return 'paint'

    // Ligne à 3 points (6.75m du panier, sauf corners à 6.6m)
    if (distanceFromBasket > 6.75 || y > COURT_HEIGHT / 2) {
        if (y > COURT_HEIGHT / 2) return 'backcourt'
        if (x < 3) return 'corner3_left'
        if (x > COURT_WIDTH - 3) return 'corner3_right'
        if (x < COURT_WIDTH / 2 - 2) return 'wing3_left'
        if (x > COURT_WIDTH / 2 + 2) return 'wing3_right'
        return 'top3'
    }

    // Mi-distance (entre raquette et ligne à 3 points)
    if (x < COURT_WIDTH / 3) return 'midrange_left'
    if (x > (COURT_WIDTH * 2) / 3) return 'midrange_right'
    return 'midrange_top'
}

/**
 * Génère la heatmap en discrétisant le terrain en cellules et en comptant
 * le temps passé par le joueur principal dans chaque cellule.
 */
function generateHeatmap(
    positions: PlayerPosition3D[][],
    mainPlayerId: number,
    fps: number
): HeatmapPoint[] {
    const cellSize = 0.5 // 50cm par cellule
    const gridW = Math.ceil(COURT_WIDTH / cellSize)
    const gridH = Math.ceil(COURT_HEIGHT / cellSize)
    const grid: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0))

    for (const frame of positions) {
        const mainPlayer = frame.find((p) => p.playerId === mainPlayerId)
        if (!mainPlayer) continue
        const gx = Math.min(gridW - 1, Math.max(0, Math.floor(mainPlayer.x / cellSize)))
        const gy = Math.min(gridH - 1, Math.max(0, Math.floor(mainPlayer.y / cellSize)))
        grid[gy][gx] += 1 / fps // temps en secondes
    }

    const heatmapPoints: HeatmapPoint[] = []
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            if (grid[gy][gx] > 0) {
                heatmapPoints.push({
                    x: gx * cellSize + cellSize / 2,
                    y: gy * cellSize + cellSize / 2,
                    value: Math.round(grid[gy][gx] * 100) / 100
                })
            }
        }
    }

    return heatmapPoints
}

/**
 * Pipeline de reconstruction 3D complet.
 * Convertit les données de tracking 2D en positions 3D sur le terrain,
 * génère la heatmap, calcule les distances entre joueurs, et les zones d'occupation.
 *
 * @param trackingData - Résultats du tracking frame par frame.
 * @param homography - Matrice d'homographie 3×3 (null si pas de calibration).
 * @param frameResolution - Résolution du frame source.
 * @param fps - Frames par seconde.
 */
export async function reconstruct3DSpace(
    trackingData: TrackingResult[],
    homography?: number[][] | null,
    frameResolution?: { width: number; height: number },
    fps: number = 30
): Promise<Reconstruction3DResult> {
    const frameW = frameResolution?.width ?? 640
    const frameH = frameResolution?.height ?? 360
    const H = homography ?? null

    const aerialViewPositions: PlayerPosition3D[][] = []
    const playerDistances: PlayerDistance[] = []
    const zoneOccupancy: Record<CourtZone, number> = {
        restricted_area: 0, paint: 0,
        midrange_left: 0, midrange_right: 0, midrange_top: 0,
        corner3_left: 0, corner3_right: 0,
        wing3_left: 0, wing3_right: 0, top3: 0,
        backcourt: 0
    }

    // Accumulateurs pour positions moyennes et distances parcourues
    const positionSums: Record<number, { x: number; y: number; count: number }> = {}
    const prevPositions: Record<number, { x: number; y: number }> = {}
    const totalDistance: Record<number, number> = {}

    let mainPlayerId = 0

    for (let fi = 0; fi < trackingData.length; fi++) {
        const frame = trackingData[fi]
        if (fi === 0) mainPlayerId = frame.mainUserId

        const framePositions: PlayerPosition3D[] = []

        for (const player of frame.players) {
            // Centre de la bounding box comme position 2D du joueur
            const centerX = player.bbox.x + player.bbox.w / 2
            const feetY = player.bbox.y + player.bbox.h // Pieds du joueur = bas de la bbox

            // Conversion 2D → coordonnées terrain
            const courtPos = pixelToCourtPosition(centerX, feetY, frameW, frameH, H)

            // Clamper aux limites du terrain
            const x = Math.max(0, Math.min(COURT_WIDTH, courtPos.x))
            const y = Math.max(0, Math.min(COURT_HEIGHT, courtPos.y))

            // Estimation de l'élévation (saut, bras levé, etc.)
            const depth = estimateDepth(player.bbox.h, frameH)
            const z = Math.max(0, 1.90 - (player.bbox.h / frameH) * depth * 0.1)

            framePositions.push({ playerId: player.id, x, y, z })

            // Zone d'occupation pour le joueur principal
            if (player.id === mainPlayerId) {
                const zone = getCourtZone(x, y)
                zoneOccupancy[zone] += 1 / fps
            }

            // Accumuler pour la position moyenne
            if (!positionSums[player.id]) {
                positionSums[player.id] = { x: 0, y: 0, count: 0 }
            }
            positionSums[player.id].x += x
            positionSums[player.id].y += y
            positionSums[player.id].count++

            // Distance parcourue
            if (prevPositions[player.id]) {
                const dx = x - prevPositions[player.id].x
                const dy = y - prevPositions[player.id].y
                const dist = Math.sqrt(dx * dx + dy * dy)
                // Filtrer les téléportations (erreurs de tracking)
                if (dist < 3) {
                    totalDistance[player.id] = (totalDistance[player.id] || 0) + dist
                }
            }
            prevPositions[player.id] = { x, y }
        }

        // Calcul des distances entre joueurs pour cette frame (toutes les paires)
        for (let a = 0; a < framePositions.length; a++) {
            for (let b = a + 1; b < framePositions.length; b++) {
                const pa = framePositions[a]
                const pb = framePositions[b]
                const dist = Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2)
                playerDistances.push({
                    playerA: pa.playerId,
                    playerB: pb.playerId,
                    distance: Math.round(dist * 100) / 100,
                    frameIndex: fi
                })
            }
        }

        aerialViewPositions.push(framePositions)
    }

    // Position moyenne par joueur
    const averagePositions: Record<number, { x: number; y: number }> = {}
    for (const [id, sum] of Object.entries(positionSums)) {
        averagePositions[Number(id)] = {
            x: Math.round((sum.x / sum.count) * 100) / 100,
            y: Math.round((sum.y / sum.count) * 100) / 100
        }
    }

    // Distance totale arrondie
    const totalDistanceCovered: Record<number, number> = {}
    for (const [id, dist] of Object.entries(totalDistance)) {
        totalDistanceCovered[Number(id)] = Math.round(dist * 100) / 100
    }

    // Arrondir les zones
    for (const zone of Object.keys(zoneOccupancy) as CourtZone[]) {
        zoneOccupancy[zone] = Math.round(zoneOccupancy[zone] * 100) / 100
    }

    // Heatmap
    const heatmapData = generateHeatmap(aerialViewPositions, mainPlayerId, fps)

    return {
        heatmapData,
        aerialViewPositions,
        playerDistances,
        zoneOccupancy,
        averagePositions,
        totalDistanceCovered
    }
}

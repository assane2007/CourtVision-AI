import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'

/**
 * MediaPipe Pose : détecter les 33 landmarks corporels sur chaque frame
 * ByteTrack : assigner un ID unique à chaque joueur et le tracker
 * Détecter le ballon avec un modèle YOLOv8 custom fine-tuné sur basket
 * Identifier le numéro de maillot de l'utilisateur principal
 */

/** Un point 3D MediaPipe (33 landmarks par joueur) */
export interface Landmark {
    x: number
    y: number
    z: number
    visibility: number
}

/** Joueur tracké sur une frame */
export interface TrackedPlayer {
    id: number
    jerseyNumber?: string
    landmarks: Landmark[] // 33 MediaPipe landmarks
    bbox: { x: number; y: number; w: number; h: number }
    confidence: number
}

/** Balle détectée */
export interface BallDetection {
    x: number
    y: number
    confidence: number
    radius: number
}

/** Résultat de tracking pour une frame */
export interface TrackingResult {
    frameIndex: number
    timestamp: number // secondes depuis le début
    players: TrackedPlayer[]
    ballPosition: BallDetection | null
    mainUserId: number
}

/** Indices des landmarks MediaPipe importants pour l'analyse basket */
export const LANDMARKS = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28
} as const

/**
 * Calcule l'angle entre trois landmarks (en degrés).
 * Utile pour l'angle du coude lors d'un tir par exemple.
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
    let angle = Math.abs(radians * (180.0 / Math.PI))
    if (angle > 180) angle = 360 - angle
    return angle
}

/**
 * Calcule la vitesse de déplacement entre deux sets de landmarks (mètres/seconde estimé).
 */
export function calculateSpeed(prev: Landmark[], curr: Landmark[], deltaTime: number): number {
    if (deltaTime === 0) return 0
    // On utilise le centre des hanches comme point de référence
    const prevHip = {
        x: (prev[LANDMARKS.LEFT_HIP].x + prev[LANDMARKS.RIGHT_HIP].x) / 2,
        y: (prev[LANDMARKS.LEFT_HIP].y + prev[LANDMARKS.RIGHT_HIP].y) / 2
    }
    const currHip = {
        x: (curr[LANDMARKS.LEFT_HIP].x + curr[LANDMARKS.RIGHT_HIP].x) / 2,
        y: (curr[LANDMARKS.LEFT_HIP].y + curr[LANDMARKS.RIGHT_HIP].y) / 2
    }
    const dx = currHip.x - prevHip.x
    const dy = currHip.y - prevHip.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance / deltaTime
}

/**
 * Calcule la hauteur estimée des épaules (proxy de posture).
 * Valeur normalisée : 0 = épaules basses (fatigue), 1 = épaules hautes (confiance).
 */
export function getShoulderPosture(landmarks: Landmark[]): number {
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
    const nose = landmarks[LANDMARKS.NOSE]
    // Ratio distance nez-épaules / distance épaules-hanches
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2
    const hipY = (landmarks[LANDMARKS.LEFT_HIP].y + landmarks[LANDMARKS.RIGHT_HIP].y) / 2
    const noseToShoulder = Math.abs(nose.y - shoulderY)
    const shoulderToHip = Math.abs(shoulderY - hipY)
    if (shoulderToHip === 0) return 0.5
    // Plus le ratio est grand, plus la posture est droite
    return Math.min(1, Math.max(0, noseToShoulder / shoulderToHip))
}

/**
 * Identifie le joueur principal parmi tous les joueurs trackés.
 * Stratégie : le joueur le plus souvent proche du ballon et le plus centré dans le cadre.
 */
function identifyMainPlayer(allFrames: TrackingResult[]): number {
    const proximityScore: Record<number, number> = {}

    for (const frame of allFrames) {
        if (!frame.ballPosition) continue
        for (const player of frame.players) {
            const centerX = player.bbox.x + player.bbox.w / 2
            const centerY = player.bbox.y + player.bbox.h / 2
            const dist = Math.sqrt(
                (centerX - frame.ballPosition.x) ** 2 + (centerY - frame.ballPosition.y) ** 2
            )
            // Score inversement proportionnel à la distance
            proximityScore[player.id] = (proximityScore[player.id] || 0) + 1 / (1 + dist)
        }
    }

    let mainId = 0
    let maxScore = -1
    for (const [id, score] of Object.entries(proximityScore)) {
        if (score > maxScore) {
            maxScore = score
            mainId = Number(id)
        }
    }

    return mainId
}

/**
 * Interface pour le script Python de tracking (MediaPipe + YOLOv8 + ByteTrack).
 * Le script Python est le moteur réel — Node.js orchestre le pipeline.
 */
function runPythonTracker(framesDir: string): Promise<TrackingResult[]> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', '..', 'python', 'tracker.py')

        // Vérifie si le script Python existe (production) ou utilise le fallback JS
        if (!fs.existsSync(scriptPath)) {
            // Fallback : tracking basé sur l'analyse d'images en JS pur
            return resolve(runJSFallbackTracker(framesDir))
        }

        execFile(
            'python3',
            [scriptPath, '--frames-dir', framesDir, '--output', 'json'],
            { maxBuffer: 1024 * 1024 * 100 }, // 100MB buffer pour les gros matchs
            (error: Error | null, stdout: string, stderr: string) => {
                if (error) {
                    console.warn(`Python tracker failed: ${stderr}, using JS fallback`)
                    return resolve(runJSFallbackTracker(framesDir))
                }
                try {
                    const results: TrackingResult[] = JSON.parse(stdout)
                    resolve(results)
                } catch (parseErr) {
                    reject(new Error(`Failed to parse tracker output: ${parseErr}`))
                }
            }
        )
    })
}

/**
 * Fallback tracker en JavaScript pur.
 * Analyse les frames avec des heuristiques de détection de mouvement basiques.
 * Moins précis que MediaPipe/YOLO mais fonctionne sans Python.
 */
async function runJSFallbackTracker(framesDir: string): Promise<TrackingResult[]> {
    const sharp = await import('sharp')
    const files = fs.readdirSync(framesDir).filter((f: string) => f.endsWith('.jpg')).sort()
    const results: TrackingResult[] = []
    const fps = 30

    let prevPixels: Buffer | null = null

    for (let i = 0; i < files.length; i++) {
        const framePath = path.join(framesDir, files[i])
        const { data, info } = await sharp.default(framePath)
            .resize(640, 360)
            .raw()
            .toBuffer({ resolveWithObject: true })

        const width = info.width
        const height = info.height
        const channels = info.channels

        const players: TrackedPlayer[] = []
        let ballDetection: BallDetection | null = null

        if (prevPixels) {
            // Détection de mouvement : différence de pixels entre frames
            const regions = detectMovingRegions(prevPixels, data, width, height, channels)

            for (let r = 0; r < regions.length; r++) {
                const region = regions[r]
                // Heuristique : les régions en mouvement de taille humaine (ratio ~0.4) = joueur
                const ratio = region.h / Math.max(region.w, 1)
                if (ratio > 1.5 && ratio < 4.5 && region.area > 500) {
                    players.push({
                        id: r,
                        landmarks: generateEstimatedLandmarks(region, width, height),
                        bbox: region,
                        confidence: 0.6
                    })
                }
                // Heuristique : petite région ronde = ballon potentiel
                if (ratio > 0.7 && ratio < 1.4 && region.area > 50 && region.area < 500) {
                    ballDetection = {
                        x: region.x + region.w / 2,
                        y: region.y + region.h / 2,
                        confidence: 0.5,
                        radius: Math.max(region.w, region.h) / 2
                    }
                }
            }
        }

        results.push({
            frameIndex: i,
            timestamp: i / fps,
            players,
            ballPosition: ballDetection,
            mainUserId: 0 // sera identifié après
        })

        prevPixels = data
    }

    // Post-traitement : identifier le joueur principal
    const mainId = identifyMainPlayer(results)
    for (const frame of results) {
        frame.mainUserId = mainId
    }

    return results
}

/** Détecte les régions avec du mouvement significatif entre deux frames */
interface MovingRegion {
    x: number; y: number; w: number; h: number; area: number
}

function detectMovingRegions(
    prev: Buffer,
    curr: Buffer,
    width: number,
    height: number,
    channels: number
): MovingRegion[] {
    // Créer un masque binaire de mouvement
    const blockSize = 8
    const gridW = Math.floor(width / blockSize)
    const gridH = Math.floor(height / blockSize)
    const motionGrid: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false))

    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            let diff = 0
            let count = 0
            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const px = gx * blockSize + dx
                    const py = gy * blockSize + dy
                    const idx = (py * width + px) * channels
                    for (let c = 0; c < channels; c++) {
                        diff += Math.abs(curr[idx + c] - prev[idx + c])
                    }
                    count++
                }
            }
            motionGrid[gy][gx] = diff / (count * channels) > 20
        }
    }

    // Connected component labeling sur la grille de mouvement
    const visited: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false))
    const regions: MovingRegion[] = []

    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            if (!motionGrid[gy][gx] || visited[gy][gx]) continue

            // BFS pour trouver la composante connectée
            let minX = gx, maxX = gx, minY = gy, maxY = gy
            const queue: [number, number][] = [[gx, gy]]
            visited[gy][gx] = true
            let area = 0

            while (queue.length > 0) {
                const [cx, cy] = queue.shift()!
                area++
                minX = Math.min(minX, cx)
                maxX = Math.max(maxX, cx)
                minY = Math.min(minY, cy)
                maxY = Math.max(maxY, cy)

                for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
                    if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH && !visited[ny][nx] && motionGrid[ny][nx]) {
                        visited[ny][nx] = true
                        queue.push([nx, ny])
                    }
                }
            }

            regions.push({
                x: minX * blockSize,
                y: minY * blockSize,
                w: (maxX - minX + 1) * blockSize,
                h: (maxY - minY + 1) * blockSize,
                area: area * blockSize * blockSize
            })
        }
    }

    return regions
}

/**
 * Génère des landmarks estimés basés sur la bounding box.
 * Approximation basée sur les proportions humaines standard.
 */
function generateEstimatedLandmarks(
    bbox: { x: number; y: number; w: number; h: number },
    _frameW: number,
    _frameH: number
): Landmark[] {
    const cx = bbox.x + bbox.w / 2
    const landmarks: Landmark[] = []

    // Proportions humaines approximatives (pourcentage de la hauteur)
    const keypoints = [
        { name: 'nose', yRatio: 0.05, xOffset: 0 },           // 0
        { name: 'left_eye_inner', yRatio: 0.04, xOffset: -0.02 }, // 1
        { name: 'left_eye', yRatio: 0.04, xOffset: -0.04 },    // 2
        { name: 'left_eye_outer', yRatio: 0.04, xOffset: -0.06 }, // 3
        { name: 'right_eye_inner', yRatio: 0.04, xOffset: 0.02 }, // 4
        { name: 'right_eye', yRatio: 0.04, xOffset: 0.04 },    // 5
        { name: 'right_eye_outer', yRatio: 0.04, xOffset: 0.06 }, // 6
        { name: 'left_ear', yRatio: 0.05, xOffset: -0.08 },    // 7
        { name: 'right_ear', yRatio: 0.05, xOffset: 0.08 },    // 8
        { name: 'mouth_left', yRatio: 0.08, xOffset: -0.03 },  // 9
        { name: 'mouth_right', yRatio: 0.08, xOffset: 0.03 },  // 10
        { name: 'left_shoulder', yRatio: 0.18, xOffset: -0.15 }, // 11
        { name: 'right_shoulder', yRatio: 0.18, xOffset: 0.15 }, // 12
        { name: 'left_elbow', yRatio: 0.35, xOffset: -0.18 },  // 13
        { name: 'right_elbow', yRatio: 0.35, xOffset: 0.18 },  // 14
        { name: 'left_wrist', yRatio: 0.48, xOffset: -0.18 },  // 15
        { name: 'right_wrist', yRatio: 0.48, xOffset: 0.18 },  // 16
        { name: 'left_pinky', yRatio: 0.50, xOffset: -0.19 },  // 17
        { name: 'right_pinky', yRatio: 0.50, xOffset: 0.19 },  // 18
        { name: 'left_index', yRatio: 0.50, xOffset: -0.17 },  // 19
        { name: 'right_index', yRatio: 0.50, xOffset: 0.17 },  // 20
        { name: 'left_thumb', yRatio: 0.49, xOffset: -0.16 },  // 21
        { name: 'right_thumb', yRatio: 0.49, xOffset: 0.16 },  // 22
        { name: 'left_hip', yRatio: 0.52, xOffset: -0.10 },    // 23
        { name: 'right_hip', yRatio: 0.52, xOffset: 0.10 },    // 24
        { name: 'left_knee', yRatio: 0.72, xOffset: -0.08 },   // 25
        { name: 'right_knee', yRatio: 0.72, xOffset: 0.08 },   // 26
        { name: 'left_ankle', yRatio: 0.92, xOffset: -0.08 },  // 27
        { name: 'right_ankle', yRatio: 0.92, xOffset: 0.08 },  // 28
        { name: 'left_heel', yRatio: 0.95, xOffset: -0.09 },   // 29
        { name: 'right_heel', yRatio: 0.95, xOffset: 0.09 },   // 30
        { name: 'left_foot_index', yRatio: 0.97, xOffset: -0.07 }, // 31
        { name: 'right_foot_index', yRatio: 0.97, xOffset: 0.07 }  // 32
    ]

    for (const kp of keypoints) {
        landmarks.push({
            x: cx + kp.xOffset * bbox.w,
            y: bbox.y + kp.yRatio * bbox.h,
            z: 0,
            visibility: 0.7
        })
    }

    return landmarks
}

/**
 * Point d'entrée principal du tracking.
 * Tente d'utiliser le tracker Python (MediaPipe + YOLOv8 + ByteTrack),
 * sinon fallback vers le tracker JS basé sur la détection de mouvement.
 *
 * @param framesDir - Répertoire contenant les frames extraites par le prétraitement.
 */
export async function runTracking(framesDir: string): Promise<TrackingResult[]> {
    return runPythonTracker(framesDir)
}

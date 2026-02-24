import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'
import fs from 'fs'

/** Dimensions standard d'un terrain FIBA en mètres */
const FIBA_COURT = { width: 15, height: 28 } as const

/** Points de calibration terrain fournis par l'utilisateur (4 coins en pixels) */
export interface CalibrationPoints {
    topLeft: { x: number; y: number }
    topRight: { x: number; y: number }
    bottomLeft: { x: number; y: number }
    bottomRight: { x: number; y: number }
}

export interface PreprocessingResult {
    framesDir: string
    fps: number
    totalFrames: number
    durationSec: number
    resolution: { width: number; height: number }
    courtDimensions: { width: number; height: number }
    calibration: CalibrationPoints | null
    homographyMatrix: number[][] | null
    activeSegments: { start: number; end: number }[]
}

/**
 * Récupère les métadonnées d'une vidéo via ffprobe.
 * @param videoPath - Chemin local vers le fichier vidéo.
 */
function probeVideo(videoPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err: Error | null, data: ffmpeg.FfprobeData) => {
            if (err) return reject(err)
            resolve(data)
        })
    })
}

/**
 * Extraire les frames à 30fps avec FFmpeg dans un répertoire temporaire.
 * @param videoPath - Chemin local vers le fichier vidéo.
 * @param framesDir - Répertoire de sortie pour les frames.
 * @param fps - Nombre d'images par seconde à extraire.
 */
function extractFrames(videoPath: string, framesDir: string, fps: number): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .outputOptions([
                `-vf fps=${fps}`,
                '-q:v 2' // Haute qualité JPEG
            ])
            .output(path.join(framesDir, 'frame_%06d.jpg'))
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run()
    })
}

/**
 * Calcule une matrice d'homographie 3×3 à partir de 4 points source (pixels)
 * vers 4 points destination (coordonnées terrain FIBA normalisées).
 * Utilise la résolution directe du système linéaire 8×8 (DLT algorithm).
 */
export function computeHomography(calibration: CalibrationPoints): number[][] {
    const src = [
        calibration.topLeft,
        calibration.topRight,
        calibration.bottomRight,
        calibration.bottomLeft
    ]
    // Destination : coins du terrain FIBA (en mètres)
    const dst = [
        { x: 0, y: 0 },
        { x: FIBA_COURT.width, y: 0 },
        { x: FIBA_COURT.width, y: FIBA_COURT.height },
        { x: 0, y: FIBA_COURT.height }
    ]

    // Construction du système Ax = b (DLT — Direct Linear Transform)
    const A: number[][] = []
    const b: number[] = []

    for (let i = 0; i < 4; i++) {
        const { x: sx, y: sy } = src[i]
        const { x: dx, y: dy } = dst[i]

        A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy])
        b.push(dx)
        A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy])
        b.push(dy)
    }

    // Résolution par élimination de Gauss (8×8)
    const n = 8
    const aug: number[][] = A.map((row, i) => [...row, b[i]])

    for (let col = 0; col < n; col++) {
        let maxRow = col
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
        }
        ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

        const pivot = aug[col][col]
        if (Math.abs(pivot) < 1e-10) throw new Error('Calibration points are degenerate')

        for (let j = col; j <= n; j++) aug[col][j] /= pivot
        for (let row = 0; row < n; row++) {
            if (row === col) continue
            const factor = aug[row][col]
            for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j]
        }
    }

    const h = aug.map((row) => row[n])
    // Matrice 3×3 (h8 = 1)
    return [
        [h[0], h[1], h[2]],
        [h[3], h[4], h[5]],
        [h[6], h[7], 1]
    ]
}

/**
 * Applique la matrice d'homographie pour projeter un point pixel → coordonnées terrain.
 */
export function applyHomography(H: number[][], px: number, py: number): { x: number; y: number } {
    const w = H[2][0] * px + H[2][1] * py + H[2][2]
    const x = (H[0][0] * px + H[0][1] * py + H[0][2]) / w
    const y = (H[1][0] * px + H[1][1] * py + H[1][2]) / w
    return { x, y }
}

/**
 * Détecte les segments actifs en analysant les différences inter-frames.
 * Segments avec peu de mouvement (< seuil) sont considérés inactifs (temps morts).
 */
async function detectActiveSegments(
    framesDir: string,
    totalFrames: number,
    fps: number
): Promise<{ start: number; end: number }[]> {
    const files = fs.readdirSync(framesDir).filter((f: string) => f.endsWith('.jpg')).sort()
    if (files.length < 2) return [{ start: 0, end: totalFrames / fps }]

    // Échantillonnage : on analyse 1 frame sur 30 (soit 1 par seconde)
    const sampleInterval = fps
    const activityPerSecond: boolean[] = []

    // On utilise sharp pour calculer la différence de luminance moyenne entre frames consécutives
    const sharp = await import('sharp')

    let prevBuffer: Buffer | null = null
    for (let i = 0; i < files.length; i += sampleInterval) {
        const framePath = path.join(framesDir, files[i])
        const currentBuffer = await sharp
            .default(framePath)
            .resize(160, 90) // Miniature pour performance
            .greyscale()
            .raw()
            .toBuffer()

        if (prevBuffer) {
            let diffSum = 0
            for (let p = 0; p < currentBuffer.length; p++) {
                diffSum += Math.abs(currentBuffer[p] - prevBuffer[p])
            }
            const avgDiff = diffSum / currentBuffer.length
            // Seuil empirique : >8 = activité (mouvement joueurs), <8 = statique
            activityPerSecond.push(avgDiff > 8)
        } else {
            activityPerSecond.push(true)
        }
        prevBuffer = currentBuffer
    }

    // Regrouper en segments continus (merge si gap < 3 secondes)
    const segments: { start: number; end: number }[] = []
    let segStart: number | null = null

    for (let s = 0; s < activityPerSecond.length; s++) {
        if (activityPerSecond[s] && segStart === null) {
            segStart = s
        } else if (!activityPerSecond[s] && segStart !== null) {
            segments.push({ start: segStart, end: s })
            segStart = null
        }
    }
    if (segStart !== null) {
        segments.push({ start: segStart, end: activityPerSecond.length })
    }

    // Fusionner les segments avec un gap < 3 secondes
    const merged: { start: number; end: number }[] = []
    for (const seg of segments) {
        if (merged.length > 0 && seg.start - merged[merged.length - 1].end < 3) {
            merged[merged.length - 1].end = seg.end
        } else {
            merged.push({ ...seg })
        }
    }

    return merged.length > 0 ? merged : [{ start: 0, end: totalFrames / fps }]
}

/**
 * Pipeline de prétraitement vidéo complet.
 * Extraire les frames à 30fps, détecter les dimensions, calculer l'homographie
 * si la calibration est fournie, et séparer les segments actifs/inactifs.
 *
 * @param videoPath - Chemin local vers le fichier vidéo (téléchargé depuis Supabase Storage).
 * @param calibration - Points de calibration terrain (optionnel, fournis par l'utilisateur).
 */
export async function preprocessVideo(
    videoPath: string,
    calibration?: CalibrationPoints
): Promise<PreprocessingResult> {
    const framesDir = path.join(os.tmpdir(), `cv_frames_${Date.now()}`)
    fs.mkdirSync(framesDir, { recursive: true })

    const TARGET_FPS = 30

    // 1. Récupération des métadonnées vidéo
    const probe = await probeVideo(videoPath)
    const videoStream = probe.streams.find((s: ffmpeg.FfprobeStream) => s.codec_type === 'video')
    if (!videoStream) throw new Error('No video stream found in file')

    const resolution = {
        width: videoStream.width ?? 1920,
        height: videoStream.height ?? 1080
    }
    const durationSec = parseFloat(String(probe.format.duration ?? '0'))
    const totalFrames = Math.floor(durationSec * TARGET_FPS)

    // 2. Extraction des frames à 30fps
    await extractFrames(videoPath, framesDir, TARGET_FPS)

    // 3. Calcul de l'homographie si calibration fournie
    let homographyMatrix: number[][] | null = null
    if (calibration) {
        homographyMatrix = computeHomography(calibration)
    }

    // 4. Détection des segments actifs (motion detection)
    const activeSegments = await detectActiveSegments(framesDir, totalFrames, TARGET_FPS)

    return {
        framesDir,
        fps: TARGET_FPS,
        totalFrames,
        durationSec,
        resolution,
        courtDimensions: FIBA_COURT,
        calibration: calibration ?? null,
        homographyMatrix,
        activeSegments
    }
}

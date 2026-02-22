import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'

export interface PreprocessingResult {
    framesDir: string
    fps: number
    courtDimensions: { width: number; height: number }
    activeSegments: { start: number; end: number }[]
}

/**
 * Extraire les frames à 30fps avec FFmpeg
 * Détecter automatiquement les dimensions du terrain
 * Normaliser la perspective (correction fisheye si nécessaire)
 * Séparer les segments actifs vs inactifs (temps morts, coulisses)
 */
export async function preprocessVideo(videoUrl: string): Promise<PreprocessingResult> {
    const framesDir = path.join(os.tmpdir(), `frames_${Date.now()}`)

    // Dans un cas réel de production, on téléchargerait d'abord la vidéo depuis le Storage URL
    // Puis on utiliserait fluent-ffmpeg pour l'extraction

    // Placeholder strict et documenté
    return {
        framesDir,
        fps: 30,
        courtDimensions: { width: 15, height: 28 }, // FIBA Dimensions
        activeSegments: [{ start: 0, end: 120 }] // ex: 2 minutes d'action
    }
}

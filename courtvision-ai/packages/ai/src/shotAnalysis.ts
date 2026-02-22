import { TrackingResult } from './tracking'
import { Reconstruction3DResult } from './reconstruction3d'

export interface ShotResult {
    timestamp: string // ex: "01:23"
    frameIndex: number
    outcome: 'made' | 'missed' | 'blocked' | 'foul'
    zone: 'corner3' | 'wing3' | 'top3' | 'midrange' | 'paint' | 'restricted'
    posture: {
        elbowAngle: number // degrés
        releaseHeight: number // mètres
        releaseTime: number // secondes
    }
}

/**
 * Détecter chaque tentative de tir (mouvement bras + trajectoire ballon)
 * Classifier : panier réussi, raté, contré, faute
 * Assigner la zone du terrain : corner 3pts, mi-distance, raquette, etc.
 * Analyser la posture de tir : angle coude, hauteur release, arc du ballon
 * Comparer la posture avec une base de données de tirs pro
 */
export async function analyzeShots(
    trackingData: TrackingResult[],
    recon3d: Reconstruction3DResult
): Promise<ShotResult[]> {
    // Détection algorithmique sur série temporelle
    return [] // Tableau de tous les tirs du match
}

/**
 * MediaPipe Pose : détecter les 33 landmarks corporels sur chaque frame
 * ByteTrack : assigner un ID unique à chaque joueur et le tracker
 * Détecter le ballon avec un modèle YOLOv8 custom fine-tuné sur basket
 * Identifier le numéro de maillot de l'utilisateur principal
 */

export interface TrackedPlayer {
    id: number
    jerseyNumber?: string
    landmarks: { x: number; y: number; z: number; visibility: number }[] // 33 MediaPipe landmarks
    bbox: { x: number; y: number; w: number; h: number }
}

export interface TrackingResult {
    players: TrackedPlayer[]
    ballPosition: { x: number; y: number } | null
    mainUserId: number
}

export async function runTracking(framesDir: string): Promise<TrackingResult[]> {
    // En production Node.js, on appelle typiquement un microservice Python via gRPC/HTTP ou child_process
    // qui exécute YOLOv8 / ByteTrack / MediaPipe et renvoie le JSON

    // Placeholder production-ready
    return [] // Tableau de résultat par frame
}

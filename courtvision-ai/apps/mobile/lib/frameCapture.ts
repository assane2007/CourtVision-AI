/**
 * FrameCapture — Service de capture de frames caméra pour le pipeline IA.
 *
 * Bridge entre expo-camera et le pipeline de traitement IA.
 * Capture des frames à intervalles réguliers et les envoie au service IA.
 *
 * Stratégies de capture :
 * 1. takePictureAsync (expo-camera) — ~5-10 fps, qualité haute
 * 2. GL snapshot (expo-gl) — ~20-30 fps, latence basse
 * 3. Native frame callback (future) — ~30 fps, latence minimale
 *
 * Usage :
 *   const capture = new FrameCaptureService()
 *   capture.start(cameraRef, onFrame)
 *   capture.stop()
 */

import type { RefObject } from 'react'
import type { CameraView } from 'expo-camera'

// ==========================================
// Types
// ==========================================

export interface CapturedFrame {
    /** URI du fichier temporaire (jpeg) */
    uri: string
    /** Données base64 (optionnel, plus rapide pour le pipeline) */
    base64?: string
    /** Largeur */
    width: number
    /** Hauteur */
    height: number
    /** Timestamp de capture */
    timestamp: number
    /** Index de la frame */
    frameIndex: number
}

export interface FrameCaptureConfig {
    /** FPS cible */
    targetFps: number
    /** Qualité JPEG (0-1) */
    quality: number
    /** Inclure base64 dans les frames */
    includeBase64: boolean
    /** Taille de redimensionnement (largeur, la hauteur est calculée) */
    resizeWidth: number
    /** Activer le skip de frame si le traitement est trop lent */
    enableFrameSkip: boolean
}

export type FrameCallback = (frame: CapturedFrame) => Promise<void>

// ==========================================
// Defaults
// ==========================================

const DEFAULT_CONFIG: FrameCaptureConfig = {
    targetFps: 15, // Compromis entre latence et batterie
    quality: 0.5,
    includeBase64: false,
    resizeWidth: 640,
    enableFrameSkip: true,
}

// ==========================================
// Service
// ==========================================

export class FrameCaptureService {
    private config: FrameCaptureConfig = DEFAULT_CONFIG
    private isCapturing = false
    private frameIndex = 0
    private captureInterval: ReturnType<typeof setInterval> | null = null
    private isProcessingFrame = false
    private droppedFrames = 0
    private totalFrames = 0
    private startTime = 0

    configure(config: Partial<FrameCaptureConfig>): void {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Démarre la capture de frames depuis la caméra.
     *
     * @param cameraRef - Référence à l'objet CameraView expo-camera
     * @param onFrame - Callback appelé pour chaque frame capturée
     */
    start(
        cameraRef: RefObject<CameraView | null>,
        onFrame: FrameCallback,
    ): void {
        if (this.isCapturing) {
            console.warn('[FrameCapture] Already capturing')
            return
        }

        this.isCapturing = true
        this.frameIndex = 0
        this.droppedFrames = 0
        this.totalFrames = 0
        this.startTime = Date.now()

        const intervalMs = Math.round(1000 / this.config.targetFps)

        this.captureInterval = setInterval(async () => {
            if (!this.isCapturing) return
            if (!cameraRef.current) return

            // Frame skip si on est en retard
            if (this.config.enableFrameSkip && this.isProcessingFrame) {
                this.droppedFrames++
                return
            }

            this.isProcessingFrame = true
            this.totalFrames++

            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: this.config.quality,
                    base64: this.config.includeBase64,
                    skipProcessing: true, // Performance : skip le post-traitement
                    exif: false,
                })

                if (!photo) return

                const frame: CapturedFrame = {
                    uri: photo.uri,
                    base64: photo.base64 ?? undefined,
                    width: photo.width,
                    height: photo.height,
                    timestamp: (Date.now() - this.startTime) / 1000,
                    frameIndex: this.frameIndex++,
                }

                await onFrame(frame)
            } catch (err) {
                // Ignorer les erreurs de capture (caméra non prête, etc.)
                if (__DEV__) {
                    console.debug('[FrameCapture] Capture error:', err)
                }
            } finally {
                this.isProcessingFrame = false
            }
        }, intervalMs)
    }

    /**
     * Arrête la capture de frames.
     */
    stop(): void {
        this.isCapturing = false
        if (this.captureInterval) {
            clearInterval(this.captureInterval)
            this.captureInterval = null
        }
        this.isProcessingFrame = false
    }

    /**
     * Retourne les statistiques de capture.
     */
    getStats(): {
        totalFrames: number
        droppedFrames: number
        effectiveFps: number
        dropRate: number
    } {
        const elapsed = (Date.now() - this.startTime) / 1000
        return {
            totalFrames: this.totalFrames,
            droppedFrames: this.droppedFrames,
            effectiveFps: elapsed > 0 ? Math.round(this.frameIndex / elapsed) : 0,
            dropRate: this.totalFrames > 0
                ? Math.round((this.droppedFrames / (this.totalFrames + this.droppedFrames)) * 100)
                : 0,
        }
    }

    isActive(): boolean {
        return this.isCapturing
    }
}

/**
 * Singleton global pour la capture de frames.
 */
let _instance: FrameCaptureService | null = null
export function getFrameCaptureService(): FrameCaptureService {
    if (!_instance) {
        _instance = new FrameCaptureService()
    }
    return _instance
}

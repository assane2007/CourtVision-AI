/**
 * Shot Detector — Détection de tir par analyse de séquence temporelle
 *
 * Ce module remplace l'heuristique single-frame par un vrai détecteur
 * basé sur l'analyse d'une séquence de frames.
 *
 * Architecture du détecteur :
 *
 *   Phase 1: GATHER (préparation)
 *   → Le joueur monte le ballon vers le set point
 *   → Le coude se plie (~90°), les genoux fléchissent
 *   → Durée typique : 200-400ms
 *
 *   Phase 2: RELEASE (tir)
 *   → Extension rapide du coude (90° → 160°+)
 *   → Le poignet passe au-dessus de la tête
 *   → Le ballon quitte les mains
 *   → Durée typique : 100-200ms
 *
 *   Phase 3: FOLLOW-THROUGH (suivi)
 *   → Le bras reste étendu en "gooseneck"
 *   → Le poignet cassé maintenu > 0.3s
 *   → Durée typique : 300-600ms
 *
 *   Phase 4: BALL_FLIGHT (vol du ballon)
 *   → Le ballon suit une trajectoire parabolique
 *   → Make/miss détecté par tracking du ballon
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt : détecte make/miss par le son du filet (audio) + changement de score (OCR)
 * - CourtVision AI : détection par séquence biomécanique complète + ball tracking
 * - Notre approche donne accès à TOUTES les métriques biomécaniques du tir
 *
 * État machine (Finite State Machine) :
 *   IDLE → GATHERING → RELEASING → FOLLOWING_THROUGH → BALL_FLIGHT → IDLE
 *          ↓ (timeout)    ↓ (abort)
 *          IDLE           IDLE
 */

import { Landmark, LANDMARKS } from './tracking'
import { PoseEstimationEngine, BodyAngles, ShootingBiomechanics } from './poseEstimation'
import { ShotZone } from './shotAnalysis'

// ==========================================
// Types
// ==========================================

/** État du détecteur de tir (machine à états) */
export type ShotDetectionPhase =
    | 'idle'
    | 'gathering'
    | 'releasing'
    | 'following_through'
    | 'ball_flight'

/** Résultat de la détection d'un tir complet */
export interface DetectedShot {
    /** ID unique du tir */
    shotId: string
    /** Phase actuelle quand le tir a été confirmé */
    completedPhase: ShotDetectionPhase
    /** Timestamps de chaque phase (en secondes) */
    phaseTimestamps: {
        gatherStart: number
        releasePoint: number
        followThroughStart: number
        ballFlightStart: number | null
        resolved: number | null
    }
    /** Biomécanique au moment du release (frame clé) */
    releaseBiomechanics: ShootingBiomechanics
    /** Angle du coude au set point (avant extension) */
    setPointElbowAngle: number
    /** Durée gather-to-release en secondes */
    releaseTime: number
    /** Le follow-through est maintenu (gooseneck) */
    hasFollowThrough: boolean
    /** Durée du follow-through en secondes */
    followThroughDuration: number
    /** Résultat du tir (null si pas encore résolu) */
    outcome: 'made' | 'missed' | 'blocked' | null
    /** Score de confiance de la détection (0-1) */
    detectionConfidence: number
    /** Tous les angles corporels capturés pendant le tir */
    angleTimeline: BodyAngles[]
    /** Wrist trajectory pendant le tir (pour l'arc AR) */
    wristTrajectory: Array<{ x: number; y: number; timestamp: number }>
}

/** Configuration du détecteur */
export interface ShotDetectorConfig {
    /** FPS de capture */
    fps: number
    /** Durée max d'un tir (en frames) — au-delà, on reset */
    maxShotDurationFrames: number
    /** Cooldown entre deux détections (en frames) */
    cooldownFrames: number
    /** Vitesse angulaire minimum du coude pour détecter le release (°/s) */
    minElbowAngularVelocity: number
    /** Angle minimum du coude pendant le release (full extension) */
    minReleaseElbowAngle: number
    /** Angle maximum du coude au set point (plié) */
    maxSetPointElbowAngle: number
    /** Le poignet doit être au-dessus de la tête pour confirmer le release */
    requireWristAboveHead: boolean
    /** Nombre de frames minimum en follow-through pour le confirmer */
    minFollowThroughFrames: number
}

/** Événement émis par le détecteur */
export type ShotDetectorEvent =
    | { type: 'phase_change'; phase: ShotDetectionPhase; timestamp: number }
    | { type: 'shot_detected'; shot: DetectedShot }
    | { type: 'shot_aborted'; reason: string; phase: ShotDetectionPhase }
    | { type: 'follow_through_quality'; quality: number; duration: number }

// ==========================================
// Constantes
// ==========================================

export const DEFAULT_SHOT_DETECTOR_CONFIG: ShotDetectorConfig = {
    fps: 30,
    maxShotDurationFrames: 90,    // 3 secondes max pour un tir complet
    cooldownFrames: 45,            // 1.5s entre deux détections
    minElbowAngularVelocity: 200,  // °/s — vitesse d'extension rapide
    minReleaseElbowAngle: 145,     // Le bras doit être quasiment tendu
    maxSetPointElbowAngle: 115,    // Au set point, le coude est plié
    requireWristAboveHead: true,
    minFollowThroughFrames: 9,     // 0.3s à 30fps
}

// ==========================================
// Shot Detector Engine (Finite State Machine)
// ==========================================

export class ShotDetectorEngine {
    private config: ShotDetectorConfig
    private phase: ShotDetectionPhase = 'idle'
    private eventListeners: Array<(event: ShotDetectorEvent) => void> = []

    // État interne
    private framesSinceLastShot: number = 999
    private gatherStartFrame: number = 0
    private gatherStartTimestamp: number = 0
    private releaseFrame: number = 0
    private releaseTimestamp: number = 0
    private followThroughStartFrame: number = 0
    private shotFrameCount: number = 0

    // Historique des angles pour la séquence en cours
    private angleBuffer: BodyAngles[] = []
    private prevElbowAngle: number = 180  // Commence "bras tendu"
    private setPointElbowAngle: number = 0
    private wristTrajectory: Array<{ x: number; y: number; timestamp: number }> = []
    private followThroughFrameCount: number = 0
    private releaseBiomechanics: ShootingBiomechanics | null = null

    // Compteur de tirs pour IDs uniques
    private shotCounter: number = 0

    constructor(config: Partial<ShotDetectorConfig> = {}) {
        this.config = { ...DEFAULT_SHOT_DETECTOR_CONFIG, ...config }
    }

    /**
     * Traite une frame et met à jour la machine à états.
     *
     * @param landmarks - Les 33 landmarks BlazePose de la frame
     * @param frameIndex - Index de la frame
     * @param timestamp - Timestamp en secondes
     * @returns Le tir détecté (ou null si pas de tir terminé)
     */
    processFrame(
        landmarks: Landmark[],
        frameIndex: number,
        timestamp: number,
    ): DetectedShot | null {
        this.framesSinceLastShot++
        this.shotFrameCount++

        // Vérification cooldown
        if (this.phase === 'idle' && this.framesSinceLastShot < this.config.cooldownFrames) {
            return null
        }

        // Timeout — un tir ne devrait pas durer plus de maxShotDurationFrames
        if (this.phase !== 'idle' && this.shotFrameCount > this.config.maxShotDurationFrames) {
            this.emitEvent({ type: 'shot_aborted', reason: 'timeout', phase: this.phase })
            this.resetState()
            return null
        }

        if (landmarks.length < 33) return null

        // Extraire les angles et la biomécanique
        const angles = PoseEstimationEngine.extractBodyAngles(landmarks)
        const biomechanics = PoseEstimationEngine.extractShootingBiomechanics(landmarks)

        // Enregistrer la trajectoire du poignet (pour l'arc AR)
        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        if (wrist) {
            this.wristTrajectory.push({ x: wrist.x, y: wrist.y, timestamp })
        }

        this.angleBuffer.push(angles)

        // Vitesse angulaire du coude (approximation)
        const dt = 1 / this.config.fps
        const elbowAngularVelocity = Math.abs(angles.rightElbowAngle - this.prevElbowAngle) / dt

        // --- FINITE STATE MACHINE ---
        let detectedShot: DetectedShot | null = null

        switch (this.phase) {
            case 'idle':
                detectedShot = this.handleIdle(angles, biomechanics, landmarks, frameIndex, timestamp)
                break
            case 'gathering':
                detectedShot = this.handleGathering(angles, biomechanics, landmarks, elbowAngularVelocity, frameIndex, timestamp)
                break
            case 'releasing':
                detectedShot = this.handleReleasing(angles, biomechanics, landmarks, frameIndex, timestamp)
                break
            case 'following_through':
                detectedShot = this.handleFollowingThrough(angles, biomechanics, landmarks, frameIndex, timestamp)
                break
            case 'ball_flight':
                // En attente de résolution make/miss (géré par BallTracker)
                break
        }

        this.prevElbowAngle = angles.rightElbowAngle
        return detectedShot
    }

    /**
     * Résout le résultat d'un tir (appelé par le BallTracker).
     */
    resolveOutcome(shotId: string, outcome: 'made' | 'missed' | 'blocked'): void {
        // En production, le résultat serait transmis au tir en cours
        // et l'état serait mis à jour
        if (this.phase === 'ball_flight') {
            this.resetState()
        }
    }

    /**
     * Enregistre un listener d'événements.
     */
    on(listener: (event: ShotDetectorEvent) => void): () => void {
        this.eventListeners.push(listener)
        return () => {
            this.eventListeners = this.eventListeners.filter(l => l !== listener)
        }
    }

    /** Phase actuelle */
    getPhase(): ShotDetectionPhase {
        return this.phase
    }

    /** Reset complet */
    reset(): void {
        this.resetState()
        this.shotCounter = 0
        this.framesSinceLastShot = 999
    }

    // ==========================================
    // State Machine Handlers
    // ==========================================

    /**
     * IDLE → GATHERING transition
     *
     * Conditions pour passer en GATHERING :
     * 1. Le coude est plié (< maxSetPointElbowAngle = 115°)
     * 2. Le poignet est au-dessus de l'épaule (le joueur prépare le tir)
     * 3. Les genoux commencent à fléchir
     */
    private handleIdle(
        angles: BodyAngles,
        biomechanics: ShootingBiomechanics,
        landmarks: Landmark[],
        frameIndex: number,
        timestamp: number,
    ): null {
        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]

        // Condition 1: coude plié
        const elbowBent = angles.rightElbowAngle < this.config.maxSetPointElbowAngle

        // Condition 2: poignet au-dessus de l'épaule
        const wristAboveShoulder = wrist && shoulder && wrist.y < shoulder.y

        // Condition 3: genou fléchi (le joueur engage ses jambes)
        const kneesBent = angles.rightKneeAngle < 170

        if (elbowBent && wristAboveShoulder && kneesBent) {
            this.transitionTo('gathering', timestamp)
            this.gatherStartFrame = frameIndex
            this.gatherStartTimestamp = timestamp
            this.setPointElbowAngle = angles.rightElbowAngle
            this.shotFrameCount = 0
        }

        return null
    }

    /**
     * GATHERING → RELEASING transition
     *
     * Conditions pour passer en RELEASING :
     * 1. Vitesse angulaire du coude élevée (extension rapide)
     * 2. Le coude s'ouvre au-delà du seuil de release
     * 3. Le mouvement est ascendant (le poignet monte)
     */
    private handleGathering(
        angles: BodyAngles,
        biomechanics: ShootingBiomechanics,
        landmarks: Landmark[],
        elbowAngularVelocity: number,
        frameIndex: number,
        timestamp: number,
    ): null {
        // Mise à jour du set point (angle minimum du coude pendant le gather)
        if (angles.rightElbowAngle < this.setPointElbowAngle) {
            this.setPointElbowAngle = angles.rightElbowAngle
        }

        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const nose = landmarks[LANDMARKS.NOSE]

        // Conditions de transition vers RELEASING
        const fastExtension = elbowAngularVelocity > this.config.minElbowAngularVelocity
        const elbowOpening = angles.rightElbowAngle > this.setPointElbowAngle + 20
        const wristRising = this.wristTrajectory.length >= 2 &&
            this.wristTrajectory[this.wristTrajectory.length - 1].y <
            this.wristTrajectory[this.wristTrajectory.length - 2].y

        if ((fastExtension || elbowOpening) && wristRising) {
            this.transitionTo('releasing', timestamp)
            this.releaseFrame = frameIndex
            this.releaseTimestamp = timestamp
            this.releaseBiomechanics = biomechanics
        }

        // Abort : si le coude s'ouvre sans mouvement ascendant → faux positif (passe, dribble)
        if (this.shotFrameCount > 30 && !wristRising) {
            this.emitEvent({ type: 'shot_aborted', reason: 'no_upward_motion', phase: 'gathering' })
            this.resetState()
        }

        return null
    }

    /**
     * RELEASING → FOLLOWING_THROUGH transition
     *
     * Conditions pour passer en FOLLOWING_THROUGH :
     * 1. Le coude est en extension complète (> minReleaseElbowAngle)
     * 2. Le poignet est au-dessus de la tête
     * 3. La vitesse angulaire du coude diminue (le mouvement ralentit)
     */
    private handleReleasing(
        angles: BodyAngles,
        biomechanics: ShootingBiomechanics,
        landmarks: Landmark[],
        frameIndex: number,
        timestamp: number,
    ): null {
        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const nose = landmarks[LANDMARKS.NOSE]

        const elbowExtended = angles.rightElbowAngle > this.config.minReleaseElbowAngle
        const wristAboveHead = this.config.requireWristAboveHead
            ? (wrist && nose && wrist.y < nose.y)
            : true

        if (elbowExtended && wristAboveHead) {
            // Capturer la biomécanique au moment exact du release
            this.releaseBiomechanics = biomechanics
            this.transitionTo('following_through', timestamp)
            this.followThroughStartFrame = frameIndex
            this.followThroughFrameCount = 0
        }

        return null
    }

    /**
     * FOLLOWING_THROUGH → BALL_FLIGHT transition
     *
     * Le tir est "confirmé" quand le follow-through est détecté.
     * On construit le DetectedShot et on passe en ball_flight.
     */
    private handleFollowingThrough(
        angles: BodyAngles,
        biomechanics: ShootingBiomechanics,
        landmarks: Landmark[],
        frameIndex: number,
        timestamp: number,
    ): DetectedShot | null {
        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]

        // Le follow-through = bras encore étendu et poignet au-dessus de l'épaule
        const armStillExtended = angles.rightElbowAngle > 130
        const wristStillHigh = wrist && shoulder && wrist.y < shoulder.y

        if (armStillExtended && wristStillHigh) {
            this.followThroughFrameCount++
        }

        // Le follow-through est confirmé après minFollowThroughFrames
        const hasFollowThrough = this.followThroughFrameCount >= this.config.minFollowThroughFrames

        // Le bras redescend → fin du follow-through, le tir est complet
        const armDropping = angles.rightElbowAngle < 120 || (wrist && shoulder && wrist.y > shoulder.y)

        if (armDropping || this.followThroughFrameCount > this.config.fps) {
            // Tir confirmé ! Construire le résultat
            const releaseTime = this.releaseTimestamp - this.gatherStartTimestamp
            const followThroughDuration = (this.followThroughFrameCount / this.config.fps)

            this.shotCounter++
            const shot: DetectedShot = {
                shotId: `shot_${this.shotCounter}_${Date.now()}`,
                completedPhase: 'following_through',
                phaseTimestamps: {
                    gatherStart: this.gatherStartTimestamp,
                    releasePoint: this.releaseTimestamp,
                    followThroughStart: this.followThroughStartFrame / this.config.fps,
                    ballFlightStart: null,
                    resolved: null,
                },
                releaseBiomechanics: this.releaseBiomechanics!,
                setPointElbowAngle: Math.round(this.setPointElbowAngle * 10) / 10,
                releaseTime: Math.round(releaseTime * 1000) / 1000,
                hasFollowThrough,
                followThroughDuration: Math.round(followThroughDuration * 100) / 100,
                outcome: null,  // Sera résolu par BallTracker
                detectionConfidence: this.computeDetectionConfidence(hasFollowThrough, releaseTime),
                angleTimeline: [...this.angleBuffer],
                wristTrajectory: [...this.wristTrajectory],
            }

            this.emitEvent({ type: 'shot_detected', shot })
            this.emitEvent({
                type: 'follow_through_quality',
                quality: hasFollowThrough ? Math.min(100, this.followThroughFrameCount * 10) : 0,
                duration: followThroughDuration,
            })

            // Transition vers ball_flight (en attente du BallTracker)
            this.transitionTo('ball_flight', timestamp)
            this.framesSinceLastShot = 0

            // Reset après un court délai (le ball tracker peut résoudre le tir)
            // En production, on attendrait le BallTracker
            setTimeout(() => {
                if (this.phase === 'ball_flight') {
                    this.resetState()
                }
            }, 2000)

            return shot
        }

        return null
    }

    // ==========================================
    // Helpers
    // ==========================================

    private transitionTo(newPhase: ShotDetectionPhase, timestamp: number): void {
        this.phase = newPhase
        this.emitEvent({ type: 'phase_change', phase: newPhase, timestamp })
    }

    private resetState(): void {
        this.phase = 'idle'
        this.angleBuffer = []
        this.wristTrajectory = []
        this.prevElbowAngle = 180
        this.setPointElbowAngle = 0
        this.shotFrameCount = 0
        this.followThroughFrameCount = 0
        this.releaseBiomechanics = null
    }

    private emitEvent(event: ShotDetectorEvent): void {
        for (const listener of this.eventListeners) {
            try {
                listener(event)
            } catch (e) {
                console.error('[ShotDetector] Event listener error:', e)
            }
        }
    }

    /**
     * Calcule la confiance de la détection basée sur la qualité de la séquence.
     */
    private computeDetectionConfidence(hasFollowThrough: boolean, releaseTime: number): number {
        let confidence = 0.5  // Base

        // Follow-through détecté → haute confiance
        if (hasFollowThrough) confidence += 0.2

        // Release time dans une plage réaliste (0.25s - 0.70s)
        if (releaseTime >= 0.25 && releaseTime <= 0.70) confidence += 0.15

        // Set point elbow dans la plage NBA (85°-110°)
        if (this.setPointElbowAngle >= 85 && this.setPointElbowAngle <= 110) confidence += 0.10

        // Assez de frames dans la séquence (pas un mouvement trop rapide)
        if (this.angleBuffer.length >= 6) confidence += 0.05

        return Math.min(1, Math.round(confidence * 100) / 100)
    }
}

/**
 * Helper : convertit un DetectedShot en ShotResult compatible avec le pipeline existant.
 */
export function detectedShotToShotResult(
    shot: DetectedShot,
    zone: ShotZone,
    courtPosition: { x: number; y: number },
): {
    timestamp: string
    frameIndex: number
    playerId: number
    outcome: 'made' | 'missed' | 'blocked' | 'foul'
    zone: ShotZone
    courtPosition: { x: number; y: number }
    posture: {
        elbowAngle: number
        releaseHeight: number
        releaseTime: number
        followThrough: boolean
    }
} {
    const minutes = Math.floor(shot.phaseTimestamps.releasePoint / 60)
    const seconds = Math.floor(shot.phaseTimestamps.releasePoint % 60)
    const timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    return {
        timestamp,
        frameIndex: Math.round(shot.phaseTimestamps.releasePoint * 30), // Approx frame index
        playerId: 0,
        outcome: shot.outcome ?? 'missed',
        zone,
        courtPosition,
        posture: {
            elbowAngle: shot.setPointElbowAngle,
            releaseHeight: shot.releaseBiomechanics.releaseHeightRatio,
            releaseTime: shot.releaseTime,
            followThrough: shot.hasFollowThrough,
        },
    }
}

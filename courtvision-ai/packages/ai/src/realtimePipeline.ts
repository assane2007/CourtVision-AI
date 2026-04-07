/**
 * Realtime Pipeline — Orchestrateur du feedback instantané (<2s)
 *
 * Ce module orchestre la chaîne complète de traitement en temps réel :
 *   Camera Frame → Pose Estimation → Shot Detection → Ball Tracking → Feedback
 *
 * Budget de latence (cible: <2 secondes) :
 *   - Capture frame : ~30ms
 *   - Pose estimation (TFLite on-device) : ~25ms
 *   - Shot detection (state machine) : ~1ms
 *   - Ball tracking (Kalman filter) : ~1ms
 *   - AR overlay generation : ~2ms
 *   - Feedback generation : ~1ms
 *   - Total pipeline : ~60ms par frame
 *   - Feedback rendu à l'utilisateur : <100ms après le release
 *
 * Architecture :
 *   ┌─────────────┐     ┌──────────────┐     ┌───────────────┐
 *   │  Camera      │────▶│  Pose        │────▶│  Shot         │
 *   │  (30fps)     │     │  Estimation  │     │  Detector     │
 *   └─────────────┘     └──────────────┘     └───────┬───────┘
 *                                                     │
 *                        ┌──────────────┐     ┌───────▼───────┐
 *                        │  AR Overlay  │◀────│  Ball         │
 *                        │  Engine      │     │  Tracker      │
 *                        └──────┬───────┘     └───────────────┘
 *                               │
 *                        ┌──────▼───────┐     ┌───────────────┐
 *                        │  Feedback    │────▶│  Mobile UI    │
 *                        │  Generator   │     │  (haptic +    │
 *                        └──────────────┘     │   visual)     │
 *                                             └───────────────┘
 *
 * Modes d'opération :
 * 1. FULL_PIPELINE : toutes les étapes (capture → feedback)
 * 2. LITE_PIPELINE : pose + shot detection seulement (économie batterie)
 * 3. RECORDING_ONLY : capture et stocke, analyse post-session
 */

import type { PoseEstimationResult, BodyAngles, ShootingBiomechanics, PoseEstimationConfig } from './poseEstimation';
import { PoseEstimationEngine } from './poseEstimation'
import type { DetectedShot, ShotDetectorConfig, ShotDetectorEvent, ShotDetectionPhase} from './shotDetector';
import { ShotDetectorEngine, detectedShotToShotResult } from './shotDetector'
import type { BallTrackerConfig, BallPosition, ShotOutcomeResult } from './ballTracker';
import { BallTrackerEngine } from './ballTracker'
import type { AROverlayFrame, AROverlayConfig} from './arOverlay';
import { AROverlayEngine, ARFeedback } from './arOverlay'
import type { ShotResult, ShotZone } from './shotAnalysis'
import type { CourtZone } from './reconstruction3d'
import { getCourtZone } from './reconstruction3d'
import type { CalibrationPoints } from './preprocessing'
import { applyHomography, computeHomography } from './preprocessing'
import type { ShotDNASignature } from './shotDNA';
import { ShotDNAEngine } from './shotDNA'

// ==========================================
// Types
// ==========================================

export type PipelineMode = 'full' | 'lite' | 'recording'

export interface PipelineCourtCalibrationConfig {
    /** Points de calibration caméra (pixels) */
    points?: CalibrationPoints
    /** Homographie déjà calculée (caméra → terrain) */
    homographyMatrix?: number[][]
    /** Dimensions terrain cible (mètres) */
    courtDimensions?: { width: number; height: number }
}

export interface RealtimePipelineConfig {
    mode: PipelineMode
    pose: Partial<PoseEstimationConfig>
    shotDetector: Partial<ShotDetectorConfig>
    ballTracker: Partial<BallTrackerConfig>
    arOverlay: Partial<AROverlayConfig>
    courtCalibration?: PipelineCourtCalibrationConfig
    /** Intervalle minimum entre deux frames traitées (ms) */
    minFrameIntervalMs: number
    /** Activer le feedback haptique */
    enableHaptic: boolean
    /** Activer le feedback audio */
    enableAudioFeedback: boolean
    /** Signature du joueur (pour le Shot Quality Score) */
    playerSignature?: ShotDNASignature
}

export interface PipelineFrameResult {
    /** Pose estimation result (null si échec de détection) */
    pose: PoseEstimationResult | null
    /** Tir détecté dans cette frame (null si pas de tir) */
    detectedShot: DetectedShot | null
    /** Résultat make/miss (null si pas applicable) */
    shotOutcome: ShotOutcomeResult | null
    /** Données d'overlay AR pour le rendu */
    arOverlay: AROverlayFrame | null
    /** Feedback instantané pour l'utilisateur */
    feedback: InstantFeedback | null
    /** Shot result compatible avec le pipeline existant */
    shotResult: ShotResult | null
    /** Temps total de traitement de la frame (ms) */
    processingTimeMs: number
    /** Timestamp de la frame */
    timestamp: number
}

/** Feedback instantané pour l'utilisateur */
export interface InstantFeedback {
    /** Type de feedback */
    type: 'shot_quality' | 'form_tip' | 'encouragement' | 'correction' | 'streak'
    /** Message principal */
    message: string
    /** Emoji */
    emoji: string
    /** Score associé (0-100, optionnel) */
    score?: number
    /** Grade (A+ à F, optionnel) */
    grade?: string
    /** Pattern de vibration (ms) pour le feedback haptique */
    hapticPattern?: number[]
    /** Priorité (1 = haute, 5 = basse) */
    priority: number
    /** Durée d'affichage recommandée (ms) */
    displayDuration: number
}

/** Statistiques temps réel de la session */
export interface RealtimeSessionStats {
    /** Nombre total de frames traitées */
    framesProcessed: number
    /** Nombre de tirs détectés */
    shotsDetected: number
    /** Tirs réussis */
    shotsMade: number
    /** Tirs manqués */
    shotsMissed: number
    /** FG% en temps réel */
    fgPct: number
    /** Score moyen de qualité de tir */
    avgShotQuality: number
    /** Temps moyen de traitement par frame (ms) */
    avgProcessingTimeMs: number
    /** Série actuelle (positive = makes, négative = misses) */
    currentStreak: number
    /** Plus longue série de makes */
    bestStreak: number
    /** Durée de la session (secondes) */
    sessionDuration: number
    /** Tous les tirs de la session */
    allShots: ShotResult[]
}

// ==========================================
// Realtime Pipeline Engine
// ==========================================

export class RealtimePipelineEngine {
    private config: RealtimePipelineConfig
    private poseEngine: PoseEstimationEngine
    private shotDetector: ShotDetectorEngine
    private ballTracker: BallTrackerEngine
    private arOverlay: AROverlayEngine

    // État de la session
    private sessionStats: RealtimeSessionStats
    private lastFrameTimestamp: number = 0
    private currentAngles: BodyAngles | null = null
    private currentBiomechanics: ShootingBiomechanics | null = null
    private lastPoseResult: PoseEstimationResult | null = null
    private wristTrajectory: Array<{ x: number; y: number; timestamp: number }> = []
    private pendingShot: DetectedShot | null = null
    private isRunning: boolean = false
    private homographyMatrix: number[][] | null = null
    private courtDimensions: { width: number; height: number } = { width: 15, height: 28 }
    private lastFrameDimensions: { width: number; height: number } = { width: 1, height: 1 }
    private lastCourtPosition: { x: number; y: number } | null = null

    // Event listeners
    private eventListeners: Array<(event: PipelineEvent) => void> = []

    constructor(config: Partial<RealtimePipelineConfig> = {}) {
        this.config = {
            mode: 'full',
            pose: {},
            shotDetector: {},
            ballTracker: {},
            arOverlay: {},
            courtCalibration: undefined,
            minFrameIntervalMs: 33,  // ~30fps max
            enableHaptic: true,
            enableAudioFeedback: false,
            ...config,
        }

        this.poseEngine = new PoseEstimationEngine(this.config.pose)
        this.shotDetector = new ShotDetectorEngine(this.config.shotDetector)
        this.ballTracker = new BallTrackerEngine(this.config.ballTracker)
        this.arOverlay = new AROverlayEngine(this.config.arOverlay)
        this.applyCourtCalibration(this.config.courtCalibration)

        this.sessionStats = this.createEmptyStats()

        // Écouter les événements du shot detector
        this.shotDetector.on((event) => this.handleShotDetectorEvent(event))
    }

    /**
     * Initialise le pipeline (charge les modèles).
     * Doit être appelé une fois avant de commencer à traiter les frames.
     */
    async initialize(): Promise<void> {
        await this.poseEngine.initialize()
        this.isRunning = true
        this.emitEvent({ type: 'pipeline_initialized' })
    }

    /**
     * Traite une frame caméra complète.
     * C'est le point d'entrée principal appelé à chaque frame capturée.
     *
     * @param frameData - Données brutes de la frame (RGB buffer)
     * @param frameIndex - Index séquentiel de la frame
     * @param timestamp - Timestamp en secondes depuis le début de la session
     * @param frameWidth - Largeur de la frame en pixels
     * @param frameHeight - Hauteur de la frame en pixels
     * @param ballDetection - Détection de balle optionnelle (si fournie par un autre modèle)
     */
    async processFrame(
        frameData: Uint8Array | ArrayBuffer,
        frameIndex: number,
        timestamp: number,
        frameWidth: number,
        frameHeight: number,
        ballDetection?: BallPosition,
    ): Promise<PipelineFrameResult> {
        const startTime = performance.now()
        this.lastFrameDimensions = {
            width: Math.max(1, frameWidth),
            height: Math.max(1, frameHeight),
        }

        // Rate limiting
        const elapsed = timestamp - this.lastFrameTimestamp
        if (elapsed * 1000 < this.config.minFrameIntervalMs && elapsed > 0) {
            return this.emptyFrameResult(timestamp)
        }
        this.lastFrameTimestamp = timestamp

        let pose: PoseEstimationResult | null = null
        let detectedShot: DetectedShot | null = null
        let shotOutcome: ShotOutcomeResult | null = null
        let arOverlayFrame: AROverlayFrame | null = null
        let feedback: InstantFeedback | null = null
        let shotResult: ShotResult | null = null

        // --- Étape 1 : Pose Estimation ---
        if (this.config.mode !== 'recording') {
            pose = await this.poseEngine.processFrame(
                frameData, frameIndex, timestamp, frameWidth, frameHeight
            )
            if (pose) {
                this.lastPoseResult = pose
            }
        }

        // --- Étape 2 : Shot Detection ---
        if (pose && pose.landmarks.length >= 33) {
            // Extraire les angles et la biomécanique
            this.currentAngles = PoseEstimationEngine.extractBodyAngles(pose.landmarks)
            this.currentBiomechanics = PoseEstimationEngine.extractShootingBiomechanics(pose.landmarks)

            // Mettre à jour la trajectoire du poignet
            const wrist = pose.normalizedLandmarks[16] // RIGHT_WRIST
            if (wrist) {
                this.wristTrajectory.push({ x: wrist.x, y: wrist.y, timestamp })
                // Limiter la taille
                if (this.wristTrajectory.length > 90) this.wristTrajectory.shift()
            }

            // Traiter la frame dans le shot detector
            detectedShot = this.shotDetector.processFrame(pose.landmarks, frameIndex, timestamp)

            // Check for immediate biomechanical faults (Nuclear Integration)
            if (this.currentBiomechanics && this.shotDetector.getPhase() === 'gathering') {
                if (this.currentBiomechanics.elbowAngle < 80) {
                    this.emitEvent({ type: 'biomechanic_fault', fault: 'low_elbow', severity: 'medium' })
                }
                if (this.currentBiomechanics.kneeFlexion > 175) {
                    this.emitEvent({ type: 'biomechanic_fault', fault: 'stiff_knees', severity: 'low' })
                }
            }

            if (detectedShot) {
                this.pendingShot = detectedShot
                this.sessionStats.shotsDetected++

                // Générer le feedback immédiat (avant make/miss)
                feedback = this.generateShotFeedback(detectedShot)

                // Convertir en ShotResult compatible
                const estimatedCourtPosition = this.estimateCourtPosition()
                const estimatedZone = this.estimateZone(estimatedCourtPosition)
                shotResult = detectedShotToShotResult(
                    detectedShot,
                    estimatedZone,
                    estimatedCourtPosition,
                ) as ShotResult

                // Ajouter la comparison NBA
                const nbaComp = { similarity: 0, closestPlayer: '', tip: '' }
                    ; (shotResult as any).nbaComparison = nbaComp

                this.sessionStats.allShots.push(shotResult as ShotResult)
            }
        }

        // --- Étape 3 : Ball Tracking ---
        if (this.config.mode === 'full' && ballDetection) {
            this.ballTracker.trackBall(ballDetection)

            // Si un tir est en attente de résolution
            if (this.pendingShot && this.pendingShot.outcome === null) {
                shotOutcome = this.ballTracker.analyzeTrajectory(
                    this.pendingShot.phaseTimestamps.releasePoint
                )

                if (shotOutcome.outcome !== 'unknown' && shotOutcome.confidence > 0.5) {
                    this.pendingShot.outcome = shotOutcome.outcome as 'made' | 'missed' | 'blocked'
                    this.shotDetector.resolveOutcome(this.pendingShot.shotId, this.pendingShot.outcome)
                    this.updateStatsWithOutcome(this.pendingShot.outcome)

                    // Feedback post-résolution
                    feedback = this.generateOutcomeFeedback(this.pendingShot.outcome, shotOutcome)
                    this.pendingShot = null
                }
            }
        }

        // --- Étape 4 : AR Overlay ---
        if (pose && this.config.mode === 'full') {
            arOverlayFrame = this.arOverlay.generateOverlay(
                pose.normalizedLandmarks,
                this.currentAngles!,
                this.currentBiomechanics,
                this.shotDetector.getPhase(),
                this.wristTrajectory,
                timestamp,
            )
        }

        // --- Mettre à jour les stats ---
        const processingTimeMs = performance.now() - startTime
        this.sessionStats.framesProcessed++
        this.sessionStats.sessionDuration = timestamp
        this.updateAvgProcessingTime(processingTimeMs)

        return {
            pose,
            detectedShot,
            shotOutcome,
            arOverlay: arOverlayFrame,
            feedback,
            shotResult,
            processingTimeMs: Math.round(processingTimeMs * 100) / 100,
            timestamp,
        }
    }

    /**
     * Résout manuellement le résultat d'un tir (quand l'utilisateur confirme).
     */
    resolveManual(outcome: 'made' | 'missed'): void {
        if (this.pendingShot) {
            this.pendingShot.outcome = outcome
            this.shotDetector.resolveOutcome(this.pendingShot.shotId, outcome)
            this.updateStatsWithOutcome(outcome)
            this.pendingShot = null
            this.emitEvent({ type: 'manual_resolution', outcome })
        }
    }

    /**
     * Retourne les statistiques temps réel de la session.
     */
    getStats(): RealtimeSessionStats {
        return { ...this.sessionStats }
    }

    /**
     * Enregistre un listener d'événements pipeline.
     */
    on(listener: (event: PipelineEvent) => void): () => void {
        this.eventListeners.push(listener)
        return () => {
            this.eventListeners = this.eventListeners.filter(l => l !== listener)
        }
    }

    /**
     * Arrête le pipeline et libère les ressources.
     */
    async stop(): Promise<void> {
        this.isRunning = false
        await this.poseEngine.dispose()
        this.shotDetector.reset()
        this.ballTracker.reset()
        this.emitEvent({ type: 'pipeline_stopped' })
    }

    /**
     * Réinitialise les stats (nouvelle session).
     */
    resetSession(): void {
        this.sessionStats = this.createEmptyStats()
        this.wristTrajectory = []
        this.pendingShot = null
        this.lastCourtPosition = null
        this.shotDetector.reset()
        this.ballTracker.reset()
        this.poseEngine.resetSmoothing()
    }

    setCourtCalibration(calibration?: PipelineCourtCalibrationConfig): void {
        this.applyCourtCalibration(calibration)
    }

    // ==========================================
    // Private Methods
    // ==========================================

    private handleShotDetectorEvent(event: ShotDetectorEvent): void {
        switch (event.type) {
            case 'shot_detected':
                this.emitEvent({ type: 'shot_detected', shot: event.shot })
                break
            case 'phase_change':
                this.emitEvent({ type: 'phase_change', phase: event.phase })
                // Feedback AR basé sur la phase
                if (event.phase === 'gathering') {
                    this.arOverlay.showFeedback('Tir détecté...', '🏀', '#FEE440', 'bottom', 1000)
                }
                break
            case 'follow_through_quality':
                if (event.quality >= 80) {
                    this.arOverlay.showFeedback('Excellent follow-through!', '✨', '#00F5D4', 'top', 1500)
                }
                break
        }
    }

    private generateShotFeedback(shot: DetectedShot): InstantFeedback {
        const quality = shot.releaseBiomechanics.postureQuality

        if (quality >= 80) {
            return {
                type: 'shot_quality',
                message: 'Mécanique parfaite !',
                emoji: '🔥',
                score: quality,
                grade: 'A+',
                hapticPattern: [0, 50],  // Vibration courte positive
                priority: 1,
                displayDuration: 1500,
            }
        } else if (quality >= 60) {
            return {
                type: 'shot_quality',
                message: 'Bonne mécanique',
                emoji: '✅',
                score: quality,
                grade: 'B+',
                hapticPattern: [0, 30],
                priority: 2,
                displayDuration: 1200,
            }
        } else if (quality >= 40) {
            // Donner un tip spécifique
            const tip = this.getFormTip(shot)
            return {
                type: 'form_tip',
                message: tip,
                emoji: '💡',
                score: quality,
                grade: 'C',
                hapticPattern: [0, 30, 50, 30],  // Double vibration (attention)
                priority: 2,
                displayDuration: 2000,
            }
        } else {
            return {
                type: 'correction',
                message: this.getFormTip(shot),
                emoji: '⚠️',
                score: quality,
                grade: 'D',
                hapticPattern: [0, 80, 50, 80],  // Vibration plus forte
                priority: 1,
                displayDuration: 2500,
            }
        }
    }

    private generateOutcomeFeedback(outcome: 'made' | 'missed' | 'blocked', analysis: ShotOutcomeResult): InstantFeedback {
        if (outcome === 'made') {
            this.sessionStats.currentStreak = Math.max(0, this.sessionStats.currentStreak) + 1
            this.sessionStats.bestStreak = Math.max(this.sessionStats.bestStreak, this.sessionStats.currentStreak)

            const streakMsg = this.sessionStats.currentStreak >= 3
                ? ` 🔥 ${this.sessionStats.currentStreak} d'affilée !`
                : ''

            return {
                type: this.sessionStats.currentStreak >= 3 ? 'streak' : 'encouragement',
                message: `Panier !${streakMsg}`,
                emoji: this.sessionStats.currentStreak >= 5 ? '🔥' : '✅',
                hapticPattern: [0, 100],
                priority: 1,
                displayDuration: 1500,
            }
        } else if (outcome === 'blocked') {
            return {
                type: 'encouragement',
                message: 'Contré ! Essaie un tir plus haut.',
                emoji: '🚫',
                hapticPattern: [0, 50, 30, 50],
                priority: 2,
                displayDuration: 1500,
            }
        } else {
            this.sessionStats.currentStreak = Math.min(0, this.sessionStats.currentStreak) - 1

            return {
                type: 'encouragement',
                message: this.sessionStats.currentStreak <= -3
                    ? 'Respire et reviens aux fondamentaux 🧘'
                    : 'Prochain sera le bon !',
                emoji: this.sessionStats.currentStreak <= -3 ? '🧘' : '💪',
                hapticPattern: [0, 30],
                priority: 3,
                displayDuration: 1200,
            }
        }
    }

    private getFormTip(shot: DetectedShot): string {
        const bio = shot.releaseBiomechanics

        if (bio.elbowAngle < 85) return 'Ouvre ton coude vers 90-95°'
        if (bio.elbowAngle > 105) return 'Resserre ton coude, pense au "L"'
        if (bio.releaseHeightRatio < 1.05) return 'Release plus haut !'
        if (!bio.hasGoodBase) return 'Écarte les pieds, largeur d\'épaules'
        if (!bio.isAligned) return 'Aligne ton coude avec le panier'
        if (bio.kneeFlexion > 170) return 'Fléchis plus les genoux'
        if (!shot.hasFollowThrough) return 'Maintiens ton follow-through !'

        return 'Continue comme ça !'
    }

    private estimateZone(position?: { x: number; y: number }): ShotZone {
        const courtPosition = position ?? this.estimateCourtPosition()
        const detailedZone = getCourtZone(courtPosition.x, courtPosition.y)
        return this.mapCourtZoneToShotZone(detailedZone)
    }

    private estimateCourtPosition(): { x: number; y: number } {
        const lastPose = this.lastPoseResult
        if (lastPose && lastPose.landmarks.length > 24) {
            const lHip = lastPose.landmarks[23]
            const rHip = lastPose.landmarks[24]

            if (lHip && rHip) {
                const pixelX = (lHip.x + rHip.x) / 2
                const pixelY = (lHip.y + rHip.y) / 2

                const rawCourtPosition = this.homographyMatrix
                    ? applyHomography(this.homographyMatrix, pixelX, pixelY)
                    : {
                        x: (pixelX / this.lastFrameDimensions.width) * this.courtDimensions.width,
                        y: (pixelY / this.lastFrameDimensions.height) * this.courtDimensions.height,
                    }

                const clamped = this.clampCourtPosition(rawCourtPosition)
                this.lastCourtPosition = clamped
                return {
                    x: Math.round(clamped.x * 100) / 100,
                    y: Math.round(clamped.y * 100) / 100,
                }
            }
        }

        if (this.lastCourtPosition) {
            return this.lastCourtPosition
        }

        return {
            x: this.courtDimensions.width / 2,
            y: this.courtDimensions.height / 2,
        }
    }

    private mapCourtZoneToShotZone(zone: CourtZone): ShotZone {
        switch (zone) {
            case 'restricted_area':
                return 'restricted'
            case 'paint':
                return 'paint'
            case 'midrange_left':
            case 'midrange_right':
            case 'midrange_top':
                return 'midrange'
            case 'corner3_left':
            case 'corner3_right':
                return 'corner3'
            case 'wing3_left':
            case 'wing3_right':
                return 'wing3'
            case 'backcourt':
                return 'top3'
            case 'top3':
            default:
                return 'top3'
        }
    }

    private clampCourtPosition(position: { x: number; y: number }): { x: number; y: number } {
        return {
            x: Math.max(0, Math.min(this.courtDimensions.width, position.x)),
            y: Math.max(0, Math.min(this.courtDimensions.height, position.y)),
        }
    }

    private applyCourtCalibration(calibration?: PipelineCourtCalibrationConfig): void {
        if (calibration?.courtDimensions) {
            this.courtDimensions = {
                width: Math.max(1, calibration.courtDimensions.width),
                height: Math.max(1, calibration.courtDimensions.height),
            }
        }

        if (calibration?.homographyMatrix) {
            this.homographyMatrix = calibration.homographyMatrix
            return
        }

        if (calibration?.points) {
            this.homographyMatrix = computeHomography(calibration.points)
            return
        }

        this.homographyMatrix = null
    }

    private updateStatsWithOutcome(outcome: 'made' | 'missed' | 'blocked'): void {
        if (outcome === 'made') {
            this.sessionStats.shotsMade++
        } else {
            this.sessionStats.shotsMissed++
        }
        const total = this.sessionStats.shotsMade + this.sessionStats.shotsMissed
        this.sessionStats.fgPct = total > 0
            ? Math.round((this.sessionStats.shotsMade / total) * 1000) / 10
            : 0
    }

    private updateAvgProcessingTime(ms: number): void {
        const n = this.sessionStats.framesProcessed
        this.sessionStats.avgProcessingTimeMs = Math.round(
            ((this.sessionStats.avgProcessingTimeMs * (n - 1)) + ms) / n * 100
        ) / 100
    }

    private emptyFrameResult(timestamp: number): PipelineFrameResult {
        return {
            pose: null,
            detectedShot: null,
            shotOutcome: null,
            arOverlay: null,
            feedback: null,
            shotResult: null,
            processingTimeMs: 0,
            timestamp,
        }
    }

    private createEmptyStats(): RealtimeSessionStats {
        return {
            framesProcessed: 0,
            shotsDetected: 0,
            shotsMade: 0,
            shotsMissed: 0,
            fgPct: 0,
            avgShotQuality: 0,
            avgProcessingTimeMs: 0,
            currentStreak: 0,
            bestStreak: 0,
            sessionDuration: 0,
            allShots: [],
        }
    }

    private emitEvent(event: PipelineEvent): void {
        for (const listener of this.eventListeners) {
            try {
                listener(event)
            } catch (e) {
                console.error('[RealtimePipeline] Event listener error:', e)
            }
        }
    }
}

// ==========================================
// Pipeline Events
// ==========================================

export type PipelineEvent =
    | { type: 'pipeline_initialized' }
    | { type: 'pipeline_stopped' }
    | { type: 'shot_detected'; shot: DetectedShot }
    | { type: 'phase_change'; phase: ShotDetectionPhase }
    | { type: 'manual_resolution'; outcome: 'made' | 'missed' }
    | { type: 'biomechanic_fault'; fault: string; severity: 'low' | 'medium' | 'high' }

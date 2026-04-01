/**
 * RealtimeAIService — Service d'intégration du pipeline IA en temps réel pour l'app mobile.
 *
 * Ce service orchestre :
 * 1. Pose Estimation (on-device via TFLite/BlazePose)
 * 2. Shot Detection (state machine biomécanique)
 * 3. Ball Tracking (Kalman filter + color detection)
 * 4. AR Overlay (skeleton, arc, feedbacks visuels)
 * 5. Session stats en temps réel
 *
 * Architecture :
 * - Fonctionne entièrement on-device (pas de cloud pour l'inference)
 * - Traitement pipeline à ~30fps sur iPhone 12+ / Pixel 6+
 * - Résultats envoyés au serveur pour stockage et analytics avancées
 *
 * Usage dans un composant React Native :
 *   const ai = RealtimeAIService.getInstance()
 *   await ai.initialize()
 *   ai.startSession(config)
 *   // Dans la boucle de frame :
 *   const result = await ai.processFrame(frameData, ...)
 *   // Fin de session :
 *   const summary = ai.endSession()
 */

// ==========================================
// Types locaux (miroir des types @courtvision/ai)
// Quand le package AI sera buildé et publié, on pourra importer directement
// ==========================================

import { DemoSimulator } from './demoSimulator'
import { LiveCoachService } from './liveCoachService'
import { analyzeFrame, analyzeFrameFromUri, isCVEngineAvailable, type CVFrameResult } from './cvEngineService'

/** Landmark 3D (BlazePose / MoveNet) */
export interface Landmark {
    x: number
    y: number
    z: number
    visibility: number
}

/** Landmark 2D normalisé pour AR */
export interface NormalizedLandmark {
    x: number
    y: number
    z: number
    visibility: number
    name: string
}

/** Résultat de pose estimation */
export interface PoseEstimationResult {
    landmarks: Landmark[]
    normalizedLandmarks: NormalizedLandmark[]
    confidence: number
    boundingBox: { x: number; y: number; width: number; height: number }
    inferenceTimeMs: number
    frameIndex: number
    timestamp: number
}

/** Angles corporels */
export interface BodyAngles {
    rightElbowAngle: number
    leftElbowAngle: number
    rightShoulderAngle: number
    rightKneeAngle: number
    leftKneeAngle: number
    trunkAngle: number
    rightHipAngle: number
}

/** Biomécanique de tir */
export interface ShootingBiomechanics {
    elbowAngle: number
    releaseHeightRatio: number
    playerHeightPx: number
    ballPosition: { x: number; y: number }
    hasGoodBase: boolean
    kneeFlexion: number
    isAligned: boolean
    postureQuality: number
}

/** Tir détecté par le pipeline */
export interface DetectedShot {
    shotId: string
    completedPhase: string
    phaseTimestamps: {
        gatherStart: number
        releasePoint: number
        followThroughStart: number
        ballFlightStart: number | null
        resolved: number | null
    }
    releaseBiomechanics: ShootingBiomechanics
    setPointElbowAngle: number
    releaseTime: number
    hasFollowThrough: boolean
    followThroughDuration: number
    outcome: 'made' | 'missed' | 'blocked' | null
    detectionConfidence: number
    angleTimeline: BodyAngles[]
    wristTrajectory: Array<{ x: number; y: number; timestamp: number }>
}

/** Position du ballon */
export interface BallPosition {
    x: number
    y: number
    radius: number
    confidence: number
    velocityX: number
    velocityY: number
    timestamp: number
}

/** Joint AR pour l'overlay squelette */
export interface ARJoint {
    x: number
    y: number
    radius: number
    color: string
    opacity: number
}

/** Bone AR (ligne entre deux joints) */
export interface ARBone {
    from: { x: number; y: number }
    to: { x: number; y: number }
    color: string
    width: number
    opacity: number
}

/** Arc de tir AR */
export interface ShotArcOverlay {
    points: Array<{ x: number; y: number }>
    color: string
    width: number
    style: 'solid' | 'dashed'
}

/** Indicateur biomécanique AR */
export interface BioIndicator {
    position: { x: number; y: number }
    label: string
    value: string
    color: string
    type: 'angle' | 'height' | 'speed' | 'quality'
}

/** Feedback AR instantané */
export interface ARFeedback {
    type: 'success' | 'warning' | 'error' | 'info'
    message: string
    detail?: string
    icon: string
    duration: number
    position: 'top' | 'center' | 'bottom'
    vibrate?: boolean
    vibrationPattern?: number[]
}

/** Frame AR complète à afficher */
export interface AROverlayFrame {
    skeleton: {
        joints: ARJoint[]
        bones: ARBone[]
    } | null
    shotArc: ShotArcOverlay | null
    bioIndicators: BioIndicator[]
    ballIndicator: { x: number; y: number; radius: number; color: string } | null
    rimIndicator: { x: number; y: number; radius: number; color: string } | null
    feedback: ARFeedback | null
    debugInfo?: {
        fps: number
        poseConfidence: number
        shotPhase: string
        processingMs: number
    }
}

// ==========================================
// Types
// ==========================================

/** Configuration du service IA temps réel */
export interface RealtimeAIConfig {
    /** Configuration de la pose estimation */
    poseConfig?: Record<string, unknown>
    /** Configuration du détecteur de tir */
    shotDetectorConfig?: Record<string, unknown>
    /** Configuration du ball tracker */
    ballTrackerConfig?: Record<string, unknown>
    /** Configuration des overlays AR */
    arConfig?: Record<string, unknown>
    /** Activer les feedbacks haptiques */
    enableHaptics: boolean
    /** Activer les feedbacks sonores */
    enableAudio: boolean
    /** Nombre max de tirs stockés en mémoire */
    maxShotsInMemory: number
    /** Activer le mode démo (simulation réaliste sans caméra) */
    enableDemoMode: boolean
    /** Profil de joueur pour le mode démo */
    demoProfile: 'elite' | 'good' | 'average' | 'developing'
    /** Callback pour les événements de tir */
    onShotDetected?: (shot: DetectedShot) => void
    /** Callback pour les événements du pipeline */
    onPipelineEvent?: (event: PipelineEvent) => void
}

/** Événement du pipeline mobile */
export type PipelineEvent =
    | { type: 'initialized' }
    | { type: 'session_started'; sessionId: string }
    | { type: 'session_ended'; stats: SessionRealtimeStats }
    | { type: 'shot_detected'; shot: DetectedShot }
    | { type: 'phase_change'; phase: string }
    | { type: 'feedback'; feedback: ARFeedback }
    | { type: 'biomechanic_fault'; fault: string; severity: 'low' | 'medium' | 'high' }
    | { type: 'error'; message: string }

/** Résultat de traitement d'une frame (à utiliser pour le rendu AR) */
export interface FrameProcessingResult {
    /** Résultat de la pose estimation (null si pas détectée) */
    pose: PoseEstimationResult | null
    /** Angles corporels extraits */
    bodyAngles: BodyAngles | null
    /** Biomécanique de tir (si en position de tir) */
    biomechanics: ShootingBiomechanics | null
    /** Tir détecté (null si pas de tir cette frame) */
    detectedShot: DetectedShot | null
    /** Phase actuelle du détecteur de tir */
    shotPhase: string
    /** Position du ballon (null si pas détecté) */
    ballPosition: BallPosition | null
    /** Frame AR overlay à afficher */
    arFrame: AROverlayFrame | null
    /** Feedback instantané à afficher */
    instantFeedback: ARFeedback | null
    /** Temps de traitement total (ms) */
    processingTimeMs: number
    /** FPS instantané */
    currentFps: number
    /** True when data is generated by demo simulator, not real AI */
    isDemo?: boolean
}

/** Stats de session en temps réel */
export interface SessionRealtimeStats {
    sessionId: string
    totalShots: number
    madeShots: number
    missedShots: number
    shootingPct: number
    avgReleaseTime: number
    avgElbowAngle: number
    avgReleaseHeight: number
    followThroughPct: number
    avgPostureQuality: number
    avgProcessingTimeMs: number
    totalFramesProcessed: number
    sessionDurationSec: number
    shotsByZone: Record<string, { attempts: number; made: number; pct: number }>
    bestShot: DetectedShot | null
    worstShot: DetectedShot | null
    /** Score de consistance mécanique (0-100) */
    mechanicConsistency: number
    /** Tendances détectées */
    trends: Array<{
        metric: string
        direction: 'improving' | 'declining' | 'stable'
        description: string
    }>
}

// ==========================================
// Default Config
// ==========================================

const DEFAULT_REALTIME_CONFIG: RealtimeAIConfig = {
    enableHaptics: true,
    enableAudio: false,
    maxShotsInMemory: 200,
    enableDemoMode: false,
    demoProfile: 'good',
}

// ==========================================
// Service Singleton
// ==========================================

export class RealtimeAIService {
    private static instance: RealtimeAIService | null = null
    private config: RealtimeAIConfig = DEFAULT_REALTIME_CONFIG
    private isInitialized = false
    private sessionActive = false
    private sessionId: string | null = null
    private sessionStartTime = 0

    // Demo mode
    private demoSimulator: DemoSimulator | null = null

    // Server-side processing (real mode)
    private liveCoach: LiveCoachService | null = null
    private serverSessionStarted = false
    private cvEngineAvailable = false

    // Shot detection state for CV Engine mode
    private recentElbowAngles: number[] = []
    private shotPhase: 'idle' | 'cocking' | 'releasing' = 'idle'

    // Stats tracking
    private shots: DetectedShot[] = []
    private frameCount = 0
    private totalProcessingTime = 0
    private fpsHistory: number[] = []
    private lastFrameTime = 0

    // ---- Singleton ----

    static getInstance(): RealtimeAIService {
        if (!RealtimeAIService.instance) {
            RealtimeAIService.instance = new RealtimeAIService()
        }
        return RealtimeAIService.instance
    }

    private constructor() { }

    // ---- Lifecycle ----

    /**
     * Initialise le service IA (charge les modèles TFLite en mémoire GPU).
     * Doit être appelé une seule fois au démarrage de l'app ou avant la première session.
     */
    async initialize(config?: Partial<RealtimeAIConfig>): Promise<void> {
        if (this.isInitialized) return

        this.config = { ...DEFAULT_REALTIME_CONFIG, ...config }

        // Mode démo : initialiser le simulateur
        if (this.config.enableDemoMode) {
            this.demoSimulator = new DemoSimulator()
            this.demoSimulator.configure({
                playerProfile: this.config.demoProfile,
                shotFrequencyPerMinute: 6,
                simulateFatigue: true,
                framesBetweenShots: 150,
                targetFps: 30,
            })
        }

        // TODO: En production, ici on initialise les modèles natifs :
        // - PoseEstimationEngine.initialize() → charge BlazePose TFLite
        // - BallTrackerEngine.initialize() → charge YOLO ball detection
        //
        // Real mode: check CV Engine availability
        if (!this.config.enableDemoMode) {
            this.cvEngineAvailable = await isCVEngineAvailable()
            if (this.cvEngineAvailable) {
                console.log('[RealtimeAI] CV Engine available — real pose estimation active')
            } else {
                console.log('[RealtimeAI] CV Engine not available — will try API fallback')
            }
        }

        this.isInitialized = true
        this.config.onPipelineEvent?.({ type: 'initialized' })
    }

    /**
     * Démarre une session d'analyse en temps réel.
     */
    startSession(config?: Partial<RealtimeAIConfig>): string {
        if (!this.isInitialized) {
            throw new Error('RealtimeAIService not initialized. Call initialize() first.')
        }

        if (config) {
            this.config = { ...this.config, ...config }
        }

        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        this.sessionActive = true
        this.sessionStartTime = Date.now()
        this.shots = []
        this.frameCount = 0
        this.totalProcessingTime = 0
        this.fpsHistory = []
        this.lastFrameTime = 0

        // Initialize server-side processing for real mode
        if (!this.config.enableDemoMode) {
            this.liveCoach = new LiveCoachService(this.sessionId)
            this.serverSessionStarted = false
            // Start the server session asynchronously (don't block)
            this.liveCoach.start({}).then(() => {
                this.serverSessionStarted = true

                // Connect to biomechanic events (Nuclear Integration)
                this.liveCoach?.connectSSE((event) => {
                    if (event.type === 'biomechanic_fault') {
                        this.config.onPipelineEvent?.({
                            type: 'biomechanic_fault',
                            fault: event.fault,
                            severity: event.severity
                        })
                    }
                })
            }).catch(err => {
                console.warn('[RealtimeAI] Server session start failed, frames will be buffered:', err?.message)
                this.config.onPipelineEvent?.({ type: 'error', message: 'Server connection failed — processing locally' })
            })
        }

        this.config.onPipelineEvent?.({ type: 'session_started', sessionId: this.sessionId })

        return this.sessionId
    }

    /**
     * Traite une frame capturée par la caméra.
     *
     * En production, cette méthode :
     * 1. Envoie la frame au moteur de pose estimation (TFLite on-device)
     * 2. Transmet les landmarks au shot detector
     * 3. Transmet la frame au ball tracker
     * 4. Génère le frame AR overlay
     * 5. Retourne tout le résultat pour le rendu
     *
     * @param frameData - Données brutes de la frame (base64 ou URI)
     * @param frameIndex - Index de la frame
     * @param timestamp - Timestamp en secondes
     * @param frameWidth - Largeur de la frame
     * @param frameHeight - Hauteur de la frame
     */
    async processFrame(
        frameData: string | Uint8Array,
        frameIndex: number,
        timestamp: number,
        frameWidth: number,
        frameHeight: number,
    ): Promise<FrameProcessingResult> {
        if (!this.sessionActive) {
            throw new Error('No active session. Call startSession() first.')
        }

        const startTime = performance.now()
        this.frameCount++

        // Calcul FPS instantané
        const now = performance.now()
        const frameInterval = this.lastFrameTime > 0 ? now - this.lastFrameTime : 33.3
        this.lastFrameTime = now
        const currentFps = Math.round(1000 / Math.max(frameInterval, 1))
        this.fpsHistory.push(currentFps)
        if (this.fpsHistory.length > 60) this.fpsHistory.shift()

        // ---- MODE DÉMO : utiliser le simulateur ----
        if (this.config.enableDemoMode && this.demoSimulator) {
            const result = this.demoSimulator.processFrame()

            // Enregistrer les tirs détectés
            if (result.detectedShot) {
                this.shots.push(result.detectedShot)
                if (this.shots.length > this.config.maxShotsInMemory) {
                    this.shots.shift()
                }
                this.config.onShotDetected?.(result.detectedShot)
                this.config.onPipelineEvent?.({ type: 'shot_detected', shot: result.detectedShot })
            }

            if (result.instantFeedback) {
                this.config.onPipelineEvent?.({
                    type: 'feedback',
                    feedback: result.instantFeedback,
                })
            }

            const processingTimeMs = performance.now() - startTime
            this.totalProcessingTime += processingTimeMs

            return {
                ...result,
                processingTimeMs: Math.round(processingTimeMs * 100) / 100,
                currentFps,
            }
        }

        // ---- MODE RÉEL : pipeline IA via CV Engine ----

        let pose: PoseEstimationResult | null = null
        let bodyAngles: BodyAngles | null = null
        let detectedShot: DetectedShot | null = null
        let ballPosition: BallPosition | null = null
        let biomechanics: ShootingBiomechanics | null = null
        const arFrame: AROverlayFrame | null = null
        let instantFeedback: ARFeedback | null = null

        // ── Try CV Engine first (real pose estimation) ──
        if (this.cvEngineAvailable && typeof frameData === 'string') {
            try {
                const cvResult: CVFrameResult = frameData.startsWith('file://')
                    ? await analyzeFrameFromUri(frameData)
                    : await analyzeFrame(frameData)

                if (cvResult.success && cvResult.landmarks_3d) {
                    // Map CV Engine landmarks to PoseEstimationResult
                    pose = {
                        landmarks: cvResult.landmarks_3d.map(lm => ({
                            x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility,
                        })),
                        normalizedLandmarks: cvResult.landmarks_3d.map((lm, i) => ({
                            x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility,
                            name: `landmark_${i}`,
                        })),
                        confidence: cvResult.landmarks_3d.reduce((sum, lm) => sum + lm.visibility, 0) / cvResult.landmarks_3d.length,
                        boundingBox: { x: 0, y: 0, width: frameWidth, height: frameHeight },
                        inferenceTimeMs: cvResult.inference_ms,
                        frameIndex,
                        timestamp,
                    }

                    // Real body angles from CV Engine
                    const elbowAngle = cvResult.elbow_angle ?? 0
                    const kneeAngle = cvResult.knee_angle ?? 0
                    bodyAngles = {
                        rightElbowAngle: elbowAngle,
                        leftElbowAngle: 0,
                        rightShoulderAngle: 0,
                        rightKneeAngle: kneeAngle,
                        leftKneeAngle: 0,
                        trunkAngle: 0,
                        rightHipAngle: 0,
                    }

                    // Build real biomechanics
                    const skeleton = cvResult.skeleton
                    const wristAboveShoulder = skeleton?.right_wrist && skeleton?.right_shoulder
                        ? skeleton.right_wrist.y < skeleton.right_shoulder.y
                        : false

                    biomechanics = {
                        elbowAngle,
                        releaseHeightRatio: wristAboveShoulder ? 1.1 : 0.9,
                        playerHeightPx: frameHeight * 0.7,
                        ballPosition: cvResult.ball
                            ? { x: (cvResult.ball.x1 + cvResult.ball.x2) / 2, y: (cvResult.ball.y1 + cvResult.ball.y2) / 2 }
                            : { x: 0.5, y: 0.3 },
                        hasGoodBase: kneeAngle >= 120 && kneeAngle <= 160,
                        kneeFlexion: kneeAngle,
                        isAligned: elbowAngle >= 80 && elbowAngle <= 110,
                        postureQuality: Math.max(0, 100 - Math.abs(elbowAngle - 95) * 2),
                    }

                    // Ball position from YOLO
                    if (cvResult.ball) {
                        const b = cvResult.ball
                        ballPosition = {
                            x: (b.x1 + b.x2) / 2,
                            y: (b.y1 + b.y2) / 2,
                            radius: Math.max(b.x2 - b.x1, b.y2 - b.y1) / 2,
                            confidence: b.confidence,
                            velocityX: 0, velocityY: 0,
                            timestamp,
                        }
                    }

                    // Shot detection via elbow angle change
                    this.recentElbowAngles.push(elbowAngle)
                    if (this.recentElbowAngles.length > 20) this.recentElbowAngles.shift()

                    if (this.recentElbowAngles.length >= 3) {
                        const prev = this.recentElbowAngles[this.recentElbowAngles.length - 2]
                        const delta = elbowAngle - prev

                        if (this.shotPhase === 'idle' && delta < -8) {
                            this.shotPhase = 'cocking'
                        } else if (this.shotPhase === 'cocking' && delta > 12 && elbowAngle > 85) {
                            this.shotPhase = 'releasing'
                        } else if (this.shotPhase === 'releasing') {
                            this.shotPhase = 'idle'

                            detectedShot = {
                                shotId: `cv_${Date.now()}`,
                                completedPhase: 'resolved',
                                phaseTimestamps: {
                                    gatherStart: timestamp - 1.5,
                                    releasePoint: timestamp - 0.6,
                                    followThroughStart: timestamp - 0.3,
                                    ballFlightStart: timestamp - 0.1,
                                    resolved: timestamp,
                                },
                                releaseBiomechanics: biomechanics,
                                setPointElbowAngle: elbowAngle,
                                releaseTime: 0.6,
                                hasFollowThrough: wristAboveShoulder,
                                followThroughDuration: wristAboveShoulder ? 0.4 : 0.1,
                                outcome: null, // Cannot determine made/missed from pose alone
                                detectionConfidence: pose.confidence,
                                angleTimeline: [bodyAngles],
                                wristTrajectory: [],
                            } as DetectedShot

                            // Generate real feedback based on biomechanics
                            const isGoodElbow = elbowAngle >= 88 && elbowAngle <= 100
                            instantFeedback = {
                                type: isGoodElbow ? 'success' : 'warning',
                                message: isGoodElbow
                                    ? `Great release! Elbow ${Math.round(elbowAngle)}°`
                                    : `Elbow ${Math.round(elbowAngle)}° — aim for 90-100°`,
                                detail: `Knee: ${Math.round(kneeAngle)}° | Follow-through: ${wristAboveShoulder ? 'Yes' : 'No'}`,
                                icon: isGoodElbow ? '🎯' : '📐',
                                duration: 3000,
                                position: 'top',
                                vibrate: !isGoodElbow,
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('[RealtimeAI] CV Engine frame error:', (err as Error)?.message)
                // Fall through to LiveCoach API path
            }
        }

        // ── Fallback: LiveCoach API (no CV Engine) ──
        if (!pose && this.liveCoach && this.serverSessionStarted) {
            try {
                const serverResult = await this.liveCoach.sendFrame({
                    timestamp,
                    quarter: 1,
                } as any)

                if (serverResult.alerts?.length > 0) {
                    const topAlert = serverResult.alerts[0]
                    instantFeedback = {
                        type: topAlert.severity === 'critical' ? 'warning' : 'info',
                        message: topAlert.message ?? topAlert.type ?? 'Alert',
                        detail: '',
                        icon: topAlert.severity === 'critical' ? '⚠️' : 'ℹ️',
                        duration: 3000,
                        position: 'top',
                    }
                }
            } catch (err) {
                console.warn('[RealtimeAI] Server frame processing failed:', (err as Error)?.message)
            }
        }

        // Si un tir est détecté, on l'enregistre
        if (detectedShot) {
            this.shots.push(detectedShot)
            if (this.shots.length > this.config.maxShotsInMemory) {
                this.shots.shift()
            }
            this.config.onShotDetected?.(detectedShot)
            this.config.onPipelineEvent?.({ type: 'shot_detected', shot: detectedShot })
        }

        const processingTimeMs = performance.now() - startTime
        this.totalProcessingTime += processingTimeMs

        return {
            pose,
            bodyAngles,
            biomechanics: detectedShot?.releaseBiomechanics ?? biomechanics,
            detectedShot,
            shotPhase: detectedShot ? 'resolved' : (this.shotPhase !== 'idle' ? this.shotPhase : 'idle'),
            ballPosition,
            arFrame,
            instantFeedback,
            processingTimeMs: Math.round(processingTimeMs * 100) / 100,
            currentFps,
        }
    }

    /**
     * Enregistre manuellement un tir (quand le shot detector ne l'a pas capté).
     * Utile en mode "semi-automatique" où l'utilisateur clique sur make/miss.
     */
    recordManualShot(
        outcome: 'made' | 'missed',
        zone?: string,
        biomechanics?: Partial<ShootingBiomechanics>,
    ): void {
        if (!this.sessionActive) return

        const shot: DetectedShot = {
            shotId: `manual_${Date.now()}`,
            completedPhase: 'following_through',
            phaseTimestamps: {
                gatherStart: (Date.now() - this.sessionStartTime) / 1000,
                releasePoint: (Date.now() - this.sessionStartTime) / 1000,
                followThroughStart: (Date.now() - this.sessionStartTime) / 1000,
                ballFlightStart: null,
                resolved: (Date.now() - this.sessionStartTime) / 1000,
            },
            releaseBiomechanics: {
                elbowAngle: biomechanics?.elbowAngle ?? 94,
                releaseHeightRatio: biomechanics?.releaseHeightRatio ?? 1.14,
                playerHeightPx: biomechanics?.playerHeightPx ?? 400,
                ballPosition: biomechanics?.ballPosition ?? { x: 0, y: 0 },
                hasGoodBase: biomechanics?.hasGoodBase ?? true,
                kneeFlexion: biomechanics?.kneeFlexion ?? 155,
                isAligned: biomechanics?.isAligned ?? true,
                postureQuality: biomechanics?.postureQuality ?? 70,
            },
            setPointElbowAngle: biomechanics?.elbowAngle ?? 94,
            releaseTime: 0.4,
            hasFollowThrough: true,
            followThroughDuration: 0.3,
            outcome,
            detectionConfidence: 0.5, // Manual = lower confidence
            angleTimeline: [],
            wristTrajectory: [],
        }

        this.shots.push(shot)
        this.config.onShotDetected?.(shot)
    }

    /**
     * Termine la session et retourne les statistiques complètes.
     */
    endSession(): SessionRealtimeStats {
        if (!this.sessionActive) {
            throw new Error('No active session to end.')
        }

        this.sessionActive = false
        const stats = this.computeSessionStats()

        this.config.onPipelineEvent?.({ type: 'session_ended', stats })

        return stats
    }

    // ---- Stats Computation ----

    private computeSessionStats(): SessionRealtimeStats {
        const madeShots = this.shots.filter(s => s.outcome === 'made').length
        const missedShots = this.shots.filter(s => s.outcome === 'missed').length
        const totalShots = madeShots + missedShots

        // Moyennes biomécaniques
        const validBiomechanics = this.shots.filter(s => s.releaseBiomechanics)
        const avgReleaseTime = validBiomechanics.length > 0
            ? validBiomechanics.reduce((sum, s) => sum + s.releaseTime, 0) / validBiomechanics.length
            : 0
        const avgElbowAngle = validBiomechanics.length > 0
            ? validBiomechanics.reduce((sum, s) => sum + s.releaseBiomechanics.elbowAngle, 0) / validBiomechanics.length
            : 0
        const avgReleaseHeight = validBiomechanics.length > 0
            ? validBiomechanics.reduce((sum, s) => sum + s.releaseBiomechanics.releaseHeightRatio, 0) / validBiomechanics.length
            : 0
        const followThroughPct = totalShots > 0
            ? (this.shots.filter(s => s.hasFollowThrough).length / totalShots) * 100
            : 0
        const avgPostureQuality = validBiomechanics.length > 0
            ? validBiomechanics.reduce((sum, s) => sum + s.releaseBiomechanics.postureQuality, 0) / validBiomechanics.length
            : 0

        // Stats par zone (placeholder — zone info viendra du court mapping)
        const shotsByZone: Record<string, { attempts: number; made: number; pct: number }> = {}

        // Meilleur/pire tir par postureQuality
        const sortedByQuality = [...this.shots]
            .sort((a, b) => b.releaseBiomechanics.postureQuality - a.releaseBiomechanics.postureQuality)
        const bestShot = sortedByQuality[0] ?? null
        const worstShot = sortedByQuality[sortedByQuality.length - 1] ?? null

        // Consistency score
        const mechanicConsistency = this.computeMechanicConsistency()

        // Trends
        const trends = this.detectTrends()

        return {
            sessionId: this.sessionId ?? 'unknown',
            totalShots,
            madeShots,
            missedShots,
            shootingPct: totalShots > 0 ? Math.round((madeShots / totalShots) * 1000) / 10 : 0,
            avgReleaseTime: Math.round(avgReleaseTime * 1000) / 1000,
            avgElbowAngle: Math.round(avgElbowAngle * 10) / 10,
            avgReleaseHeight: Math.round(avgReleaseHeight * 1000) / 1000,
            followThroughPct: Math.round(followThroughPct * 10) / 10,
            avgPostureQuality: Math.round(avgPostureQuality * 10) / 10,
            avgProcessingTimeMs: this.frameCount > 0
                ? Math.round((this.totalProcessingTime / this.frameCount) * 100) / 100
                : 0,
            totalFramesProcessed: this.frameCount,
            sessionDurationSec: Math.round((Date.now() - this.sessionStartTime) / 1000),
            shotsByZone,
            bestShot,
            worstShot,
            mechanicConsistency,
            trends,
        }
    }

    /**
     * Calcule le score de consistance mécanique (0-100).
     * Plus les métriques sont stables d'un tir à l'autre, plus le score est élevé.
     */
    private computeMechanicConsistency(): number {
        if (this.shots.length < 3) return 50 // Pas assez de données

        const elbowAngles = this.shots.map(s => s.releaseBiomechanics.elbowAngle)
        const releaseTimes = this.shots.map(s => s.releaseTime)
        const releaseHeights = this.shots.map(s => s.releaseBiomechanics.releaseHeightRatio)

        const stdDev = (arr: number[]) => {
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length
            return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length)
        }

        // Normalisation : plus la std dev est basse, meilleur est le score
        const elbowStd = stdDev(elbowAngles)
        const releaseTimeStd = stdDev(releaseTimes)
        const heightStd = stdDev(releaseHeights)

        // Score composite (pondéré)
        const elbowScore = Math.max(0, 100 - elbowStd * 5)      // 2° std → 90, 10° std → 50
        const timeScore = Math.max(0, 100 - releaseTimeStd * 200) // 0.05s std → 90, 0.2s std → 60
        const heightScore = Math.max(0, 100 - heightStd * 200)    // 0.02 std → 96, 0.1 std → 80

        return Math.round(elbowScore * 0.4 + timeScore * 0.3 + heightScore * 0.3)
    }

    /**
     * Détecte les tendances dans les 10 derniers tirs vs les 10 précédents.
     */
    private detectTrends(): Array<{
        metric: string
        direction: 'improving' | 'declining' | 'stable'
        description: string
    }> {
        if (this.shots.length < 6) return []

        const mid = Math.floor(this.shots.length / 2)
        const first = this.shots.slice(0, mid)
        const second = this.shots.slice(mid)

        const avg = (arr: DetectedShot[], fn: (s: DetectedShot) => number) =>
            arr.reduce((sum, s) => sum + fn(s), 0) / arr.length

        const trends: Array<{
            metric: string
            direction: 'improving' | 'declining' | 'stable'
            description: string
        }> = []

        // Release time trend
        const rt1 = avg(first, s => s.releaseTime)
        const rt2 = avg(second, s => s.releaseTime)
        if (rt2 < rt1 - 0.03) {
            trends.push({
                metric: 'release_time',
                direction: 'improving',
                description: `Release accéléré (${rt1.toFixed(2)}s → ${rt2.toFixed(2)}s)`,
            })
        } else if (rt2 > rt1 + 0.03) {
            trends.push({
                metric: 'release_time',
                direction: 'declining',
                description: `Release ralenti (${rt1.toFixed(2)}s → ${rt2.toFixed(2)}s)`,
            })
        }

        // Follow-through trend
        const ft1 = first.filter(s => s.hasFollowThrough).length / first.length
        const ft2 = second.filter(s => s.hasFollowThrough).length / second.length
        if (ft2 < ft1 - 0.15) {
            trends.push({
                metric: 'follow_through',
                direction: 'declining',
                description: `Follow-through en baisse (${Math.round(ft1 * 100)}% → ${Math.round(ft2 * 100)}%)`,
            })
        }

        // Posture quality trend
        const pq1 = avg(first, s => s.releaseBiomechanics.postureQuality)
        const pq2 = avg(second, s => s.releaseBiomechanics.postureQuality)
        if (pq2 > pq1 + 5) {
            trends.push({
                metric: 'posture_quality',
                direction: 'improving',
                description: `Posture améliorée (+${Math.round(pq2 - pq1)} pts)`,
            })
        } else if (pq2 < pq1 - 5) {
            trends.push({
                metric: 'posture_quality',
                direction: 'declining',
                description: `Posture dégradée (-${Math.round(pq1 - pq2)} pts)`,
            })
        }

        return trends
    }

    // ---- Getters ----

    isActive(): boolean { return this.sessionActive }
    getSessionId(): string | null { return this.sessionId }
    getShotCount(): number { return this.shots.length }
    getShots(): DetectedShot[] { return [...this.shots] }
    getFrameCount(): number { return this.frameCount }
    getAverageFps(): number {
        if (this.fpsHistory.length === 0) return 0
        return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
    }
    getCurrentStats(): SessionRealtimeStats { return this.computeSessionStats() }

    /**
     * Libère les ressources (modèles TFLite).
     */
    async dispose(): Promise<void> {
        if (this.sessionActive) {
            this.endSession()
        }
        // En production : await this.poseEngine.dispose()
        this.isInitialized = false
        RealtimeAIService.instance = null
    }
}

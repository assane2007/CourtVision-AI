/**
 * DemoSimulator — Générateur de données d'entraînement réalistes pour le mode démo.
 *
 * Simule un pipeline IA complet avec :
 * - Poses biomécaniques réalistes basées sur les données NBA 2023-24
 * - Variations naturelles de mécanique de tir
 * - Résultats make/miss corrélés à la qualité de mécanique
 * - Timeline de fatigue progressive
 * - Feedback AR cohérent
 *
 * Usage :
 *   const demo = new DemoSimulator()
 *   demo.start({ playerProfile: 'average', shotFrequency: 5 })
 *   const shot = demo.generateNextShot()
 */

import type {
    DetectedShot,
    ShootingBiomechanics,
    BodyAngles,
    AROverlayFrame,
    ARFeedback,
    ARJoint,
    ARBone,
    BioIndicator,
    PoseEstimationResult,
    Landmark,
    NormalizedLandmark,
    FrameProcessingResult,
} from './realtimeAIService'

// ==========================================
// Types
// ==========================================

export type DemoPlayerProfile = 'elite' | 'good' | 'average' | 'developing'

export interface DemoConfig {
    /** Profil du joueur simulé */
    playerProfile: DemoPlayerProfile
    /** Fréquence de tir (tirs par minute) */
    shotFrequencyPerMinute: number
    /** Probabilité de tir réussi (override du profil) */
    overrideMadePct?: number
    /** Simuler la fatigue progressive */
    simulateFatigue: boolean
    /** Nombre de frames entre chaque tir */
    framesBetweenShots: number
    /** FPS simulé */
    targetFps: number
}

interface PlayerMechanics {
    /** Angle du coude moyen et std dev */
    elbowAngle: { mean: number; std: number }
    /** Hauteur de release (ratio) */
    releaseHeight: { mean: number; std: number }
    /** Temps de release (secondes) */
    releaseTime: { mean: number; std: number }
    /** Flexion du genou */
    kneeFlexion: { mean: number; std: number }
    /** Qualité de posture base */
    postureQualityBase: number
    /** % de follow-through */
    followThroughPct: number
    /** FG% attendu (corrélé à la mécanique) */
    expectedFgPct: number
    /** Facteur de consistance (0-1, 1 = très consistant) */
    consistencyFactor: number
}

// ==========================================
// NBA-Realistic Player Profiles
// ==========================================

const PROFILES: Record<DemoPlayerProfile, PlayerMechanics> = {
    elite: {
        elbowAngle: { mean: 93, std: 2.5 },
        releaseHeight: { mean: 1.16, std: 0.02 },
        releaseTime: { mean: 0.40, std: 0.02 },
        kneeFlexion: { mean: 155, std: 3 },
        postureQualityBase: 88,
        followThroughPct: 0.95,
        expectedFgPct: 0.52,
        consistencyFactor: 0.92,
    },
    good: {
        elbowAngle: { mean: 96, std: 4 },
        releaseHeight: { mean: 1.12, std: 0.03 },
        releaseTime: { mean: 0.45, std: 0.03 },
        kneeFlexion: { mean: 150, std: 5 },
        postureQualityBase: 74,
        followThroughPct: 0.85,
        expectedFgPct: 0.44,
        consistencyFactor: 0.80,
    },
    average: {
        elbowAngle: { mean: 100, std: 6 },
        releaseHeight: { mean: 1.08, std: 0.04 },
        releaseTime: { mean: 0.50, std: 0.05 },
        kneeFlexion: { mean: 145, std: 7 },
        postureQualityBase: 60,
        followThroughPct: 0.70,
        expectedFgPct: 0.38,
        consistencyFactor: 0.65,
    },
    developing: {
        elbowAngle: { mean: 108, std: 10 },
        releaseHeight: { mean: 1.02, std: 0.06 },
        releaseTime: { mean: 0.58, std: 0.08 },
        kneeFlexion: { mean: 138, std: 10 },
        postureQualityBase: 45,
        followThroughPct: 0.50,
        expectedFgPct: 0.30,
        consistencyFactor: 0.45,
    },
}

// ==========================================
// Demo Feedback Templates
// ==========================================

const FEEDBACK_TEMPLATES = {
    greatShot: [
        { message: 'Mécanique parfaite ! 🔥', detail: 'Angle et release dans la zone NBA optimale' },
        { message: 'Tir de sniper ! 🎯', detail: 'Release rapide et propre, continue comme ça' },
        { message: 'Forme élite ! ⭐', detail: 'Ta mécanique rivalise avec les meilleurs' },
    ],
    goodShot: [
        { message: 'Bon tir ! 👍', detail: 'Mécanique solide, quelques ajustements possibles' },
        { message: 'Bien joué !', detail: 'Base stable et release correct' },
        { message: 'Consistant 💪', detail: 'Tu maintiens une bonne forme' },
    ],
    improvementNeeded: [
        { message: 'Redresse le coude', detail: 'Vise 90-95° pour plus de consistance' },
        { message: 'Release plus haut', detail: 'Le point de release est un peu bas' },
        { message: 'Flexion des genoux', detail: 'Plus de puissance vient des jambes' },
    ],
    missAnalysis: [
        { message: 'Court → plus d\'arc', detail: 'Le tir était court, augmente l\'angle de release' },
        { message: 'Vérifie l\'alignement', detail: 'Coude légèrement décalé à gauche' },
        { message: 'Follow-through !', detail: 'Le poignet ne reste pas assez longtemps' },
    ],
}

// ==========================================
// Utility
// ==========================================

function gaussianRandom(mean: number, std: number): number {
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z * std
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

// ==========================================
// Skeleton Generator (for AR overlay)
// ==========================================

function generateDemoSkeleton(phase: 'idle' | 'gathering' | 'set_point' | 'releasing' | 'follow_through'): {
    joints: ARJoint[]
    bones: ARBone[]
} {
    // Squelette simplifié basé sur la phase de tir
    // Positions normalisées (0-1)
    const baseJoints: Record<string, { x: number; y: number }> = {
        head:           { x: 0.50, y: 0.10 },
        neck:           { x: 0.50, y: 0.18 },
        rightShoulder:  { x: 0.38, y: 0.22 },
        leftShoulder:   { x: 0.62, y: 0.22 },
        rightElbow:     { x: 0.32, y: 0.35 },
        leftElbow:      { x: 0.68, y: 0.35 },
        rightWrist:     { x: 0.30, y: 0.48 },
        leftWrist:      { x: 0.70, y: 0.48 },
        rightHip:       { x: 0.42, y: 0.50 },
        leftHip:        { x: 0.58, y: 0.50 },
        rightKnee:      { x: 0.40, y: 0.68 },
        leftKnee:       { x: 0.58, y: 0.68 },
        rightAnkle:     { x: 0.40, y: 0.85 },
        leftAnkle:      { x: 0.58, y: 0.85 },
    }

    // Ajuster selon la phase
    if (phase === 'gathering') {
        baseJoints.rightElbow.y -= 0.05
        baseJoints.rightWrist.y -= 0.08
        baseJoints.rightKnee.y += 0.02 // flexion
    } else if (phase === 'set_point') {
        baseJoints.rightElbow.y -= 0.12
        baseJoints.rightElbow.x -= 0.02
        baseJoints.rightWrist.y -= 0.22
        baseJoints.rightWrist.x += 0.02
    } else if (phase === 'releasing') {
        baseJoints.rightElbow.y -= 0.15
        baseJoints.rightWrist.y -= 0.30
        baseJoints.rightWrist.x += 0.05
        baseJoints.rightKnee.y -= 0.02 // extension
    } else if (phase === 'follow_through') {
        baseJoints.rightElbow.y -= 0.14
        baseJoints.rightWrist.y -= 0.28
        baseJoints.rightWrist.x += 0.08
    }

    const jointNames = Object.keys(baseJoints)
    const primaryColor = '#F5A623'
    const secondaryColor = '#4ECDC4'

    const joints: ARJoint[] = jointNames.map(name => ({
        x: baseJoints[name].x,
        y: baseJoints[name].y,
        radius: name === 'head' ? 6 : 4,
        color: ['rightElbow', 'rightWrist', 'rightShoulder'].includes(name) ? primaryColor : secondaryColor,
        opacity: 0.9,
    }))

    const boneConnections: [string, string][] = [
        ['head', 'neck'],
        ['neck', 'rightShoulder'], ['neck', 'leftShoulder'],
        ['rightShoulder', 'rightElbow'], ['leftShoulder', 'leftElbow'],
        ['rightElbow', 'rightWrist'], ['leftElbow', 'leftWrist'],
        ['rightShoulder', 'rightHip'], ['leftShoulder', 'leftHip'],
        ['rightHip', 'leftHip'],
        ['rightHip', 'rightKnee'], ['leftHip', 'leftKnee'],
        ['rightKnee', 'rightAnkle'], ['leftKnee', 'leftAnkle'],
    ]

    const bones: ARBone[] = boneConnections.map(([from, to]) => ({
        from: baseJoints[from],
        to: baseJoints[to],
        color: ['rightShoulder', 'rightElbow', 'rightWrist'].includes(from) ||
               ['rightShoulder', 'rightElbow', 'rightWrist'].includes(to)
            ? primaryColor : secondaryColor,
        width: 2,
        opacity: 0.7,
    }))

    return { joints, bones }
}

// ==========================================
// Main Simulator
// ==========================================

export class DemoSimulator {
    private config: DemoConfig
    private mechanics: PlayerMechanics
    private shotIndex = 0
    private frameIndex = 0
    private sessionStartTime: number
    private framesSinceLastShot = 0
    private currentPhase: 'idle' | 'gathering' | 'set_point' | 'releasing' | 'follow_through' = 'idle'
    private phaseFrameCount = 0
    private pendingShot: DetectedShot | null = null
    private lastFeedback: ARFeedback | null = null

    constructor() {
        this.config = {
            playerProfile: 'good',
            shotFrequencyPerMinute: 6,
            simulateFatigue: true,
            framesBetweenShots: 150, // ~5 sec @ 30fps
            targetFps: 30,
        }
        this.mechanics = PROFILES[this.config.playerProfile]
        this.sessionStartTime = Date.now()
    }

    // ---- Configuration ----

    configure(config: Partial<DemoConfig>): void {
        this.config = { ...this.config, ...config }
        this.mechanics = PROFILES[this.config.playerProfile]
    }

    reset(): void {
        this.shotIndex = 0
        this.frameIndex = 0
        this.framesSinceLastShot = 0
        this.currentPhase = 'idle'
        this.phaseFrameCount = 0
        this.pendingShot = null
        this.lastFeedback = null
        this.sessionStartTime = Date.now()
    }

    // ---- Frame Processing ----

    /**
     * Simule le traitement d'une frame. Appelé à ~30fps.
     * Retourne un résultat identique au vrai pipeline.
     */
    processFrame(): FrameProcessingResult {
        this.frameIndex++
        this.framesSinceLastShot++
        this.phaseFrameCount++

        const timestamp = (Date.now() - this.sessionStartTime) / 1000

        // State machine de tir simulé
        this.updateShotPhase()

        // Générer les données de la frame
        const biomechanics = this.currentPhase !== 'idle'
            ? this.generateBiomechanics()
            : null

        const detectedShot = this.pendingShot
        this.pendingShot = null

        const feedback = this.lastFeedback
        this.lastFeedback = null

        const arFrame = this.generateARFrame(biomechanics)

        // FPS simulé avec bruit
        const currentFps = this.config.targetFps + Math.round((Math.random() - 0.5) * 4)

        return {
            pose: this.generateDemoPose(timestamp),
            bodyAngles: biomechanics ? this.biomechanicsToAngles(biomechanics) : null,
            biomechanics,
            detectedShot,
            shotPhase: this.currentPhase,
            ballPosition: null,
            arFrame,
            instantFeedback: feedback ? {
                type: feedback.type,
                message: feedback.message,
                detail: feedback.detail,
                icon: feedback.icon,
                duration: feedback.duration,
                position: feedback.position,
            } : null,
            processingTimeMs: 28 + Math.random() * 15, // 28-43ms simulé
            currentFps: clamp(currentFps, 24, 34),
        }
    }

    // ---- Shot Phase State Machine ----

    private updateShotPhase(): void {
        const framesPerShot = this.config.framesBetweenShots

        switch (this.currentPhase) {
            case 'idle':
                if (this.framesSinceLastShot >= framesPerShot) {
                    this.currentPhase = 'gathering'
                    this.phaseFrameCount = 0
                }
                break

            case 'gathering':
                if (this.phaseFrameCount >= 12) { // ~0.4s
                    this.currentPhase = 'set_point'
                    this.phaseFrameCount = 0
                }
                break

            case 'set_point':
                if (this.phaseFrameCount >= 8) { // ~0.27s
                    this.currentPhase = 'releasing'
                    this.phaseFrameCount = 0
                }
                break

            case 'releasing':
                if (this.phaseFrameCount >= 4) { // ~0.13s
                    this.currentPhase = 'follow_through'
                    this.phaseFrameCount = 0
                    // Générer le tir complet
                    this.generateCompletedShot()
                }
                break

            case 'follow_through':
                if (this.phaseFrameCount >= 15) { // ~0.5s
                    this.currentPhase = 'idle'
                    this.phaseFrameCount = 0
                    this.framesSinceLastShot = 0
                }
                break
        }
    }

    // ---- Shot Generation ----

    private generateCompletedShot(): void {
        this.shotIndex++

        const fatigueFactor = this.config.simulateFatigue
            ? Math.max(0.85, 1 - (this.shotIndex / 100) * 0.15)
            : 1

        const bio = this.generateBiomechanics(fatigueFactor)

        // Probabilité de réussite corrélée à la qualité mécanique
        const mechanicQuality = bio.postureQuality / 100
        const madeProbability = this.config.overrideMadePct ??
            this.mechanics.expectedFgPct * (0.5 + 0.5 * mechanicQuality)
        const isMade = Math.random() < madeProbability

        const hasFollowThrough = Math.random() < this.mechanics.followThroughPct * fatigueFactor

        const timestamp = (Date.now() - this.sessionStartTime) / 1000

        const shot: DetectedShot = {
            shotId: `demo_${Date.now()}_${this.shotIndex}`,
            completedPhase: 'following_through',
            phaseTimestamps: {
                gatherStart: timestamp - 1.2,
                releasePoint: timestamp - 0.4,
                followThroughStart: timestamp - 0.1,
                ballFlightStart: timestamp,
                resolved: timestamp + 0.8,
            },
            releaseBiomechanics: bio,
            setPointElbowAngle: bio.elbowAngle + gaussianRandom(0, 2),
            releaseTime: gaussianRandom(
                this.mechanics.releaseTime.mean / fatigueFactor,
                this.mechanics.releaseTime.std,
            ),
            hasFollowThrough,
            followThroughDuration: hasFollowThrough ? gaussianRandom(0.35, 0.05) : gaussianRandom(0.15, 0.05),
            outcome: isMade ? 'made' : 'missed',
            detectionConfidence: clamp(0.85 + Math.random() * 0.12, 0, 1),
            angleTimeline: [],
            wristTrajectory: [],
        }

        this.pendingShot = shot

        // Générer le feedback
        this.generateFeedback(shot)
    }

    // ---- Biomechanics Generation ----

    private generateBiomechanics(fatigueFactor = 1): ShootingBiomechanics {
        const m = this.mechanics

        const elbowAngle = clamp(
            gaussianRandom(m.elbowAngle.mean, m.elbowAngle.std / fatigueFactor),
            70, 130,
        )
        const releaseHeightRatio = clamp(
            gaussianRandom(m.releaseHeight.mean, m.releaseHeight.std / fatigueFactor),
            0.85, 1.30,
        )
        const kneeFlexion = clamp(
            gaussianRandom(m.kneeFlexion.mean, m.kneeFlexion.std / fatigueFactor),
            120, 175,
        )

        // Posture quality dépend de la proximité des valeurs optimales
        const elbowDelta = Math.abs(elbowAngle - 93) // 93° = optimal NBA
        const heightDelta = Math.abs(releaseHeightRatio - 1.14) * 100
        const kneeDelta = Math.abs(kneeFlexion - 155) / 2

        const postureQuality = clamp(
            m.postureQualityBase * fatigueFactor -
            elbowDelta * 1.2 - heightDelta * 0.8 - kneeDelta * 0.5 +
            gaussianRandom(0, 3),
            10, 99,
        )

        const isAligned = Math.random() < (m.consistencyFactor * fatigueFactor)
        const hasGoodBase = kneeFlexion >= 140 && kneeFlexion <= 165

        return {
            elbowAngle: Math.round(elbowAngle * 10) / 10,
            releaseHeightRatio: Math.round(releaseHeightRatio * 1000) / 1000,
            playerHeightPx: 400 + Math.round(gaussianRandom(0, 10)),
            ballPosition: {
                x: 0.48 + gaussianRandom(0, 0.02),
                y: 0.15 + gaussianRandom(0, 0.03),
            },
            hasGoodBase,
            kneeFlexion: Math.round(kneeFlexion * 10) / 10,
            isAligned,
            postureQuality: Math.round(postureQuality),
        }
    }

    private biomechanicsToAngles(bio: ShootingBiomechanics): BodyAngles {
        return {
            rightElbowAngle: bio.elbowAngle,
            leftElbowAngle: bio.elbowAngle + gaussianRandom(5, 3),
            rightShoulderAngle: gaussianRandom(90, 5),
            rightKneeAngle: bio.kneeFlexion,
            leftKneeAngle: bio.kneeFlexion + gaussianRandom(2, 2),
            trunkAngle: gaussianRandom(5, 2),
            rightHipAngle: gaussianRandom(170, 5),
        }
    }

    // ---- Pose Generation ----

    private generateDemoPose(timestamp: number): PoseEstimationResult {
        const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
            x: Math.random(),
            y: Math.random(),
            z: Math.random() * 0.1,
            visibility: 0.85 + Math.random() * 0.15,
        }))

        return {
            landmarks,
            normalizedLandmarks: landmarks.map((l, i) => ({
                ...l,
                name: `landmark_${i}`,
            })),
            confidence: 0.88 + Math.random() * 0.1,
            boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
            inferenceTimeMs: 22 + Math.random() * 8,
            frameIndex: this.frameIndex,
            timestamp,
        }
    }

    // ---- AR Frame Generation ----

    private generateARFrame(biomechanics: ShootingBiomechanics | null): AROverlayFrame {
        const skeleton = generateDemoSkeleton(this.currentPhase)

        const bioIndicators: BioIndicator[] = []

        if (biomechanics && this.currentPhase !== 'idle') {
            bioIndicators.push({
                position: { x: 0.28, y: 0.34 },
                label: 'Coude',
                value: `${biomechanics.elbowAngle}°`,
                color: Math.abs(biomechanics.elbowAngle - 93) < 8
                    ? '#00C67A' : Math.abs(biomechanics.elbowAngle - 93) < 15
                    ? '#F5A623' : '#FF3A5E',
                type: 'angle',
            })

            if (this.currentPhase === 'releasing' || this.currentPhase === 'follow_through') {
                bioIndicators.push({
                    position: { x: 0.35, y: 0.12 },
                    label: 'Release',
                    value: `${biomechanics.releaseHeightRatio.toFixed(2)}x`,
                    color: biomechanics.releaseHeightRatio >= 1.08
                        ? '#00C67A' : '#F5A623',
                    type: 'height',
                })
            }
        }

        return {
            skeleton: this.currentPhase !== 'idle' ? skeleton : null,
            shotArc: null, // TODO: arc de tir simulé
            bioIndicators,
            ballIndicator: this.currentPhase !== 'idle' ? {
                x: 0.48 + gaussianRandom(0, 0.01),
                y: this.currentPhase === 'releasing' ? 0.08 : 0.25,
                radius: 12,
                color: '#F5A623',
            } : null,
            rimIndicator: null,
            feedback: this.lastFeedback,
            debugInfo: {
                fps: this.config.targetFps,
                poseConfidence: 0.92,
                shotPhase: this.currentPhase,
                processingMs: 32,
            },
        }
    }

    // ---- Feedback Generation ----

    private generateFeedback(shot: DetectedShot): void {
        const quality = shot.releaseBiomechanics.postureQuality

        let template: { message: string; detail: string }
        let type: ARFeedback['type']
        let icon: string

        if (quality >= 80) {
            template = pickRandom(FEEDBACK_TEMPLATES.greatShot)
            type = 'success'
            icon = '🎯'
        } else if (quality >= 60) {
            template = pickRandom(FEEDBACK_TEMPLATES.goodShot)
            type = 'info'
            icon = '👍'
        } else if (shot.outcome === 'missed') {
            template = pickRandom(FEEDBACK_TEMPLATES.missAnalysis)
            type = 'warning'
            icon = '📊'
        } else {
            template = pickRandom(FEEDBACK_TEMPLATES.improvementNeeded)
            type = 'warning'
            icon = '💡'
        }

        this.lastFeedback = {
            type,
            message: template.message,
            detail: template.detail,
            icon,
            duration: 3000,
            position: 'top',
        }
    }

    // ---- Getters ----

    getShotCount(): number { return this.shotIndex }
    getCurrentPhase(): string { return this.currentPhase }
    getFrameIndex(): number { return this.frameIndex }
}

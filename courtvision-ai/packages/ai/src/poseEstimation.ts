/**
 * On-Device Pose Estimation — TFLite / MediaPipe Blazepose Integration
 *
 * Ce module fournit l'abstraction pour l'estimation de pose en temps réel
 * directement sur l'appareil mobile, sans aller sur le cloud.
 *
 * Architecture :
 * - iOS : CoreML backend (via TFLite delegate) pour accélération GPU/Neural Engine
 * - Android : GPU delegate TFLite pour accélération hardware
 * - Fallback : CPU inference (~30ms par frame sur iPhone 12+)
 *
 * Modèles supportés :
 * - BlazePose Full (33 landmarks 3D) — précision haute, ~25ms
 * - BlazePose Lite (33 landmarks 3D) — rapide, ~12ms
 * - MoveNet Thunder (17 keypoints) — fallback ultra-rapide, ~8ms
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt utilise ARKit uniquement (iOS only, pas de skeleton visible)
 * - CourtVision AI utilise BlazePose cross-platform avec AR overlays
 * - Notre pipeline supporte l'analyse biomécanique 3D complète
 *
 * Références :
 * - BlazePose: https://arxiv.org/abs/2006.10204 (Google, 2020)
 * - MoveNet: https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html
 */

import type { Landmark} from './tracking';
import { LANDMARKS } from './tracking'

// ==========================================
// Types
// ==========================================

/** Configuration du modèle de pose estimation */
export interface PoseEstimationConfig {
    /** Modèle à utiliser */
    model: 'blazepose_full' | 'blazepose_lite' | 'movenet_thunder' | 'movenet_lightning'
    /** Backend d'accélération hardware */
    delegate: 'gpu' | 'coreml' | 'nnapi' | 'cpu'
    /** Score minimum de confiance pour un landmark */
    minConfidence: number
    /** Activer le smoothing temporel (réduit le jitter) */
    enableSmoothing: boolean
    /** Nombre max de personnes à détecter */
    maxPersons: number
    /** Résolution d'entrée du modèle */
    inputResolution: { width: number; height: number }
}

/** Résultat brut d'une estimation de pose pour une frame */
export interface PoseEstimationResult {
    /** Landmarks 3D détectés (33 pour BlazePose, 17 pour MoveNet) */
    landmarks: Landmark[]
    /** Landmarks 2D normalisés (0-1) pour l'overlay AR */
    normalizedLandmarks: NormalizedLandmark[]
    /** Score de confiance global de la détection (0-1) */
    confidence: number
    /** Bounding box de la personne détectée */
    boundingBox: BoundingBox
    /** Temps d'inférence en millisecondes */
    inferenceTimeMs: number
    /** Index de la frame traitée */
    frameIndex: number
    /** Timestamp de la frame (secondes depuis début) */
    timestamp: number
}

/** Landmark 2D normalisé pour rendu AR */
export interface NormalizedLandmark {
    x: number  // 0-1
    y: number  // 0-1
    z: number  // profondeur relative
    visibility: number
    name: string
}

export interface BoundingBox {
    x: number
    y: number
    width: number
    height: number
}

/** État du pipeline de pose estimation */
export interface PoseEstimationState {
    isInitialized: boolean
    isProcessing: boolean
    currentModel: string
    averageInferenceMs: number
    framesProcessed: number
    delegate: string
}

/** Angles corporels extraits des landmarks */
export interface BodyAngles {
    /** Angle du coude droit au set point (°) */
    rightElbowAngle: number
    /** Angle du coude gauche (°) */
    leftElbowAngle: number
    /** Angle de l'épaule droite (°) */
    rightShoulderAngle: number
    /** Angle du genou droit (°) */
    rightKneeAngle: number
    /** Angle du genou gauche (°) */
    leftKneeAngle: number
    /** Angle du tronc par rapport à la verticale (°) */
    trunkAngle: number
    /** Angle de la hanche droite (°) */
    rightHipAngle: number
}

/** Biomécanique extraite d'une pose de tir */
export interface ShootingBiomechanics {
    /** Angle du coude au set point */
    elbowAngle: number
    /** Ratio hauteur release / taille joueur */
    releaseHeightRatio: number
    /** Hauteur estimée du joueur en pixels (pour calibration) */
    playerHeightPx: number
    /** Position du ballon estimée (par rapport aux mains) */
    ballPosition: { x: number; y: number }
    /** Le joueur est debout avec une bonne base */
    hasGoodBase: boolean
    /** Angle de flexion des genoux */
    kneeFlexion: number
    /** Le bras de tir est aligné avec le panier */
    isAligned: boolean
    /** Score de qualité de la posture (0-100) */
    postureQuality: number
}

// ==========================================
// Constantes
// ==========================================

/** Noms des 33 landmarks BlazePose */
export const BLAZEPOSE_LANDMARK_NAMES = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
    'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee',
    'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index'
] as const

/** Configuration par défaut optimisée pour le mobile */
export const DEFAULT_POSE_CONFIG: PoseEstimationConfig = {
    model: 'blazepose_full',
    delegate: 'gpu',
    minConfidence: 0.5,
    enableSmoothing: true,
    maxPersons: 1,
    inputResolution: { width: 256, height: 256 },
}

/** Seuils biomécaniques basés sur la recherche */
const BIOMECHANICAL_THRESHOLDS = {
    /** Angle coude optimal au set point (Okazaki et al., 2015) */
    ELBOW_OPTIMAL_MIN: 85,
    ELBOW_OPTIMAL_MAX: 105,
    ELBOW_IDEAL: 94,  // Sweet spot (Curry, Klay, Booker)

    /** Ratio release height / taille joueur */
    RELEASE_HEIGHT_MIN: 1.05,
    RELEASE_HEIGHT_GOOD: 1.12,
    RELEASE_HEIGHT_EXCELLENT: 1.18,

    /** Flexion genou minimum pour un tir (engage les jambes) */
    KNEE_MIN_FLEXION: 140,
    KNEE_OPTIMAL_FLEXION: 155,

    /** Angle du tronc (0° = vertical, doit être < 15° pour un bon tir) */
    TRUNK_MAX_LEAN: 15,

    /** Score de visibilité minimum pour faire confiance au landmark */
    MIN_VISIBILITY: 0.6,
}

// ==========================================
// Smoothing Filter (One Euro Filter)
//
// Réduit le jitter des landmarks entre frames sans ajouter de latence.
// Inspiré par : "1€ Filter" (Casiez et al., CHI 2012)
// https://gery.casiez.net/1euro/
// ==========================================

interface OneEuroFilterState {
    prevValue: number
    prevDerivative: number
    prevTimestamp: number
}

class OneEuroFilter {
    private minCutoff: number
    private beta: number
    private dCutoff: number
    private states: Map<string, OneEuroFilterState> = new Map()

    constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
        this.minCutoff = minCutoff
        this.beta = beta
        this.dCutoff = dCutoff
    }

    private alpha(cutoff: number, dt: number): number {
        const tau = 1.0 / (2 * Math.PI * cutoff)
        return 1.0 / (1.0 + tau / dt)
    }

    filter(key: string, value: number, timestamp: number): number {
        const state = this.states.get(key)
        if (!state) {
            this.states.set(key, {
                prevValue: value,
                prevDerivative: 0,
                prevTimestamp: timestamp,
            })
            return value
        }

        const dt = Math.max(timestamp - state.prevTimestamp, 1e-6)

        // Derivative estimation
        const dValue = (value - state.prevValue) / dt
        const aD = this.alpha(this.dCutoff, dt)
        const filteredDerivative = aD * dValue + (1 - aD) * state.prevDerivative

        // Adaptive cutoff
        const cutoff = this.minCutoff + this.beta * Math.abs(filteredDerivative)
        const aValue = this.alpha(cutoff, dt)
        const filteredValue = aValue * value + (1 - aValue) * state.prevValue

        this.states.set(key, {
            prevValue: filteredValue,
            prevDerivative: filteredDerivative,
            prevTimestamp: timestamp,
        })

        return filteredValue
    }

    reset(): void {
        this.states.clear()
    }
}

// ==========================================
// Pose Estimation Engine
// ==========================================

export class PoseEstimationEngine {
    private config: PoseEstimationConfig
    private state: PoseEstimationState
    private smoother: OneEuroFilter
    private inferenceHistory: number[] = []

    constructor(config: Partial<PoseEstimationConfig> = {}) {
        this.config = { ...DEFAULT_POSE_CONFIG, ...config }
        this.state = {
            isInitialized: false,
            isProcessing: false,
            currentModel: this.config.model,
            averageInferenceMs: 0,
            framesProcessed: 0,
            delegate: this.config.delegate,
        }
        this.smoother = new OneEuroFilter()
    }

    /**
     * Initialise le modèle de pose estimation.
     * En production, cela charge le modèle TFLite dans la mémoire GPU.
     */
    async initialize(): Promise<void> {
        // NOTE: En production, ici on chargerait le modèle TFLite :
        // - iOS: via CoreML delegate (accès Neural Engine)
        // - Android: via GPU delegate (OpenGL ES / OpenCL)
        //
        // Exemple pseudo-code :
        // const model = await TFLite.loadModel({
        //   modelPath: `models/${this.config.model}.tflite`,
        //   delegate: this.config.delegate,
        //   numThreads: 4,
        // })
        this.state.isInitialized = true
    }

    /**
     * Traite une frame et retourne les landmarks détectés.
     *
     * En production, cette méthode :
     * 1. Redimensionne la frame à inputResolution
     * 2. Normalise les pixels (0-1 ou -1 à 1 selon le modèle)
     * 3. Exécute l'inférence TFLite
     * 4. Décode les landmarks en coordonnées normalisées
     * 5. Applique le smoothing temporel
     *
     * @param frameData - Données brutes de la frame (RGB)
     * @param frameIndex - Index de la frame
     * @param timestamp - Timestamp en secondes
     */
    async processFrame(
        frameData: Uint8Array | ArrayBuffer,
        frameIndex: number,
        timestamp: number,
        frameWidth: number,
        frameHeight: number
    ): Promise<PoseEstimationResult | null> {
        if (!this.state.isInitialized) {
            throw new Error('PoseEstimationEngine not initialized. Call initialize() first.')
        }

        const startTime = performance.now()
        this.state.isProcessing = true

        try {
            // --- Phase 1: Inférence (simulée en dev, TFLite en prod) ---
            const rawLandmarks = await this.runInference(frameData)
            if (!rawLandmarks || rawLandmarks.length === 0) {
                return null
            }

            // --- Phase 2: Smoothing temporel ---
            const smoothedLandmarks = this.config.enableSmoothing
                ? this.applySmoothing(rawLandmarks, timestamp)
                : rawLandmarks

            // --- Phase 3: Conversion en landmarks 3D et normalisés ---
            const landmarks = this.toLandmarks(smoothedLandmarks, frameWidth, frameHeight)
            const normalizedLandmarks = this.toNormalizedLandmarks(smoothedLandmarks)

            // --- Phase 4: Bounding box ---
            const boundingBox = this.computeBoundingBox(smoothedLandmarks, frameWidth, frameHeight)

            // --- Phase 5: Confiance globale ---
            const confidence = this.computeOverallConfidence(smoothedLandmarks)

            const inferenceTimeMs = performance.now() - startTime
            this.recordInferenceTime(inferenceTimeMs)

            return {
                landmarks,
                normalizedLandmarks,
                confidence,
                boundingBox,
                inferenceTimeMs,
                frameIndex,
                timestamp,
            }
        } finally {
            this.state.isProcessing = false
        }
    }

    /**
     * Extrait les angles corporels à partir des landmarks.
     * Utilisé pour l'analyse biomécanique de chaque frame.
     */
    static extractBodyAngles(landmarks: Landmark[]): BodyAngles {
        if (landmarks.length < 33) {
            return {
                rightElbowAngle: 0,
                leftElbowAngle: 0,
                rightShoulderAngle: 0,
                rightKneeAngle: 0,
                leftKneeAngle: 0,
                trunkAngle: 0,
                rightHipAngle: 0,
            }
        }

        const calcAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
            const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
            let angle = Math.abs(radians * (180.0 / Math.PI))
            if (angle > 180) angle = 360 - angle
            return angle
        }

        // Coude droit : épaule → coude → poignet
        const rightElbowAngle = calcAngle(
            landmarks[LANDMARKS.RIGHT_SHOULDER],
            landmarks[LANDMARKS.RIGHT_ELBOW],
            landmarks[LANDMARKS.RIGHT_WRIST]
        )

        // Coude gauche
        const leftElbowAngle = calcAngle(
            landmarks[LANDMARKS.LEFT_SHOULDER],
            landmarks[LANDMARKS.LEFT_ELBOW],
            landmarks[LANDMARKS.LEFT_WRIST]
        )

        // Épaule droite : coude → épaule → hanche
        const rightShoulderAngle = calcAngle(
            landmarks[LANDMARKS.RIGHT_ELBOW],
            landmarks[LANDMARKS.RIGHT_SHOULDER],
            landmarks[LANDMARKS.RIGHT_HIP]
        )

        // Genou droit : hanche → genou → cheville
        const rightKneeAngle = calcAngle(
            landmarks[LANDMARKS.RIGHT_HIP],
            landmarks[LANDMARKS.RIGHT_KNEE],
            landmarks[LANDMARKS.RIGHT_ANKLE]
        )

        // Genou gauche
        const leftKneeAngle = calcAngle(
            landmarks[LANDMARKS.LEFT_HIP],
            landmarks[LANDMARKS.LEFT_KNEE],
            landmarks[LANDMARKS.LEFT_ANKLE]
        )

        // Angle du tronc (vertical)
        const midShoulder = {
            x: (landmarks[LANDMARKS.LEFT_SHOULDER].x + landmarks[LANDMARKS.RIGHT_SHOULDER].x) / 2,
            y: (landmarks[LANDMARKS.LEFT_SHOULDER].y + landmarks[LANDMARKS.RIGHT_SHOULDER].y) / 2,
            z: 0, visibility: 1,
        }
        const midHip = {
            x: (landmarks[LANDMARKS.LEFT_HIP].x + landmarks[LANDMARKS.RIGHT_HIP].x) / 2,
            y: (landmarks[LANDMARKS.LEFT_HIP].y + landmarks[LANDMARKS.RIGHT_HIP].y) / 2,
            z: 0, visibility: 1,
        }
        const dx = midShoulder.x - midHip.x
        const dy = midShoulder.y - midHip.y
        const trunkAngle = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI))

        // Hanche droite : épaule → hanche → genou
        const rightHipAngle = calcAngle(
            landmarks[LANDMARKS.RIGHT_SHOULDER],
            landmarks[LANDMARKS.RIGHT_HIP],
            landmarks[LANDMARKS.RIGHT_KNEE]
        )

        return {
            rightElbowAngle: Math.round(rightElbowAngle * 10) / 10,
            leftElbowAngle: Math.round(leftElbowAngle * 10) / 10,
            rightShoulderAngle: Math.round(rightShoulderAngle * 10) / 10,
            rightKneeAngle: Math.round(rightKneeAngle * 10) / 10,
            leftKneeAngle: Math.round(leftKneeAngle * 10) / 10,
            trunkAngle: Math.round(trunkAngle * 10) / 10,
            rightHipAngle: Math.round(rightHipAngle * 10) / 10,
        }
    }

    /**
     * Extrait la biomécanique de tir à partir des landmarks.
     * Spécifiquement conçu pour analyser un joueur en position de tir.
     */
    static extractShootingBiomechanics(landmarks: Landmark[]): ShootingBiomechanics {
        const angles = this.extractBodyAngles(landmarks)

        // Hauteur du joueur estimée (distance tête → pieds)
        const noseY = landmarks[LANDMARKS.NOSE]?.y ?? 0
        const ankleY = Math.max(
            landmarks[LANDMARKS.LEFT_ANKLE]?.y ?? 0,
            landmarks[LANDMARKS.RIGHT_ANKLE]?.y ?? 0,
        )
        const playerHeightPx = Math.abs(ankleY - noseY) * 1.05 // +5% pour le haut du crâne

        // Hauteur du release : position du poignet par rapport à la taille
        const wristY = landmarks[LANDMARKS.RIGHT_WRIST]?.y ?? 0
        const wristToFloor = Math.abs(ankleY - wristY)
        const releaseHeightRatio = playerHeightPx > 0
            ? wristToFloor / playerHeightPx
            : 1.0

        // Position estimée du ballon (entre les deux poignets)
        const lWrist = landmarks[LANDMARKS.LEFT_WRIST]
        const rWrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const ballPosition = {
            x: (lWrist.x + rWrist.x) / 2,
            y: Math.min(lWrist.y, rWrist.y),  // Le plus haut des deux
        }

        // Base check : les pieds sont à peu près au même niveau
        const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
        const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]
        const footDiff = Math.abs(lAnkle.y - rAnkle.y)
        const footWidth = Math.abs(lAnkle.x - rAnkle.x)
        const shoulderWidth = Math.abs(
            landmarks[LANDMARKS.LEFT_SHOULDER].x - landmarks[LANDMARKS.RIGHT_SHOULDER].x
        )
        // Bonne base = pieds à largeur d'épaules et au même niveau
        const hasGoodBase = footDiff < playerHeightPx * 0.05 &&
            footWidth > shoulderWidth * 0.6 &&
            footWidth < shoulderWidth * 1.8

        // Alignement : le coude, l'épaule et le poignet sont dans un plan vertical
        const elbowX = landmarks[LANDMARKS.RIGHT_ELBOW].x
        const shoulderX = landmarks[LANDMARKS.RIGHT_SHOULDER].x
        const wristX = landmarks[LANDMARKS.RIGHT_WRIST].x
        const alignmentError = Math.abs(elbowX - shoulderX) + Math.abs(wristX - shoulderX)
        const isAligned = alignmentError < shoulderWidth * 0.3

        // Flexion des genoux
        const kneeFlexion = (angles.rightKneeAngle + angles.leftKneeAngle) / 2

        // Score de qualité de posture composite
        const postureQuality = PoseEstimationEngine.computePostureQuality(
            angles.rightElbowAngle,
            releaseHeightRatio,
            kneeFlexion,
            angles.trunkAngle,
            isAligned,
            hasGoodBase
        )

        return {
            elbowAngle: angles.rightElbowAngle,
            releaseHeightRatio: Math.round(releaseHeightRatio * 1000) / 1000,
            playerHeightPx: Math.round(playerHeightPx),
            ballPosition,
            hasGoodBase,
            kneeFlexion: Math.round(kneeFlexion * 10) / 10,
            isAligned,
            postureQuality,
        }
    }

    /**
     * Score composite de qualité de posture de tir (0-100).
     *
     * Basé sur la recherche biomécanique :
     * - Angle coude optimal : 90°-100° (Okazaki et al., 2015)
     * - Release height : >1.12x taille (NBA tracking data)
     * - Flexion genoux : 140°-165° (engage les jambes sans squatter)
     * - Tronc vertical : <15° d'inclinaison
     * - Alignement bras-épaule : dans le plan de tir
     * - Base stable : pieds à largeur d'épaules
     */
    private static computePostureQuality(
        elbowAngle: number,
        releaseHeight: number,
        kneeFlexion: number,
        trunkAngle: number,
        isAligned: boolean,
        hasGoodBase: boolean,
    ): number {
        const T = BIOMECHANICAL_THRESHOLDS

        // Coude (30 pts)
        const elbowDev = Math.abs(elbowAngle - T.ELBOW_IDEAL)
        const elbowScore = elbowDev <= 5 ? 30
            : elbowDev <= 10 ? 25
            : elbowDev <= 15 ? 18
            : Math.max(0, 30 - elbowDev * 1.5)

        // Release height (20 pts)
        const releaseScore = releaseHeight >= T.RELEASE_HEIGHT_EXCELLENT ? 20
            : releaseHeight >= T.RELEASE_HEIGHT_GOOD ? 16
            : releaseHeight >= T.RELEASE_HEIGHT_MIN ? 12
            : Math.max(0, releaseHeight * 20)

        // Genoux (15 pts) — trop pliés = instable, trop droits = pas d'énergie
        const kneeScore = (kneeFlexion >= 140 && kneeFlexion <= 165) ? 15
            : (kneeFlexion >= 130 && kneeFlexion <= 170) ? 10
            : 5

        // Tronc (15 pts)
        const trunkScore = trunkAngle <= 8 ? 15
            : trunkAngle <= 15 ? 10
            : Math.max(0, 15 - trunkAngle)

        // Alignement (10 pts)
        const alignScore = isAligned ? 10 : 4

        // Base (10 pts)
        const baseScore = hasGoodBase ? 10 : 4

        return Math.round(elbowScore + releaseScore + kneeScore + trunkScore + alignScore + baseScore)
    }

    // ==========================================
    // Private Methods
    // ==========================================

    /**
     * Exécute l'inférence TFLite sur la frame.
     * En production, c'est ici qu'on appelle le runtime TFLite.
     * En dev/test, on retourne des landmarks simulés réalistes.
     */
    private async runInference(
        _frameData: Uint8Array | ArrayBuffer
    ): Promise<Array<{ x: number; y: number; z: number; visibility: number }> | null> {
        // PRODUCTION TODO: Remplacer par l'appel réel au runtime TFLite :
        //
        // const tensor = this.preprocessFrame(frameData)
        // const output = await this.model.run(tensor)
        // return this.decodeOutput(output)
        //
        // Pour le développement, on simule un délai d'inférence réaliste
        await new Promise(resolve => setTimeout(resolve, 2))

        // Simulate realistic BlazePose 33-landmark output for dev/testing
        // This ensures the pipeline doesn't silently break during development
        const baseLandmarks = [
            // 0: nose
            { x: 0.50, y: 0.18, z: -0.05, visibility: 0.99 },
            // 1-4: eyes
            { x: 0.48, y: 0.16, z: -0.06, visibility: 0.95 },
            { x: 0.47, y: 0.16, z: -0.06, visibility: 0.95 },
            { x: 0.52, y: 0.16, z: -0.06, visibility: 0.95 },
            { x: 0.53, y: 0.16, z: -0.06, visibility: 0.95 },
            // 5-6: ears
            { x: 0.44, y: 0.17, z: -0.02, visibility: 0.85 },
            { x: 0.56, y: 0.17, z: -0.02, visibility: 0.85 },
            // 7-8: mouth
            { x: 0.49, y: 0.21, z: -0.04, visibility: 0.90 },
            { x: 0.51, y: 0.21, z: -0.04, visibility: 0.90 },
            // 9-10: unused (some models)
            { x: 0.48, y: 0.20, z: -0.04, visibility: 0.80 },
            { x: 0.52, y: 0.20, z: -0.04, visibility: 0.80 },
            // 11: left shoulder
            { x: 0.38, y: 0.30, z: -0.02, visibility: 0.98 },
            // 12: right shoulder
            { x: 0.62, y: 0.30, z: -0.02, visibility: 0.98 },
            // 13: left elbow (shooting arm set point angle ~95°)
            { x: 0.32, y: 0.42, z: 0.02, visibility: 0.96 },
            // 14: right elbow
            { x: 0.68, y: 0.42, z: 0.02, visibility: 0.96 },
            // 15: left wrist
            { x: 0.35, y: 0.20, z: 0.04, visibility: 0.94 },
            // 16: right wrist
            { x: 0.65, y: 0.50, z: 0.04, visibility: 0.94 },
            // 17-22: hands (pinky, index, thumb per side)
            { x: 0.34, y: 0.18, z: 0.05, visibility: 0.85 },
            { x: 0.36, y: 0.18, z: 0.05, visibility: 0.85 },
            { x: 0.35, y: 0.19, z: 0.05, visibility: 0.85 },
            { x: 0.64, y: 0.51, z: 0.05, visibility: 0.85 },
            { x: 0.66, y: 0.51, z: 0.05, visibility: 0.85 },
            { x: 0.65, y: 0.52, z: 0.05, visibility: 0.85 },
            // 23: left hip
            { x: 0.42, y: 0.55, z: 0.00, visibility: 0.97 },
            // 24: right hip
            { x: 0.58, y: 0.55, z: 0.00, visibility: 0.97 },
            // 25: left knee
            { x: 0.40, y: 0.72, z: 0.02, visibility: 0.95 },
            // 26: right knee
            { x: 0.60, y: 0.72, z: 0.02, visibility: 0.95 },
            // 27: left ankle
            { x: 0.39, y: 0.90, z: 0.03, visibility: 0.92 },
            // 28: right ankle
            { x: 0.61, y: 0.90, z: 0.03, visibility: 0.92 },
            // 29-30: heels
            { x: 0.38, y: 0.92, z: 0.04, visibility: 0.85 },
            { x: 0.62, y: 0.92, z: 0.04, visibility: 0.85 },
            // 31-32: toes
            { x: 0.40, y: 0.95, z: 0.01, visibility: 0.80 },
            { x: 0.60, y: 0.95, z: 0.01, visibility: 0.80 },
        ]

        // Add slight jitter to simulate real sensor noise
        return baseLandmarks.map(lm => ({
            x: lm.x + (Math.random() - 0.5) * 0.005,
            y: lm.y + (Math.random() - 0.5) * 0.005,
            z: lm.z + (Math.random() - 0.5) * 0.002,
            visibility: Math.min(1, Math.max(0, lm.visibility + (Math.random() - 0.5) * 0.02)),
        }))
    }

    /** Applique le smoothing One Euro Filter sur les landmarks */
    private applySmoothing(
        landmarks: Array<{ x: number; y: number; z: number; visibility: number }>,
        timestamp: number
    ): Array<{ x: number; y: number; z: number; visibility: number }> {
        return landmarks.map((lm, i) => ({
            x: this.smoother.filter(`lm_${i}_x`, lm.x, timestamp),
            y: this.smoother.filter(`lm_${i}_y`, lm.y, timestamp),
            z: this.smoother.filter(`lm_${i}_z`, lm.z, timestamp),
            visibility: lm.visibility,
        }))
    }

    /** Convertit les landmarks normalisés en Landmark[] (compatibles avec le reste du pipeline) */
    private toLandmarks(
        raw: Array<{ x: number; y: number; z: number; visibility: number }>,
        frameWidth: number,
        frameHeight: number,
    ): Landmark[] {
        return raw.map(lm => ({
            x: lm.x * frameWidth,
            y: lm.y * frameHeight,
            z: lm.z,
            visibility: lm.visibility,
        }))
    }

    /** Crée les landmarks normalisés nommés pour l'overlay AR */
    private toNormalizedLandmarks(
        raw: Array<{ x: number; y: number; z: number; visibility: number }>
    ): NormalizedLandmark[] {
        return raw.map((lm, i) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
            name: i < BLAZEPOSE_LANDMARK_NAMES.length ? BLAZEPOSE_LANDMARK_NAMES[i] : `landmark_${i}`,
        }))
    }

    /** Calcule la bounding box à partir des landmarks */
    private computeBoundingBox(
        landmarks: Array<{ x: number; y: number; z: number; visibility: number }>,
        frameWidth: number,
        frameHeight: number,
    ): BoundingBox {
        let minX = 1, maxX = 0, minY = 1, maxY = 0
        for (const lm of landmarks) {
            if (lm.visibility < this.config.minConfidence) continue
            minX = Math.min(minX, lm.x)
            maxX = Math.max(maxX, lm.x)
            minY = Math.min(minY, lm.y)
            maxY = Math.max(maxY, lm.y)
        }
        const pad = 0.05  // 5% padding
        return {
            x: Math.max(0, (minX - pad)) * frameWidth,
            y: Math.max(0, (minY - pad)) * frameHeight,
            width: Math.min(1, (maxX - minX + 2 * pad)) * frameWidth,
            height: Math.min(1, (maxY - minY + 2 * pad)) * frameHeight,
        }
    }

    /** Calcule la confiance globale de la détection */
    private computeOverallConfidence(
        landmarks: Array<{ x: number; y: number; z: number; visibility: number }>
    ): number {
        if (landmarks.length === 0) return 0

        // Pondérer la confiance par l'importance des landmarks pour le basket
        // Les épaules, coudes, poignets et hanches sont critiques
        const importantIndices = [
            LANDMARKS.RIGHT_SHOULDER, LANDMARKS.LEFT_SHOULDER,
            LANDMARKS.RIGHT_ELBOW, LANDMARKS.LEFT_ELBOW,
            LANDMARKS.RIGHT_WRIST, LANDMARKS.LEFT_WRIST,
            LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_HIP,
            LANDMARKS.RIGHT_KNEE, LANDMARKS.LEFT_KNEE,
        ]

        const importantVis = importantIndices
            .filter(i => i < landmarks.length)
            .map(i => landmarks[i].visibility)

        if (importantVis.length === 0) return 0
        return importantVis.reduce((a, b) => a + b, 0) / importantVis.length
    }

    /** Enregistre le temps d'inférence pour les stats */
    private recordInferenceTime(ms: number): void {
        this.inferenceHistory.push(ms)
        if (this.inferenceHistory.length > 100) {
            this.inferenceHistory.shift()
        }
        this.state.averageInferenceMs = Math.round(
            this.inferenceHistory.reduce((a, b) => a + b, 0) / this.inferenceHistory.length * 10
        ) / 10
        this.state.framesProcessed++
    }

    /** Retourne l'état actuel du pipeline */
    getState(): PoseEstimationState {
        return { ...this.state }
    }

    /** Réinitialise le smoothing (nouveau tir / nouvelle session) */
    resetSmoothing(): void {
        this.smoother.reset()
    }

    /** Libère les ressources (modèle TFLite) */
    async dispose(): Promise<void> {
        // En production : this.model.dispose()
        this.state.isInitialized = false
        this.smoother.reset()
    }
}

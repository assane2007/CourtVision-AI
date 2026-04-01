/**
 * AR Overlay Engine — Overlays temps réel pour le squelette et l'arc de tir
 *
 * Ce module calcule les données nécessaires pour afficher des overlays AR
 * sur la vue caméra du mobile :
 * - Squelette (skeleton) avec les articulations et les connexions
 * - Arc de tir prédit (trajectoire parabolique)
 * - Indicateurs biomécaniques (angle du coude, release point)
 * - Feedback visuel en temps réel (couleurs, highlights)
 *
 * Architecture React Native :
 * Le rendu se fait via react-native-svg ou react-native-skia overlay
 * sur la vue CameraView d'expo-camera.
 *
 * Ce module NE fait PAS le rendu — il produit les données structurées
 * que le composant React Native consomme pour dessiner.
 *
 * Différenciation vs HomeCourt :
 * - HomeCourt : pas d'overlay squelette visible (utilise ARKit en interne seulement)
 * - CourtVision AI : overlay AR visible avec feedback biomécanique en temps réel
 * - L'utilisateur VOIT son squelette et les angles en overlay sur la caméra
 */

import { Landmark, LANDMARKS } from './tracking'
import type { NormalizedLandmark, BodyAngles, ShootingBiomechanics} from './poseEstimation';
import { BLAZEPOSE_LANDMARK_NAMES } from './poseEstimation'
import type { ShotDetectionPhase } from './shotDetector'

// ==========================================
// Types
// ==========================================

/** Données d'un overlay frame complet */
export interface AROverlayFrame {
    /** Squelette avec les connexions et les couleurs */
    skeleton: SkeletonOverlay
    /** Arc de tir prédit (si applicable) */
    shotArc: ShotArcOverlay | null
    /** Indicateurs biomécaniques visibles */
    bioIndicators: BioIndicator[]
    /** Feedback textuel instantané */
    feedback: ARFeedback | null
    /** Heatmap de la zone de tir (optionnel) */
    zoneHighlight: ZoneHighlight | null
    /** Phase actuelle de la détection de tir */
    shotPhase: ShotDetectionPhase
    /** Timestamp de la frame */
    timestamp: number
}

/** Overlay du squelette */
export interface SkeletonOverlay {
    /** Points des articulations */
    joints: ARJoint[]
    /** Lignes entre les articulations */
    bones: ARBone[]
    /** Opacité globale (0-1) */
    opacity: number
}

/** Un point d'articulation affiché */
export interface ARJoint {
    id: number
    name: string
    x: number               // Position X normalisée (0-1)
    y: number               // Position Y normalisée (0-1)
    color: string           // Couleur hex (#RRGGBB)
    radius: number          // Rayon du point en dp
    isVisible: boolean      // Visibilité suffisante
    isHighlighted: boolean  // Mis en évidence (articulation critique)
}

/** Un os (connexion entre deux articulations) */
export interface ARBone {
    fromId: number
    toId: number
    color: string
    thickness: number  // Épaisseur en dp
    opacity: number
}

/** Arc de tir en overlay */
export interface ShotArcOverlay {
    /** Points de la trajectoire prédite */
    points: Array<{ x: number; y: number }>
    /** Couleur de l'arc (varie selon la qualité) */
    color: string
    /** Épaisseur de l'arc */
    thickness: number
    /** Opacité (fade avec le temps) */
    opacity: number
    /** Point de release */
    releasePoint: { x: number; y: number }
    /** Point d'apex prédit */
    apexPoint: { x: number; y: number } | null
    /** Qualité prédite (pour la couleur) */
    quality: 'excellent' | 'good' | 'average' | 'poor'
}

/** Indicateur biomécanique visible */
export interface BioIndicator {
    /** Type d'indicateur */
    type: 'elbow_angle' | 'release_height' | 'knee_angle' | 'trunk_lean' | 'alignment'
    /** Position de l'indicateur (attaché à une articulation) */
    position: { x: number; y: number }
    /** Valeur affichée */
    value: string
    /** Unité */
    unit: string
    /** Couleur selon la qualité */
    color: string
    /** Qualité (pour le badge) */
    quality: 'excellent' | 'good' | 'needs_work' | 'poor'
    /** Visible ou non (selon les préférences utilisateur) */
    visible: boolean
}

/** Feedback textuel en overlay */
export interface ARFeedback {
    message: string
    emoji: string
    color: string
    position: 'top' | 'center' | 'bottom'
    duration: number  // Durée d'affichage en ms
}

/** Highlight de zone sur le terrain */
export interface ZoneHighlight {
    zone: string
    color: string
    opacity: number
}

/** Configuration de l'overlay AR */
export interface AROverlayConfig {
    /** Afficher le squelette */
    showSkeleton: boolean
    /** Afficher l'arc de tir */
    showShotArc: boolean
    /** Afficher les indicateurs biomécaniques */
    showBioIndicators: boolean
    /** Afficher le feedback textuel */
    showFeedback: boolean
    /** Style du squelette */
    skeletonStyle: 'neon' | 'minimal' | 'full'
    /** Couleur primaire */
    primaryColor: string
    /** Couleur secondaire */
    secondaryColor: string
    /** Couleur d'accent */
    accentColor: string
    /** Opacité globale */
    globalOpacity: number
}

// ==========================================
// Constantes
// ==========================================

/** Configuration par défaut (style premium) */
export const DEFAULT_AR_CONFIG: AROverlayConfig = {
    showSkeleton: true,
    showShotArc: true,
    showBioIndicators: true,
    showFeedback: true,
    skeletonStyle: 'neon',
    primaryColor: '#00F5D4',    // Vert néon (signature CourtVision)
    secondaryColor: '#7B61FF',  // Violet (accent)
    accentColor: '#FEE440',     // Jaune (highlights)
    globalOpacity: 0.85,
}

/** Connexions du squelette BlazePose pour le rendu */
const SKELETON_CONNECTIONS: [number, number][] = [
    // Torse
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
    [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],

    // Bras gauche
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
    [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],

    // Bras droit (bras de tir — highlight)
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
    [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],

    // Jambe gauche
    [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
    [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],

    // Jambe droite
    [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
    [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],

    // Tête (simplifié)
    [LANDMARKS.NOSE, LANDMARKS.LEFT_SHOULDER],
    [LANDMARKS.NOSE, LANDMARKS.RIGHT_SHOULDER],
]

/** Indices des articulations du bras de tir (droit) pour highlight */
const SHOOTING_ARM_JOINTS: number[] = [
    LANDMARKS.RIGHT_SHOULDER,
    LANDMARKS.RIGHT_ELBOW,
    LANDMARKS.RIGHT_WRIST,
]

/** Seuils de couleur pour les indicateurs biomécaniques */
const BIO_QUALITY_THRESHOLDS = {
    elbow: {
        excellent: { min: 90, max: 100 },
        good: { min: 85, max: 105 },
        needsWork: { min: 80, max: 110 },
    },
    releaseHeight: {
        excellent: 1.18,
        good: 1.12,
        needsWork: 1.05,
    },
    kneeAngle: {
        excellent: { min: 145, max: 165 },
        good: { min: 135, max: 170 },
    },
    trunkLean: {
        excellent: 8,
        good: 15,
    },
}

/** Couleurs par qualité (palette premium) */
const QUALITY_COLORS: Record<string, string> = {
    excellent: '#00F5D4',   // Vert néon
    good: '#7B61FF',        // Violet
    average: '#A0A0FF',     // Bleu clair
    needs_work: '#FEE440',  // Jaune
    poor: '#FF6B6B',        // Rouge
}

// ==========================================
// AR Overlay Engine
// ==========================================

export class AROverlayEngine {
    private config: AROverlayConfig
    private lastFeedback: ARFeedback | null = null
    private feedbackTimeout: ReturnType<typeof setTimeout> | null = null

    constructor(config: Partial<AROverlayConfig> = {}) {
        this.config = { ...DEFAULT_AR_CONFIG, ...config }
    }

    /**
     * Génère les données d'overlay pour une frame.
     *
     * @param landmarks - Landmarks normalisés de la pose
     * @param angles - Angles corporels extraits
     * @param biomechanics - Biomécanique de tir (si en cours de tir)
     * @param shotPhase - Phase actuelle de la détection de tir
     * @param wristTrajectory - Trajectoire du poignet (pour l'arc)
     * @param timestamp - Timestamp de la frame
     */
    generateOverlay(
        landmarks: NormalizedLandmark[],
        angles: BodyAngles,
        biomechanics: ShootingBiomechanics | null,
        shotPhase: ShotDetectionPhase,
        wristTrajectory: Array<{ x: number; y: number; timestamp: number }>,
        timestamp: number,
    ): AROverlayFrame {
        const skeleton = this.config.showSkeleton
            ? this.generateSkeleton(landmarks, shotPhase, angles)
            : { joints: [], bones: [], opacity: 0 }

        const shotArc = this.config.showShotArc && wristTrajectory.length >= 3
            ? this.generateShotArc(wristTrajectory, biomechanics)
            : null

        const bioIndicators = this.config.showBioIndicators
            ? this.generateBioIndicators(landmarks, angles, biomechanics)
            : []

        const feedback = this.config.showFeedback ? this.lastFeedback : null

        return {
            skeleton,
            shotArc,
            bioIndicators,
            feedback,
            zoneHighlight: null,
            shotPhase,
            timestamp,
        }
    }

    /**
     * Émet un feedback visuel temporaire (apparaît sur l'overlay).
     */
    showFeedback(message: string, emoji: string, color: string, position: ARFeedback['position'] = 'top', durationMs = 2000): void {
        this.lastFeedback = { message, emoji, color, position, duration: durationMs }

        if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout)
        this.feedbackTimeout = setTimeout(() => {
            this.lastFeedback = null
        }, durationMs)
    }

    /**
     * Met à jour la configuration de l'overlay.
     */
    updateConfig(config: Partial<AROverlayConfig>): void {
        this.config = { ...this.config, ...config }
    }

    // ==========================================
    // Private Methods
    // ==========================================

    private generateSkeleton(
        landmarks: NormalizedLandmark[],
        shotPhase: ShotDetectionPhase,
        angles: BodyAngles,
    ): SkeletonOverlay {
        const joints: ARJoint[] = []
        const bones: ARBone[] = []

        const isShootingArm = (idx: number) => SHOOTING_ARM_JOINTS.includes(idx)
        const isInShotMotion = shotPhase !== 'idle'

        // Générer les joints
        for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i]
            if (lm.visibility < 0.5) continue

            const highlighted = isShootingArm(i) && isInShotMotion
            const color = highlighted
                ? this.config.accentColor
                : isShootingArm(i)
                    ? this.config.primaryColor
                    : this.config.secondaryColor

            joints.push({
                id: i,
                name: lm.name,
                x: lm.x,
                y: lm.y,
                color,
                radius: highlighted ? 6 : 4,
                isVisible: lm.visibility >= 0.5,
                isHighlighted: highlighted,
            })
        }

        // Générer les bones
        for (const [fromIdx, toIdx] of SKELETON_CONNECTIONS) {
            const fromLm = landmarks[fromIdx]
            const toLm = landmarks[toIdx]
            if (!fromLm || !toLm || fromLm.visibility < 0.5 || toLm.visibility < 0.5) continue

            const isShootingBone = isShootingArm(fromIdx) && isShootingArm(toIdx)
            const highlighted = isShootingBone && isInShotMotion

            bones.push({
                fromId: fromIdx,
                toId: toIdx,
                color: highlighted
                    ? this.config.accentColor
                    : isShootingBone
                        ? this.config.primaryColor
                        : this.config.secondaryColor,
                thickness: highlighted ? 3 : 2,
                opacity: highlighted ? 1.0 : 0.7,
            })
        }

        return {
            joints,
            bones,
            opacity: this.config.globalOpacity,
        }
    }

    private generateShotArc(
        wristTrajectory: Array<{ x: number; y: number; timestamp: number }>,
        biomechanics: ShootingBiomechanics | null,
    ): ShotArcOverlay {
        // Prendre les N derniers points de la trajectoire
        const recentPoints = wristTrajectory.slice(-30)

        // Qualité basée sur la biomécanique
        const quality = biomechanics
            ? this.assessShotQuality(biomechanics)
            : 'average'

        const color = QUALITY_COLORS[quality]

        // Release point = le point le plus récent
        const releasePoint = recentPoints[recentPoints.length - 1]

        // Apex = point le plus haut (y le plus bas)
        const apexPoint = recentPoints.length > 0
            ? recentPoints.reduce((best, p) => p.y < best.y ? p : best)
            : null

        return {
            points: recentPoints.map(p => ({ x: p.x, y: p.y })),
            color,
            thickness: 2.5,
            opacity: 0.8,
            releasePoint: { x: releasePoint.x, y: releasePoint.y },
            apexPoint: apexPoint ? { x: apexPoint.x, y: apexPoint.y } : null,
            quality,
        }
    }

    private generateBioIndicators(
        landmarks: NormalizedLandmark[],
        angles: BodyAngles,
        biomechanics: ShootingBiomechanics | null,
    ): BioIndicator[] {
        const indicators: BioIndicator[] = []

        // Indicateur angle du coude
        const elbowLm = landmarks[LANDMARKS.RIGHT_ELBOW]
        if (elbowLm && elbowLm.visibility >= 0.5) {
            const quality = this.getElbowQuality(angles.rightElbowAngle)
            indicators.push({
                type: 'elbow_angle',
                position: { x: elbowLm.x, y: elbowLm.y },
                value: `${Math.round(angles.rightElbowAngle)}`,
                unit: '°',
                color: QUALITY_COLORS[quality],
                quality,
                visible: true,
            })
        }

        // Indicateur release height
        if (biomechanics && biomechanics.releaseHeightRatio > 0) {
            const wristLm = landmarks[LANDMARKS.RIGHT_WRIST]
            if (wristLm && wristLm.visibility >= 0.5) {
                const quality = this.getReleaseHeightQuality(biomechanics.releaseHeightRatio)
                indicators.push({
                    type: 'release_height',
                    position: { x: wristLm.x + 0.05, y: wristLm.y },
                    value: `${biomechanics.releaseHeightRatio.toFixed(2)}`,
                    unit: 'x',
                    color: QUALITY_COLORS[quality],
                    quality,
                    visible: true,
                })
            }
        }

        // Indicateur flexion genoux
        const kneeLm = landmarks[LANDMARKS.RIGHT_KNEE]
        if (kneeLm && kneeLm.visibility >= 0.5) {
            const quality = this.getKneeQuality(angles.rightKneeAngle)
            indicators.push({
                type: 'knee_angle',
                position: { x: kneeLm.x, y: kneeLm.y },
                value: `${Math.round(angles.rightKneeAngle)}`,
                unit: '°',
                color: QUALITY_COLORS[quality],
                quality,
                visible: true,
            })
        }

        // Indicateur inclinaison du tronc
        if (angles.trunkAngle > 5) {
            const midShoulder = {
                x: (landmarks[LANDMARKS.LEFT_SHOULDER]?.x + landmarks[LANDMARKS.RIGHT_SHOULDER]?.x) / 2,
                y: (landmarks[LANDMARKS.LEFT_SHOULDER]?.y + landmarks[LANDMARKS.RIGHT_SHOULDER]?.y) / 2,
            }
            const quality = angles.trunkAngle <= 8 ? 'excellent'
                : angles.trunkAngle <= 15 ? 'good'
                    : 'needs_work'
            indicators.push({
                type: 'trunk_lean',
                position: midShoulder,
                value: `${Math.round(angles.trunkAngle)}`,
                unit: '°',
                color: QUALITY_COLORS[quality],
                quality,
                visible: angles.trunkAngle > 10, // Visible seulement si significatif
            })
        }

        return indicators
    }

    private assessShotQuality(biomechanics: ShootingBiomechanics): ShotArcOverlay['quality'] {
        const score = biomechanics.postureQuality
        if (score >= 80) return 'excellent'
        if (score >= 60) return 'good'
        if (score >= 40) return 'average'
        return 'poor'
    }

    private getElbowQuality(angle: number): BioIndicator['quality'] {
        const t = BIO_QUALITY_THRESHOLDS.elbow
        if (angle >= t.excellent.min && angle <= t.excellent.max) return 'excellent'
        if (angle >= t.good.min && angle <= t.good.max) return 'good'
        if (angle >= t.needsWork.min && angle <= t.needsWork.max) return 'needs_work'
        return 'poor'
    }

    private getReleaseHeightQuality(ratio: number): BioIndicator['quality'] {
        const t = BIO_QUALITY_THRESHOLDS.releaseHeight
        if (ratio >= t.excellent) return 'excellent'
        if (ratio >= t.good) return 'good'
        if (ratio >= t.needsWork) return 'needs_work'
        return 'poor'
    }

    private getKneeQuality(angle: number): BioIndicator['quality'] {
        const t = BIO_QUALITY_THRESHOLDS.kneeAngle
        if (angle >= t.excellent.min && angle <= t.excellent.max) return 'excellent'
        if (angle >= t.good.min && angle <= t.good.max) return 'good'
        return 'needs_work'
    }
}

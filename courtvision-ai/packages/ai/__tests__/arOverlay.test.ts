import { AROverlayEngine, DEFAULT_AR_CONFIG, AROverlayFrame } from '../src/arOverlay'
import { NormalizedLandmark, BodyAngles, ShootingBiomechanics, BLAZEPOSE_LANDMARK_NAMES } from '../src/poseEstimation'
import { LANDMARKS } from '../src/tracking'

// ==========================================
// Helpers
// ==========================================

function createNormalizedLandmarks(): NormalizedLandmark[] {
    const landmarks: NormalizedLandmark[] = []
    const positions = [
        { x: 0.50, y: 0.05 },  // nose
        { x: 0.49, y: 0.04 }, { x: 0.48, y: 0.04 }, { x: 0.47, y: 0.04 },
        { x: 0.51, y: 0.04 }, { x: 0.52, y: 0.04 }, { x: 0.53, y: 0.04 },
        { x: 0.46, y: 0.05 }, { x: 0.54, y: 0.05 },
        { x: 0.49, y: 0.07 }, { x: 0.51, y: 0.07 },
        { x: 0.42, y: 0.18 }, { x: 0.58, y: 0.18 },  // shoulders
        { x: 0.38, y: 0.35 }, { x: 0.60, y: 0.08 },  // elbows (right is raised)
        { x: 0.36, y: 0.48 }, { x: 0.58, y: 0.02 },  // wrists (right is up)
        { x: 0.35, y: 0.50 }, { x: 0.59, y: 0.03 },
        { x: 0.36, y: 0.50 }, { x: 0.58, y: 0.03 },
        { x: 0.37, y: 0.49 }, { x: 0.57, y: 0.04 },
        { x: 0.45, y: 0.52 }, { x: 0.55, y: 0.52 },  // hips
        { x: 0.44, y: 0.72 }, { x: 0.56, y: 0.72 },  // knees
        { x: 0.44, y: 0.92 }, { x: 0.56, y: 0.92 },  // ankles
        { x: 0.43, y: 0.95 }, { x: 0.57, y: 0.95 },
        { x: 0.44, y: 0.97 }, { x: 0.56, y: 0.97 },
    ]

    for (let i = 0; i < positions.length; i++) {
        landmarks.push({
            x: positions[i].x,
            y: positions[i].y,
            z: 0,
            visibility: 0.9,
            name: i < BLAZEPOSE_LANDMARK_NAMES.length ? BLAZEPOSE_LANDMARK_NAMES[i] : `landmark_${i}`,
        })
    }
    return landmarks
}

function createAngles(): BodyAngles {
    return {
        rightElbowAngle: 94,
        leftElbowAngle: 165,
        rightShoulderAngle: 45,
        rightKneeAngle: 155,
        leftKneeAngle: 155,
        trunkAngle: 5,
        rightHipAngle: 170,
    }
}

function createBiomechanics(): ShootingBiomechanics {
    return {
        elbowAngle: 94,
        releaseHeightRatio: 1.16,
        playerHeightPx: 400,
        ballPosition: { x: 0.58, y: 0.02 },
        hasGoodBase: true,
        kneeFlexion: 155,
        isAligned: true,
        postureQuality: 82,
    }
}

// ==========================================
// Tests
// ==========================================

describe('AROverlayEngine', () => {
    describe('initialization', () => {
        it('should initialize with default config', () => {
            const engine = new AROverlayEngine()
            // No error expected
        })

        it('should accept custom config', () => {
            const engine = new AROverlayEngine({
                showSkeleton: false,
                primaryColor: '#FF0000',
            })
            // No error expected
        })
    })

    describe('generateOverlay', () => {
        it('should generate a complete AR overlay frame', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()
            const bio = createBiomechanics()

            const frame = engine.generateOverlay(
                landmarks, angles, bio, 'gathering',
                [{ x: 0.58, y: 0.05, timestamp: 0 }, { x: 0.58, y: 0.03, timestamp: 0.033 }, { x: 0.58, y: 0.02, timestamp: 0.066 }],
                0.1,
            )

            expect(frame.skeleton).toBeDefined()
            expect(frame.skeleton.joints.length).toBeGreaterThan(0)
            expect(frame.skeleton.bones.length).toBeGreaterThan(0)
            expect(frame.shotPhase).toBe('gathering')
            expect(frame.timestamp).toBe(0.1)
        })

        it('should generate skeleton with correct joint properties', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()

            const frame = engine.generateOverlay(
                landmarks, angles, null, 'idle', [], 0,
            )

            for (const joint of frame.skeleton.joints) {
                expect(joint.id).toBeDefined()
                expect(joint.name).toBeDefined()
                expect(typeof joint.x).toBe('number')
                expect(typeof joint.y).toBe('number')
                expect(joint.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
                expect(joint.radius).toBeGreaterThan(0)
            }
        })

        it('should generate bones with correct properties', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()

            const frame = engine.generateOverlay(
                landmarks, angles, null, 'idle', [], 0,
            )

            for (const bone of frame.skeleton.bones) {
                expect(typeof bone.fromId).toBe('number')
                expect(typeof bone.toId).toBe('number')
                expect(bone.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
                expect(bone.thickness).toBeGreaterThan(0)
                expect(bone.opacity).toBeGreaterThanOrEqual(0)
                expect(bone.opacity).toBeLessThanOrEqual(1)
            }
        })

        it('should highlight shooting arm during shot phases', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()
            const bio = createBiomechanics()

            const idleFrame = engine.generateOverlay(
                landmarks, angles, null, 'idle', [], 0,
            )
            const shootingFrame = engine.generateOverlay(
                landmarks, angles, bio, 'releasing', [], 0.1,
            )

            // During shooting, some joints should be highlighted
            const idleHighlighted = idleFrame.skeleton.joints.filter(j => j.isHighlighted)
            const shootHighlighted = shootingFrame.skeleton.joints.filter(j => j.isHighlighted)

            expect(shootHighlighted.length).toBeGreaterThanOrEqual(idleHighlighted.length)
        })

        it('should generate shot arc when wrist trajectory is available', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()
            const bio = createBiomechanics()

            const trajectory = [
                { x: 0.58, y: 0.10, timestamp: 0 },
                { x: 0.58, y: 0.06, timestamp: 0.033 },
                { x: 0.58, y: 0.02, timestamp: 0.066 },
            ]

            const frame = engine.generateOverlay(
                landmarks, angles, bio, 'releasing', trajectory, 0.1,
            )

            expect(frame.shotArc).not.toBeNull()
            expect(frame.shotArc!.points.length).toBeGreaterThan(0)
            expect(frame.shotArc!.color).toBeDefined()
            expect(frame.shotArc!.releasePoint).toBeDefined()
            expect(['excellent', 'good', 'average', 'poor']).toContain(frame.shotArc!.quality)
        })

        it('should generate bio indicators', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()
            const bio = createBiomechanics()

            const frame = engine.generateOverlay(
                landmarks, angles, bio, 'gathering', [], 0,
            )

            expect(frame.bioIndicators.length).toBeGreaterThan(0)

            // Vérifier l'indicateur de l'angle du coude
            const elbowIndicator = frame.bioIndicators.find(i => i.type === 'elbow_angle')
            expect(elbowIndicator).toBeDefined()
            expect(elbowIndicator!.value).toBe('94')
            expect(elbowIndicator!.unit).toBe('°')
            expect(['excellent', 'good', 'needs_work', 'poor']).toContain(elbowIndicator!.quality)
        })

        it('should not generate shot arc without enough trajectory points', () => {
            const engine = new AROverlayEngine()
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()

            const frame = engine.generateOverlay(
                landmarks, angles, null, 'idle', [], 0,
            )

            expect(frame.shotArc).toBeNull()
        })

        it('should not generate overlays when config disables them', () => {
            const engine = new AROverlayEngine({
                showSkeleton: false,
                showShotArc: false,
                showBioIndicators: false,
                showFeedback: false,
            })
            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()
            const bio = createBiomechanics()

            const frame = engine.generateOverlay(
                landmarks, angles, bio, 'releasing',
                [{ x: 0.5, y: 0.1, timestamp: 0 }, { x: 0.5, y: 0.05, timestamp: 0.03 }, { x: 0.5, y: 0.02, timestamp: 0.06 }],
                0.1,
            )

            expect(frame.skeleton.joints).toHaveLength(0)
            expect(frame.skeleton.bones).toHaveLength(0)
            expect(frame.shotArc).toBeNull()
            expect(frame.bioIndicators).toHaveLength(0)
            expect(frame.feedback).toBeNull()
        })
    })

    describe('showFeedback', () => {
        it('should set feedback that appears in next overlay', () => {
            const engine = new AROverlayEngine()
            engine.showFeedback('Test feedback', '🏀', '#00F5D4')

            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()

            const frame = engine.generateOverlay(
                landmarks, angles, null, 'idle', [], 0,
            )

            expect(frame.feedback).not.toBeNull()
            expect(frame.feedback!.message).toBe('Test feedback')
            expect(frame.feedback!.emoji).toBe('🏀')
        })
    })

    describe('updateConfig', () => {
        it('should update configuration dynamically', () => {
            const engine = new AROverlayEngine()
            engine.updateConfig({ showSkeleton: false })

            const landmarks = createNormalizedLandmarks()
            const angles = createAngles()

            const frame = engine.generateOverlay(
                landmarks, angles, null, 'idle', [], 0,
            )

            expect(frame.skeleton.joints).toHaveLength(0)
        })
    })

    describe('DEFAULT_AR_CONFIG', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_AR_CONFIG.showSkeleton).toBe(true)
            expect(DEFAULT_AR_CONFIG.showShotArc).toBe(true)
            expect(DEFAULT_AR_CONFIG.showBioIndicators).toBe(true)
            expect(DEFAULT_AR_CONFIG.showFeedback).toBe(true)
            expect(DEFAULT_AR_CONFIG.skeletonStyle).toBe('neon')
            expect(DEFAULT_AR_CONFIG.primaryColor).toMatch(/^#/)
            expect(DEFAULT_AR_CONFIG.globalOpacity).toBe(0.85)
        })
    })
})

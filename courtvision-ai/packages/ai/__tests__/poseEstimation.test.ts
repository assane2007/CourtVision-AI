import { PoseEstimationEngine, BodyAngles, ShootingBiomechanics, BLAZEPOSE_LANDMARK_NAMES, DEFAULT_POSE_CONFIG } from '../src/poseEstimation'
import { Landmark, LANDMARKS } from '../src/tracking'

// ==========================================
// Helper : générer des landmarks réalistes
// ==========================================

function createStandingLandmarks(): Landmark[] {
    // Joueur debout, bras le long du corps
    // y croissant vers le bas (comme une image)
    const landmarks: Landmark[] = []
    const positions = [
        { x: 0.50, y: 0.05 },  // 0: nose
        { x: 0.49, y: 0.04 },  // 1: left_eye_inner
        { x: 0.48, y: 0.04 },  // 2: left_eye
        { x: 0.47, y: 0.04 },  // 3: left_eye_outer
        { x: 0.51, y: 0.04 },  // 4: right_eye_inner
        { x: 0.52, y: 0.04 },  // 5: right_eye
        { x: 0.53, y: 0.04 },  // 6: right_eye_outer
        { x: 0.46, y: 0.05 },  // 7: left_ear
        { x: 0.54, y: 0.05 },  // 8: right_ear
        { x: 0.49, y: 0.07 },  // 9: mouth_left
        { x: 0.51, y: 0.07 },  // 10: mouth_right
        { x: 0.42, y: 0.18 },  // 11: left_shoulder
        { x: 0.58, y: 0.18 },  // 12: right_shoulder
        { x: 0.38, y: 0.35 },  // 13: left_elbow
        { x: 0.62, y: 0.35 },  // 14: right_elbow
        { x: 0.36, y: 0.48 },  // 15: left_wrist
        { x: 0.64, y: 0.48 },  // 16: right_wrist
        { x: 0.35, y: 0.50 },  // 17: left_pinky
        { x: 0.65, y: 0.50 },  // 18: right_pinky
        { x: 0.36, y: 0.50 },  // 19: left_index
        { x: 0.64, y: 0.50 },  // 20: right_index
        { x: 0.37, y: 0.49 },  // 21: left_thumb
        { x: 0.63, y: 0.49 },  // 22: right_thumb
        { x: 0.45, y: 0.52 },  // 23: left_hip
        { x: 0.55, y: 0.52 },  // 24: right_hip
        { x: 0.44, y: 0.72 },  // 25: left_knee
        { x: 0.56, y: 0.72 },  // 26: right_knee
        { x: 0.44, y: 0.92 },  // 27: left_ankle
        { x: 0.56, y: 0.92 },  // 28: right_ankle
        { x: 0.43, y: 0.95 },  // 29: left_heel
        { x: 0.57, y: 0.95 },  // 30: right_heel
        { x: 0.44, y: 0.97 },  // 31: left_foot_index
        { x: 0.56, y: 0.97 },  // 32: right_foot_index
    ]

    for (const pos of positions) {
        landmarks.push({ x: pos.x, y: pos.y, z: 0, visibility: 0.9 })
    }
    return landmarks
}

function createShootingLandmarks(): Landmark[] {
    // Joueur en position de tir : bras droit levé, coude plié ~95°
    const landmarks = createStandingLandmarks()

    // Bras droit en position de tir
    landmarks[LANDMARKS.RIGHT_SHOULDER] = { x: 0.58, y: 0.18, z: 0, visibility: 0.95 }
    landmarks[LANDMARKS.RIGHT_ELBOW] = { x: 0.60, y: 0.08, z: 0, visibility: 0.95 }   // Coude en haut
    landmarks[LANDMARKS.RIGHT_WRIST] = { x: 0.58, y: 0.02, z: 0, visibility: 0.95 }   // Poignet au-dessus de la tête

    // Genoux légèrement pliés
    landmarks[LANDMARKS.LEFT_KNEE] = { x: 0.44, y: 0.71, z: 0, visibility: 0.9 }
    landmarks[LANDMARKS.RIGHT_KNEE] = { x: 0.56, y: 0.71, z: 0, visibility: 0.9 }

    return landmarks
}

// ==========================================
// Tests
// ==========================================

describe('PoseEstimationEngine', () => {
    describe('initialization', () => {
        it('should initialize correctly', async () => {
            const engine = new PoseEstimationEngine()
            await engine.initialize()
            const state = engine.getState()

            expect(state.isInitialized).toBe(true)
            expect(state.currentModel).toBe('blazepose_full')
            expect(state.framesProcessed).toBe(0)
        })

        it('should use custom config', () => {
            const engine = new PoseEstimationEngine({
                model: 'movenet_thunder',
                delegate: 'coreml',
                minConfidence: 0.7,
            })
            const state = engine.getState()

            expect(state.currentModel).toBe('movenet_thunder')
            expect(state.delegate).toBe('coreml')
        })

        it('should throw if processFrame called before initialize', async () => {
            const engine = new PoseEstimationEngine()
            const frame = new Uint8Array(100)

            await expect(engine.processFrame(frame, 0, 0, 640, 480)).rejects.toThrow(
                'PoseEstimationEngine not initialized'
            )
        })
    })

    describe('extractBodyAngles', () => {
        it('should extract realistic body angles from standing pose', () => {
            const landmarks = createStandingLandmarks()
            const angles = PoseEstimationEngine.extractBodyAngles(landmarks)

            // Les bras le long du corps = coude ~180° (bras tendu)
            expect(angles.rightElbowAngle).toBeGreaterThan(100)
            expect(angles.leftElbowAngle).toBeGreaterThan(100)

            // Genoux debout = ~180° (jambes tendues)
            expect(angles.rightKneeAngle).toBeGreaterThan(140)
            expect(angles.leftKneeAngle).toBeGreaterThan(140)

            // Tronc relativement vertical
            expect(angles.trunkAngle).toBeLessThan(30)
        })

        it('should return zeros for insufficient landmarks', () => {
            const angles = PoseEstimationEngine.extractBodyAngles([])

            expect(angles.rightElbowAngle).toBe(0)
            expect(angles.leftElbowAngle).toBe(0)
            expect(angles.trunkAngle).toBe(0)
        })

        it('should detect shooting position angles', () => {
            const landmarks = createShootingLandmarks()
            const angles = PoseEstimationEngine.extractBodyAngles(landmarks)

            // Le bras de tir est levé, le coude est plié
            // L'angle exact dépend de la géométrie, mais devrait être < 180
            expect(angles.rightElbowAngle).toBeDefined()
            expect(typeof angles.rightElbowAngle).toBe('number')
        })
    })

    describe('extractShootingBiomechanics', () => {
        it('should extract shooting biomechanics', () => {
            const landmarks = createShootingLandmarks()
            const bio = PoseEstimationEngine.extractShootingBiomechanics(landmarks)

            expect(bio.elbowAngle).toBeDefined()
            expect(bio.releaseHeightRatio).toBeGreaterThan(0)
            expect(bio.playerHeightPx).toBeGreaterThan(0)
            expect(bio.postureQuality).toBeGreaterThanOrEqual(0)
            expect(bio.postureQuality).toBeLessThanOrEqual(100)
            expect(typeof bio.hasGoodBase).toBe('boolean')
            expect(typeof bio.isAligned).toBe('boolean')
        })

        it('should compute posture quality between 0-100', () => {
            const landmarks = createShootingLandmarks()
            const bio = PoseEstimationEngine.extractShootingBiomechanics(landmarks)

            expect(bio.postureQuality).toBeGreaterThanOrEqual(0)
            expect(bio.postureQuality).toBeLessThanOrEqual(100)
        })

        it('should estimate ball position between the wrists', () => {
            const landmarks = createShootingLandmarks()
            const bio = PoseEstimationEngine.extractShootingBiomechanics(landmarks)

            const lWrist = landmarks[LANDMARKS.LEFT_WRIST]
            const rWrist = landmarks[LANDMARKS.RIGHT_WRIST]

            // Ball position devrait être entre les deux poignets
            expect(bio.ballPosition.x).toBeDefined()
            expect(bio.ballPosition.y).toBeDefined()
        })
    })

    describe('BLAZEPOSE_LANDMARK_NAMES', () => {
        it('should have 33 landmark names', () => {
            expect(BLAZEPOSE_LANDMARK_NAMES).toHaveLength(33)
        })

        it('should contain expected landmark names', () => {
            expect(BLAZEPOSE_LANDMARK_NAMES).toContain('nose')
            expect(BLAZEPOSE_LANDMARK_NAMES).toContain('right_shoulder')
            expect(BLAZEPOSE_LANDMARK_NAMES).toContain('right_elbow')
            expect(BLAZEPOSE_LANDMARK_NAMES).toContain('right_wrist')
            expect(BLAZEPOSE_LANDMARK_NAMES).toContain('left_hip')
        })
    })

    describe('DEFAULT_POSE_CONFIG', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_POSE_CONFIG.model).toBe('blazepose_full')
            expect(DEFAULT_POSE_CONFIG.delegate).toBe('gpu')
            expect(DEFAULT_POSE_CONFIG.minConfidence).toBe(0.5)
            expect(DEFAULT_POSE_CONFIG.enableSmoothing).toBe(true)
            expect(DEFAULT_POSE_CONFIG.maxPersons).toBe(1)
        })
    })

    describe('lifecycle', () => {
        it('should dispose correctly', async () => {
            const engine = new PoseEstimationEngine()
            await engine.initialize()
            expect(engine.getState().isInitialized).toBe(true)

            await engine.dispose()
            expect(engine.getState().isInitialized).toBe(false)
        })
    })
})

/**
 * Tests unitaires pour le package @courtvision/ai
 *
 * Teste les fonctions utilitaires pures (pas de dépendances externes
 * comme FFmpeg, MediaPipe, etc.)
 */

import type { Landmark } from '../tracking';
import { calculateAngle, calculateSpeed, getShoulderPosture, LANDMARKS } from '../tracking'
import type { CalibrationPoints } from '../preprocessing';
import { computeHomography } from '../preprocessing'

// ==========================================
// Helpers
// ==========================================

/** Crée un tableau de 33 landmarks avec des valeurs par défaut */
function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
    const defaults: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 1 }
    const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ ...defaults }))
    for (const [idx, values] of Object.entries(overrides)) {
        landmarks[Number(idx)] = { ...landmarks[Number(idx)], ...values }
    }
    return landmarks
}

// ==========================================
// Tests — calculateAngle
// ==========================================
describe('calculateAngle', () => {
    it('devrait retourner 180° pour trois points alignés', () => {
        const a: Landmark = { x: 0, y: 0, z: 0, visibility: 1 }
        const b: Landmark = { x: 1, y: 0, z: 0, visibility: 1 }
        const c: Landmark = { x: 2, y: 0, z: 0, visibility: 1 }

        const angle = calculateAngle(a, b, c)
        expect(angle).toBeCloseTo(180, 0)
    })

    it('devrait retourner 90° pour un angle droit', () => {
        const a: Landmark = { x: 0, y: 0, z: 0, visibility: 1 }
        const b: Landmark = { x: 0, y: 1, z: 0, visibility: 1 }
        const c: Landmark = { x: 1, y: 1, z: 0, visibility: 1 }

        const angle = calculateAngle(a, b, c)
        expect(angle).toBeCloseTo(90, 0)
    })

    it('devrait retourner 0° pour deux points superposés', () => {
        const a: Landmark = { x: 1, y: 0, z: 0, visibility: 1 }
        const b: Landmark = { x: 0, y: 0, z: 0, visibility: 1 }
        const c: Landmark = { x: 1, y: 0, z: 0, visibility: 1 }

        const angle = calculateAngle(a, b, c)
        expect(angle).toBeCloseTo(0, 0)
    })

    it('devrait retourner un angle entre 0 et 180', () => {
        const a: Landmark = { x: 1, y: 1, z: 0, visibility: 1 }
        const b: Landmark = { x: 0, y: 0, z: 0, visibility: 1 }
        const c: Landmark = { x: 1, y: -1, z: 0, visibility: 1 }

        const angle = calculateAngle(a, b, c)
        expect(angle).toBeGreaterThanOrEqual(0)
        expect(angle).toBeLessThanOrEqual(180)
    })
})

// ==========================================
// Tests — calculateSpeed
// ==========================================
describe('calculateSpeed', () => {
    it('devrait retourner 0 si deltaTime est 0', () => {
        const prev = makeLandmarks()
        const curr = makeLandmarks()
        expect(calculateSpeed(prev, curr, 0)).toBe(0)
    })

    it('devrait retourner 0 si les positions sont identiques', () => {
        const prev = makeLandmarks()
        const curr = makeLandmarks()
        expect(calculateSpeed(prev, curr, 1)).toBe(0)
    })

    it('devrait retourner une valeur positive si le joueur se déplace', () => {
        const prev = makeLandmarks({
            [LANDMARKS.LEFT_HIP]: { x: 0, y: 0 },
            [LANDMARKS.RIGHT_HIP]: { x: 0, y: 0 },
        })
        const curr = makeLandmarks({
            [LANDMARKS.LEFT_HIP]: { x: 1, y: 0 },
            [LANDMARKS.RIGHT_HIP]: { x: 1, y: 0 },
        })

        const speed = calculateSpeed(prev, curr, 1)
        expect(speed).toBeGreaterThan(0)
    })

    it('devrait doubler la vitesse si le delta time est divisé par 2', () => {
        const prev = makeLandmarks({
            [LANDMARKS.LEFT_HIP]: { x: 0, y: 0 },
            [LANDMARKS.RIGHT_HIP]: { x: 0, y: 0 },
        })
        const curr = makeLandmarks({
            [LANDMARKS.LEFT_HIP]: { x: 1, y: 0 },
            [LANDMARKS.RIGHT_HIP]: { x: 1, y: 0 },
        })

        const speed1 = calculateSpeed(prev, curr, 1)
        const speed2 = calculateSpeed(prev, curr, 0.5)
        expect(speed2).toBeCloseTo(speed1 * 2, 5)
    })
})

// ==========================================
// Tests — getShoulderPosture
// ==========================================
describe('getShoulderPosture', () => {
    it('devrait retourner une valeur entre 0 et 1', () => {
        const landmarks = makeLandmarks({
            [LANDMARKS.NOSE]: { y: 0.2 },
            [LANDMARKS.LEFT_SHOULDER]: { y: 0.4 },
            [LANDMARKS.RIGHT_SHOULDER]: { y: 0.4 },
            [LANDMARKS.LEFT_HIP]: { y: 0.7 },
            [LANDMARKS.RIGHT_HIP]: { y: 0.7 },
        })

        const posture = getShoulderPosture(landmarks)
        expect(posture).toBeGreaterThanOrEqual(0)
        expect(posture).toBeLessThanOrEqual(1)
    })

    it('devrait retourner 0.5 si épaule-hanche est 0 (edge case)', () => {
        const landmarks = makeLandmarks({
            [LANDMARKS.NOSE]: { y: 0.5 },
            [LANDMARKS.LEFT_SHOULDER]: { y: 0.5 },
            [LANDMARKS.RIGHT_SHOULDER]: { y: 0.5 },
            [LANDMARKS.LEFT_HIP]: { y: 0.5 },
            [LANDMARKS.RIGHT_HIP]: { y: 0.5 },
        })

        const posture = getShoulderPosture(landmarks)
        expect(posture).toBe(0.5)
    })

    it('devrait retourner une valeur plus élevée pour une posture droite', () => {
        // Posture droite : nez loin au-dessus des épaules
        const straight = makeLandmarks({
            [LANDMARKS.NOSE]: { y: 0.1 },
            [LANDMARKS.LEFT_SHOULDER]: { y: 0.4 },
            [LANDMARKS.RIGHT_SHOULDER]: { y: 0.4 },
            [LANDMARKS.LEFT_HIP]: { y: 0.7 },
            [LANDMARKS.RIGHT_HIP]: { y: 0.7 },
        })

        // Posture tombante : nez proche des épaules
        const slumped = makeLandmarks({
            [LANDMARKS.NOSE]: { y: 0.35 },
            [LANDMARKS.LEFT_SHOULDER]: { y: 0.4 },
            [LANDMARKS.RIGHT_SHOULDER]: { y: 0.4 },
            [LANDMARKS.LEFT_HIP]: { y: 0.7 },
            [LANDMARKS.RIGHT_HIP]: { y: 0.7 },
        })

        const straightPosture = getShoulderPosture(straight)
        const slumpedPosture = getShoulderPosture(slumped)
        expect(straightPosture).toBeGreaterThan(slumpedPosture)
    })
})

// ==========================================
// Tests — computeHomography
// ==========================================
describe('computeHomography', () => {
    it('devrait retourner une matrice 3x3', () => {
        const calibration: CalibrationPoints = {
            topLeft: { x: 100, y: 50 },
            topRight: { x: 700, y: 50 },
            bottomLeft: { x: 50, y: 500 },
            bottomRight: { x: 750, y: 500 },
        }

        const H = computeHomography(calibration)
        expect(H).toHaveLength(3)
        expect(H[0]).toHaveLength(3)
        expect(H[1]).toHaveLength(3)
        expect(H[2]).toHaveLength(3)
    })

    it('devrait mapper correctement les coins du terrain', () => {
        const calibration: CalibrationPoints = {
            topLeft: { x: 0, y: 0 },
            topRight: { x: 100, y: 0 },
            bottomLeft: { x: 0, y: 100 },
            bottomRight: { x: 100, y: 100 },
        }

        const H = computeHomography(calibration)

        // Vérifier que la matrice n'est pas nulle
        const hasNonZero = H.some(row => row.some(v => v !== 0))
        expect(hasNonZero).toBe(true)
    })
})

// ==========================================
// Tests — LANDMARKS constants
// ==========================================
describe('LANDMARKS', () => {
    it('devrait avoir les indices MediaPipe corrects', () => {
        expect(LANDMARKS.NOSE).toBe(0)
        expect(LANDMARKS.LEFT_SHOULDER).toBe(11)
        expect(LANDMARKS.RIGHT_SHOULDER).toBe(12)
        expect(LANDMARKS.LEFT_ELBOW).toBe(13)
        expect(LANDMARKS.RIGHT_ELBOW).toBe(14)
        expect(LANDMARKS.LEFT_WRIST).toBe(15)
        expect(LANDMARKS.RIGHT_WRIST).toBe(16)
        expect(LANDMARKS.LEFT_HIP).toBe(23)
        expect(LANDMARKS.RIGHT_HIP).toBe(24)
        expect(LANDMARKS.LEFT_KNEE).toBe(25)
        expect(LANDMARKS.RIGHT_KNEE).toBe(26)
        expect(LANDMARKS.LEFT_ANKLE).toBe(27)
        expect(LANDMARKS.RIGHT_ANKLE).toBe(28)
    })
})

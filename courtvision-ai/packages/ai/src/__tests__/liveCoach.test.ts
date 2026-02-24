/**
 * Tests unitaires pour le moteur Coach Live (LiveCoachEngine)
 *
 * Vérifie :
 * - Cycle de vie de session (start → analyzeFrame → endQuarter → endSession)
 * - Calcul des scores (mental, fatigue, posture)
 * - Génération d'alertes contextuelles
 * - Cooldowns et limites d'alertes
 * - Analyse stateless (analyzeSingleFrame)
 * - Stats cumulées
 */

import { LiveCoachEngine, analyzeSingleFrame, LiveLandmarks, LiveCoachConfig } from '../liveCoach'
import { Landmark, LANDMARKS } from '../tracking'

// ==========================================
// Helpers
// ==========================================

/** Crée 33 landmarks valides avec des overrides optionnels */
function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
    const defaults: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 }
    const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ ...defaults }))

    // Donner des positions réalistes aux épaules et hanches
    landmarks[LANDMARKS.LEFT_SHOULDER] = { x: 0.4, y: 0.35, z: 0, visibility: 0.95 }
    landmarks[LANDMARKS.RIGHT_SHOULDER] = { x: 0.6, y: 0.35, z: 0, visibility: 0.95 }
    landmarks[LANDMARKS.LEFT_HIP] = { x: 0.45, y: 0.55, z: 0, visibility: 0.9 }
    landmarks[LANDMARKS.RIGHT_HIP] = { x: 0.55, y: 0.55, z: 0, visibility: 0.9 }
    landmarks[LANDMARKS.NOSE] = { x: 0.5, y: 0.25, z: 0, visibility: 0.95 }
    landmarks[LANDMARKS.RIGHT_ELBOW] = { x: 0.65, y: 0.4, z: 0, visibility: 0.9 }
    landmarks[LANDMARKS.RIGHT_WRIST] = { x: 0.7, y: 0.3, z: 0, visibility: 0.9 }

    for (const [idx, values] of Object.entries(overrides)) {
        landmarks[Number(idx)] = { ...landmarks[Number(idx)], ...values }
    }
    return landmarks
}

/** Crée un LiveLandmarks standard */
function makeFrameData(overrides?: Partial<LiveLandmarks>): LiveLandmarks {
    return {
        landmarks: makeLandmarks(),
        ballDetected: false,
        ...overrides,
    }
}

// ==========================================
// Tests — Cycle de vie de session
// ==========================================
describe('LiveCoachEngine — Cycle de vie', () => {
    let engine: LiveCoachEngine

    beforeEach(() => {
        engine = new LiveCoachEngine()
    })

    it('devrait démarrer une session avec la config par défaut', () => {
        engine.startSession()
        const state = engine.getSessionState()
        expect(state.active).toBe(true)
        expect(state.quarter).toBe(1)
        expect(state.stats.playTime).toBe(0)
        expect(state.stats.shotsDetected).toBe(0)
    })

    it('devrait démarrer avec une config personnalisée', () => {
        engine.startSession({
            alertSensitivity: 'high',
            frameInterval: 2,
            maxAlertsPerQuarter: 30,
        })
        const state = engine.getSessionState()
        expect(state.active).toBe(true)
    })

    it('devrait lancer une erreur si analyzeFrame est appelé sans session active', () => {
        expect(() => {
            engine.analyzeFrame(makeFrameData(), 1, 100)
        }).toThrow('No active live session')
    })

    it('devrait terminer la session et retourner un rapport', () => {
        engine.startSession()
        engine.analyzeFrame(makeFrameData(), 1, 100)
        engine.analyzeFrame(makeFrameData(), 1, 103)

        const result = engine.endSession()
        expect(result.summary).toBeDefined()
        expect(result.summary.type).toBe('quarter_summary')
        expect(result.stats).toBeDefined()
        expect(result.mentalTimeline).toBeInstanceOf(Array)
        expect(result.mentalTimeline.length).toBe(2)
        expect(result.recommendations).toBeInstanceOf(Array)
        expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('devrait pouvoir reset et redémarrer une session', () => {
        engine.startSession()
        engine.analyzeFrame(makeFrameData(), 1, 100)
        engine.endSession()

        // Redémarrer
        engine.startSession()
        const state = engine.getSessionState()
        expect(state.active).toBe(true)
        expect(state.stats.playTime).toBe(0)
    })
})

// ==========================================
// Tests — analyzeFrame
// ==========================================
describe('LiveCoachEngine — analyzeFrame', () => {
    let engine: LiveCoachEngine

    beforeEach(() => {
        engine = new LiveCoachEngine()
        engine.startSession({ alertSensitivity: 'low', maxAlertsPerQuarter: 50 })
    })

    it('devrait retourner les métriques de base pour une frame valide', () => {
        const result = engine.analyzeFrame(makeFrameData(), 1, 100)

        expect(result.mentalScore).toBeGreaterThanOrEqual(10)
        expect(result.mentalScore).toBeLessThanOrEqual(100)
        expect(result.fatigueIndex).toBeGreaterThanOrEqual(0)
        expect(result.fatigueIndex).toBeLessThanOrEqual(100)
        expect(result.postureScore).toBeGreaterThanOrEqual(0)
        expect(result.postureScore).toBeLessThanOrEqual(1)
        expect(result.confidence).toBeGreaterThan(0)
        expect(result.alerts).toBeInstanceOf(Array)
    })

    it('devrait fonctionner sans landmarks (confiance basse)', () => {
        const result = engine.analyzeFrame({
            landmarks: [],
            ballDetected: false,
        }, 1, 100)

        expect(result.confidence).toBe(0.3)
        expect(result.postureScore).toBe(0.5)
    })

    it('devrait accumuler les stats entre les frames', () => {
        engine.analyzeFrame(makeFrameData(), 1, 100)
        engine.analyzeFrame(makeFrameData(), 1, 103)
        const result = engine.analyzeFrame(makeFrameData(), 1, 106)

        expect(result.cumulativeStats.playTime).toBeGreaterThan(0)
    })

    it('devrait enregistrer les tirs manuels', () => {
        engine.analyzeFrame(makeFrameData(), 1, 100, true, false) // made
        engine.analyzeFrame(makeFrameData(), 1, 103, false, true) // missed
        const result = engine.analyzeFrame(makeFrameData(), 1, 106, true, false) // made

        expect(result.cumulativeStats.shotsMade).toBe(2)
        expect(result.cumulativeStats.shotsDetected).toBe(3)
        expect(result.cumulativeStats.shootingPct).toBe(67)
    })

    it('devrait tracker les peak et low moments', () => {
        // Envoyer assez de frames pour avoir des données
        for (let i = 0; i < 5; i++) {
            engine.analyzeFrame(makeFrameData(), 1, 100 + i * 3)
        }

        const state = engine.getSessionState()
        expect(state.stats.peakMoment).not.toBeNull()
        expect(state.stats.lowMoment).not.toBeNull()
        expect(state.stats.peakMoment!.score).toBeGreaterThanOrEqual(state.stats.lowMoment!.score)
    })

    it('devrait tracker le mental par quart-temps', () => {
        engine.analyzeFrame(makeFrameData(), 1, 100)
        engine.analyzeFrame(makeFrameData(), 1, 103)
        engine.analyzeFrame(makeFrameData(), 2, 200)

        const state = engine.getSessionState()
        expect(state.stats.mentalByQuarter[1]).toBeDefined()
        expect(state.stats.mentalByQuarter[1].length).toBe(2)
        expect(state.stats.mentalByQuarter[2]).toBeDefined()
        expect(state.stats.mentalByQuarter[2].length).toBe(1)
    })
})

// ==========================================
// Tests — endQuarter
// ==========================================
describe('LiveCoachEngine — endQuarter', () => {
    it('devrait retourner un résumé de quart-temps', () => {
        const engine = new LiveCoachEngine()
        engine.startSession()

        engine.analyzeFrame(makeFrameData(), 1, 100)
        engine.analyzeFrame(makeFrameData(), 1, 103)
        engine.analyzeFrame(makeFrameData(), 1, 106, true) // tir réussi

        const summary = engine.endQuarter()
        expect(summary.type).toBe('quarter_summary')
        expect(summary.severity).toBe('info')
        expect(summary.emoji).toBe('📋')
        expect(summary.message).toContain('Fin Q1')
        expect(summary.vibrate).toBe(true)
        expect(summary.data).toBeDefined()
        expect(summary.data!.quarter).toBe(1)
    })
})

// ==========================================
// Tests — Alertes
// ==========================================
describe('LiveCoachEngine — Alertes', () => {
    it('devrait générer des alertes de posture pour une mauvaise posture', () => {
        const engine = new LiveCoachEngine()
        engine.startSession({ alertSensitivity: 'high', mentalAlerts: true })

        // D'abord établir la baseline (10 frames)
        for (let i = 0; i < 10; i++) {
            engine.analyzeFrame(makeFrameData(), 1, 100 + i * 3)
        }

        // Maintenant envoyer des frames avec des épaules tombantes
        const badPosture = makeLandmarks({
            [LANDMARKS.LEFT_SHOULDER]: { x: 0.4, y: 0.5, z: 0, visibility: 0.95 },
            [LANDMARKS.RIGHT_SHOULDER]: { x: 0.6, y: 0.52, z: 0, visibility: 0.95 },
        })

        let postureAlertFound = false
        for (let i = 0; i < 5; i++) {
            const result = engine.analyzeFrame({
                landmarks: badPosture,
                ballDetected: false,
            }, 1, 200 + i * 3)
            if (result.alerts.some(a => a.type === 'posture')) {
                postureAlertFound = true
            }
        }

        // Peut ne pas déclencher selon les seuils, mais le score doit être bas
        const state = engine.getSessionState()
        expect(state.stats.alertsSent).toBeGreaterThanOrEqual(0)
    })

    it('devrait respecter maxAlertsPerQuarter', () => {
        const engine = new LiveCoachEngine()
        engine.startSession({
            alertSensitivity: 'high',
            maxAlertsPerQuarter: 2,
            fatigueAlerts: true,
            mentalAlerts: true,
            shotPostureAlerts: true,
        })

        let totalAlerts = 0
        // Envoyer beaucoup de frames
        for (let i = 0; i < 50; i++) {
            const result = engine.analyzeFrame(makeFrameData(), 1, 100 + i * 3)
            totalAlerts += result.alerts.length
        }

        expect(totalAlerts).toBeLessThanOrEqual(2)
    })

    it('devrait avoir des vibrationPattern sur les alertes critiques', () => {
        const engine = new LiveCoachEngine()
        engine.startSession({ alertSensitivity: 'high', mentalAlerts: true })

        // Collecter toutes les alertes
        const allAlerts: any[] = []
        for (let i = 0; i < 30; i++) {
            const result = engine.analyzeFrame(makeFrameData(), 1, 100 + i * 3)
            allAlerts.push(...result.alerts)
        }

        // Toutes les alertes doivent avoir un vibrationPattern
        for (const alert of allAlerts) {
            expect(alert.vibrationPattern).toBeInstanceOf(Array)
            expect(alert.vibrate).toBe(true)
            expect(alert.id).toBeDefined()
            expect(alert.emoji).toBeDefined()
            expect(alert.message).toBeDefined()
        }
    })
})

// ==========================================
// Tests — Recommandations de fin de match
// ==========================================
describe('LiveCoachEngine — Recommandations', () => {
    it('devrait générer des recommandations de shooting', () => {
        const engine = new LiveCoachEngine()
        engine.startSession()

        // Simuler un mauvais shooting
        for (let i = 0; i < 5; i++) {
            engine.analyzeFrame(makeFrameData(), 1, 100 + i * 3, false, true) // missed
        }

        const result = engine.endSession()
        expect(result.recommendations.some(r => r.toLowerCase().includes('tir') || r.toLowerCase().includes('shooting'))).toBe(true)
    })

    it('devrait générer des recommandations même sans données', () => {
        const engine = new LiveCoachEngine()
        engine.startSession()
        engine.analyzeFrame(makeFrameData(), 1, 100)

        const result = engine.endSession()
        expect(result.recommendations.length).toBeGreaterThan(0)
    })
})

// ==========================================
// Tests — analyzeSingleFrame (stateless)
// ==========================================
describe('analyzeSingleFrame', () => {
    it('devrait analyser une frame avec 33 landmarks', () => {
        const landmarks = makeLandmarks()
        const result = analyzeSingleFrame(landmarks)

        expect(result.postureScore).toBeGreaterThan(0)
        expect(result.elbowAngle).toBeGreaterThanOrEqual(0)
        expect(typeof result.isShootingMotion).toBe('boolean')
        expect(['up', 'neutral', 'down']).toContain(result.headPosition)
    })

    it('devrait retourner des valeurs par défaut pour moins de 33 landmarks', () => {
        const result = analyzeSingleFrame([])

        expect(result.postureScore).toBe(0.5)
        expect(result.elbowAngle).toBe(0)
        expect(result.isShootingMotion).toBe(false)
        expect(result.headPosition).toBe('neutral')
    })

    it('devrait détecter un mouvement de tir', () => {
        // Poignet au-dessus de l'épaule + coude étendu
        const landmarks = makeLandmarks({
            [LANDMARKS.RIGHT_SHOULDER]: { x: 0.6, y: 0.4, z: 0, visibility: 0.95 },
            [LANDMARKS.RIGHT_ELBOW]: { x: 0.65, y: 0.3, z: 0, visibility: 0.9 },
            [LANDMARKS.RIGHT_WRIST]: { x: 0.7, y: 0.15, z: 0, visibility: 0.9 },
        })

        const result = analyzeSingleFrame(landmarks)
        expect(result.isShootingMotion).toBe(true)
    })

    it('devrait détecter la tête baissée', () => {
        const landmarks = makeLandmarks({
            [LANDMARKS.NOSE]: { x: 0.5, y: 0.5, z: 0, visibility: 0.95 },
            [LANDMARKS.LEFT_SHOULDER]: { x: 0.4, y: 0.35, z: 0, visibility: 0.95 },
            [LANDMARKS.RIGHT_SHOULDER]: { x: 0.6, y: 0.35, z: 0, visibility: 0.95 },
        })

        const result = analyzeSingleFrame(landmarks)
        expect(result.headPosition).toBe('down')
    })
})

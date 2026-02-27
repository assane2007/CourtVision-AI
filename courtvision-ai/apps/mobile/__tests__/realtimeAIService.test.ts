/**
 * Tests pour le RealtimeAIService
 */

// Mock de DemoSimulator
jest.mock('../lib/demoSimulator', () => {
    let frameCount = 0
    return {
        DemoSimulator: jest.fn().mockImplementation(() => ({
            configure: jest.fn(),
            processFrame: jest.fn().mockImplementation(() => {
                frameCount++
                const isShot = frameCount % 50 === 0
                return {
                    pose: null,
                    bodyAngles: {
                        rightElbowAngle: 94,
                        leftElbowAngle: 85,
                        rightShoulderAngle: 120,
                        rightKneeAngle: 155,
                        leftKneeAngle: 155,
                        trunkAngle: 5,
                        rightHipAngle: 170,
                    },
                    biomechanics: {
                        elbowAngle: 94,
                        releaseHeightRatio: 1.14,
                        playerHeightPx: 400,
                        ballPosition: { x: 0.5, y: 0.3 },
                        hasGoodBase: true,
                        kneeFlexion: 155,
                        isAligned: true,
                        postureQuality: 74,
                    },
                    detectedShot: isShot ? {
                        shotId: `demo_shot_${frameCount}`,
                        completedPhase: 'following_through',
                        phaseTimestamps: {
                            gatherStart: 0,
                            releasePoint: 0.4,
                            followThroughStart: 0.5,
                            ballFlightStart: 0.6,
                            resolved: 1.0,
                        },
                        releaseBiomechanics: {
                            elbowAngle: 94,
                            releaseHeightRatio: 1.14,
                            playerHeightPx: 400,
                            ballPosition: { x: 0.5, y: 0.3 },
                            hasGoodBase: true,
                            kneeFlexion: 155,
                            isAligned: true,
                            postureQuality: 74,
                        },
                        setPointElbowAngle: 94,
                        releaseTime: 0.42,
                        hasFollowThrough: true,
                        followThroughDuration: 0.3,
                        outcome: Math.random() > 0.5 ? 'made' : 'missed',
                        detectionConfidence: 0.92,
                        angleTimeline: [],
                        wristTrajectory: [],
                    } : null,
                    shotPhase: isShot ? 'following_through' : 'idle',
                    ballPosition: null,
                    arFrame: {
                        skeleton: null,
                        shotArc: null,
                        bioIndicators: [],
                        ballIndicator: null,
                        rimIndicator: null,
                        feedback: null,
                    },
                    instantFeedback: null,
                    processingTimeMs: 5,
                    currentFps: 30,
                }
            }),
        })),
    }
})

// Mock performance.now
global.performance = {
    ...global.performance,
    now: jest.fn(() => Date.now()),
}

import { RealtimeAIService } from '../lib/realtimeAIService'

describe('RealtimeAIService', () => {
    let service: RealtimeAIService

    beforeEach(async () => {
        // Reset singleton
        await RealtimeAIService.getInstance().dispose()
        service = RealtimeAIService.getInstance()
    })

    afterEach(async () => {
        await service.dispose()
    })

    describe('Lifecycle', () => {
        it('devrait s\'initialiser correctement', async () => {
            await service.initialize({
                enableHaptics: false,
                enableDemoMode: false,
            })
            // No error = success
        })

        it('devrait s\'initialiser en mode démo', async () => {
            await service.initialize({
                enableHaptics: false,
                enableDemoMode: true,
                demoProfile: 'good',
            })
            // No error = success
        })

        it('ne devrait pas re-initialiser si déjà initialisé', async () => {
            await service.initialize({ enableHaptics: false })
            await service.initialize({ enableHaptics: true }) // Should be a no-op
        })
    })

    describe('Session Management', () => {
        beforeEach(async () => {
            await service.initialize({
                enableHaptics: false,
                enableDemoMode: true,
                demoProfile: 'good',
            })
        })

        it('devrait démarrer une session', () => {
            const sessionId = service.startSession()
            expect(sessionId).toBeTruthy()
            expect(sessionId).toContain('session_')
            expect(service.isActive()).toBe(true)
        })

        it('devrait lancer une erreur si non initialisé', async () => {
            await service.dispose()
            const newService = RealtimeAIService.getInstance()
            expect(() => newService.startSession()).toThrow('not initialized')
        })

        it('devrait terminer une session et retourner les stats', () => {
            service.startSession()
            const stats = service.endSession()

            expect(stats).toBeTruthy()
            expect(stats.sessionId).toBeTruthy()
            expect(stats.totalShots).toBeDefined()
            expect(stats.shootingPct).toBeDefined()
            expect(service.isActive()).toBe(false)
        })

        it('devrait lancer une erreur si pas de session active', () => {
            expect(() => service.endSession()).toThrow('No active session')
        })
    })

    describe('Frame Processing (Demo Mode)', () => {
        beforeEach(async () => {
            await service.initialize({
                enableHaptics: false,
                enableDemoMode: true,
                demoProfile: 'good',
            })
            service.startSession()
        })

        it('devrait traiter une frame en mode démo', async () => {
            const result = await service.processFrame('', 1, 0.033, 1080, 1920)

            expect(result).toBeTruthy()
            expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
            expect(result.currentFps).toBeGreaterThan(0)
            expect(result.shotPhase).toBeTruthy()
        })

        it('devrait accumuler les frames', async () => {
            for (let i = 0; i < 10; i++) {
                await service.processFrame('', i, i / 30, 1080, 1920)
            }

            expect(service.getFrameCount()).toBe(10)
        })

        it('devrait lancer une erreur si pas de session active', async () => {
            service.endSession()
            await expect(
                service.processFrame('', 1, 0, 1080, 1920)
            ).rejects.toThrow('No active session')
        })
    })

    describe('Manual Shot Recording', () => {
        beforeEach(async () => {
            await service.initialize({
                enableHaptics: false,
                enableDemoMode: true,
            })
            service.startSession()
        })

        it('devrait enregistrer un tir manuel (made)', () => {
            service.recordManualShot('made')
            expect(service.getShotCount()).toBe(1)
            expect(service.getShots()[0].outcome).toBe('made')
        })

        it('devrait enregistrer un tir manuel (missed)', () => {
            service.recordManualShot('missed')
            expect(service.getShotCount()).toBe(1)
            expect(service.getShots()[0].outcome).toBe('missed')
        })

        it('devrait accumuler les tirs manuels', () => {
            service.recordManualShot('made')
            service.recordManualShot('missed')
            service.recordManualShot('made')
            expect(service.getShotCount()).toBe(3)
        })

        it('devrait utiliser des valeurs NBA réalistes par défaut', () => {
            service.recordManualShot('made')
            const shot = service.getShots()[0]
            expect(shot.releaseBiomechanics.elbowAngle).toBe(94)
            expect(shot.releaseBiomechanics.releaseHeightRatio).toBe(1.14)
            expect(shot.releaseBiomechanics.postureQuality).toBe(70)
        })
    })

    describe('Stats Computation', () => {
        beforeEach(async () => {
            await service.initialize({
                enableHaptics: false,
                enableDemoMode: true,
            })
            service.startSession()
        })

        it('devrait calculer les stats avec des tirs manuels', () => {
            service.recordManualShot('made')
            service.recordManualShot('made')
            service.recordManualShot('missed')

            const stats = service.getCurrentStats()
            expect(stats.totalShots).toBe(3)
            expect(stats.madeShots).toBe(2)
            expect(stats.missedShots).toBe(1)
            expect(stats.shootingPct).toBeCloseTo(66.7, 0)
        })

        it('devrait retourner 0% avec 0 tirs', () => {
            const stats = service.getCurrentStats()
            expect(stats.shootingPct).toBe(0)
            expect(stats.totalShots).toBe(0)
        })

        it('devrait calculer le FPS moyen', async () => {
            for (let i = 0; i < 5; i++) {
                await service.processFrame('', i, i / 30, 1080, 1920)
            }
            expect(service.getAverageFps()).toBeGreaterThan(0)
        })
    })
})

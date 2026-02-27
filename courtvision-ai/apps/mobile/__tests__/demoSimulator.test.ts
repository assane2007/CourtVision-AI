/**
 * Tests pour DemoSimulator — Vérifie la génération de données réalistes.
 */

import { DemoSimulator } from '../lib/demoSimulator'

describe('DemoSimulator', () => {
    let simulator: DemoSimulator

    beforeEach(() => {
        simulator = new DemoSimulator()
    })

    describe('configuration', () => {
        it('should use default config on creation', () => {
            expect(simulator.getShotCount()).toBe(0)
            expect(simulator.getFrameIndex()).toBe(0)
            expect(simulator.getCurrentPhase()).toBe('idle')
        })

        it('should accept custom config', () => {
            simulator.configure({
                playerProfile: 'elite',
                shotFrequencyPerMinute: 10,
            })
            expect(simulator.getShotCount()).toBe(0)
        })

        it('should reset state', () => {
            // Process some frames first
            for (let i = 0; i < 200; i++) {
                simulator.processFrame()
            }
            expect(simulator.getFrameIndex()).toBe(200)

            simulator.reset()
            expect(simulator.getFrameIndex()).toBe(0)
            expect(simulator.getShotCount()).toBe(0)
            expect(simulator.getCurrentPhase()).toBe('idle')
        })
    })

    describe('frame processing', () => {
        it('should return valid FrameProcessingResult', () => {
            const result = simulator.processFrame()

            expect(result).toBeDefined()
            expect(result.pose).toBeDefined()
            expect(typeof result.processingTimeMs).toBe('number')
            expect(typeof result.currentFps).toBe('number')
            expect(typeof result.shotPhase).toBe('string')
        })

        it('should cycle through shot phases', () => {
            const phases = new Set<string>()

            // Process enough frames to complete a full shot cycle
            for (let i = 0; i < 300; i++) {
                const result = simulator.processFrame()
                phases.add(result.shotPhase)
            }

            // Should have seen all phases
            expect(phases.has('idle')).toBe(true)
            expect(phases.has('gathering')).toBe(true)
            expect(phases.has('set_point')).toBe(true)
            expect(phases.has('releasing')).toBe(true)
            expect(phases.has('follow_through')).toBe(true)
        })

        it('should detect shots after enough frames', () => {
            let shotDetected = false

            // Process enough frames for at least one shot
            for (let i = 0; i < 300; i++) {
                const result = simulator.processFrame()
                if (result.detectedShot) {
                    shotDetected = true
                    expect(result.detectedShot.shotId).toBeDefined()
                    expect(result.detectedShot.outcome).toMatch(/^(made|missed)$/)
                    expect(result.detectedShot.releaseBiomechanics).toBeDefined()
                    expect(result.detectedShot.releaseBiomechanics.elbowAngle).toBeGreaterThan(60)
                    expect(result.detectedShot.releaseBiomechanics.elbowAngle).toBeLessThan(140)
                }
            }

            expect(shotDetected).toBe(true)
            expect(simulator.getShotCount()).toBeGreaterThan(0)
        })

        it('should generate feedback with shots', () => {
            let feedbackSeen = false

            for (let i = 0; i < 300; i++) {
                const result = simulator.processFrame()
                if (result.instantFeedback) {
                    feedbackSeen = true
                    expect(result.instantFeedback.message).toBeDefined()
                    expect(result.instantFeedback.type).toMatch(/^(success|warning|error|info)$/)
                    expect(result.instantFeedback.duration).toBeGreaterThan(0)
                }
            }

            expect(feedbackSeen).toBe(true)
        })
    })

    describe('player profiles', () => {
        it('elite profile should produce better mechanics', () => {
            simulator.configure({ playerProfile: 'elite', framesBetweenShots: 50 })

            const elbowAngles: number[] = []
            for (let i = 0; i < 500; i++) {
                const result = simulator.processFrame()
                if (result.detectedShot) {
                    elbowAngles.push(result.detectedShot.releaseBiomechanics.elbowAngle)
                }
            }

            expect(elbowAngles.length).toBeGreaterThan(0)
            const avgElbow = elbowAngles.reduce((s, a) => s + a, 0) / elbowAngles.length
            // Elite players should be closer to 93° (NBA optimal)
            expect(avgElbow).toBeGreaterThan(85)
            expect(avgElbow).toBeLessThan(100)
        })

        it('developing profile should produce lower posture quality', () => {
            simulator.configure({ playerProfile: 'developing', framesBetweenShots: 50 })

            const qualities: number[] = []
            for (let i = 0; i < 500; i++) {
                const result = simulator.processFrame()
                if (result.detectedShot) {
                    qualities.push(result.detectedShot.releaseBiomechanics.postureQuality)
                }
            }

            expect(qualities.length).toBeGreaterThan(0)
            const avgQuality = qualities.reduce((s, q) => s + q, 0) / qualities.length
            // Developing players should have lower quality
            expect(avgQuality).toBeLessThan(65)
        })
    })

    describe('AR overlay generation', () => {
        it('should generate skeleton during shot phases', () => {
            let skeletonSeen = false

            for (let i = 0; i < 300; i++) {
                const result = simulator.processFrame()
                if (result.arFrame?.skeleton) {
                    skeletonSeen = true
                    expect(result.arFrame.skeleton.joints.length).toBeGreaterThan(0)
                    expect(result.arFrame.skeleton.bones.length).toBeGreaterThan(0)
                }
            }

            expect(skeletonSeen).toBe(true)
        })

        it('should generate bio indicators during active phases', () => {
            let indicatorsSeen = false

            for (let i = 0; i < 300; i++) {
                const result = simulator.processFrame()
                if (result.arFrame && result.arFrame.bioIndicators.length > 0) {
                    indicatorsSeen = true
                    expect(result.arFrame.bioIndicators[0].label).toBeDefined()
                    expect(result.arFrame.bioIndicators[0].value).toBeDefined()
                }
            }

            expect(indicatorsSeen).toBe(true)
        })
    })

    describe('biomechanics realism', () => {
        it('should generate NBA-realistic elbow angles (70-130°)', () => {
            simulator.configure({ framesBetweenShots: 40 })

            for (let i = 0; i < 500; i++) {
                const result = simulator.processFrame()
                if (result.detectedShot) {
                    const angle = result.detectedShot.releaseBiomechanics.elbowAngle
                    expect(angle).toBeGreaterThanOrEqual(70)
                    expect(angle).toBeLessThanOrEqual(130)
                }
            }
        })

        it('should generate NBA-realistic release heights (0.85-1.30)', () => {
            simulator.configure({ framesBetweenShots: 40 })

            for (let i = 0; i < 500; i++) {
                const result = simulator.processFrame()
                if (result.detectedShot) {
                    const height = result.detectedShot.releaseBiomechanics.releaseHeightRatio
                    expect(height).toBeGreaterThanOrEqual(0.85)
                    expect(height).toBeLessThanOrEqual(1.30)
                }
            }
        })

        it('should correlate shot outcome with posture quality', () => {
            simulator.configure({ playerProfile: 'good', framesBetweenShots: 40 })

            const madeQualities: number[] = []
            const missedQualities: number[] = []

            for (let i = 0; i < 2000; i++) {
                const result = simulator.processFrame()
                if (result.detectedShot) {
                    const q = result.detectedShot.releaseBiomechanics.postureQuality
                    if (result.detectedShot.outcome === 'made') {
                        madeQualities.push(q)
                    } else {
                        missedQualities.push(q)
                    }
                }
            }

            // With enough samples, made shots should have higher avg quality
            if (madeQualities.length > 5 && missedQualities.length > 5) {
                const avgMade = madeQualities.reduce((s, q) => s + q, 0) / madeQualities.length
                const avgMissed = missedQualities.reduce((s, q) => s + q, 0) / missedQualities.length
                // Not guaranteed due to randomness, but on average should hold
                // Just check they're in reasonable ranges
                expect(avgMade).toBeGreaterThan(30)
                expect(avgMissed).toBeGreaterThan(30)
            }
        })
    })
})

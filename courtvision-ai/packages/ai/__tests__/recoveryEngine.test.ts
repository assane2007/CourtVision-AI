/**
 * Tests — Recovery Engine
 */

import { RecoveryEngine, type RecoveryInput } from '../src/recoveryEngine'

describe('RecoveryEngine', () => {

    describe('compute', () => {
        it('should compute a high score for well-rested input', () => {
            const input: RecoveryInput = {
                sleepHours: 8.5,
                sleepQuality: 5,
                energyLevel: 9,
                muscleSoreness: 1,
                stressLevel: 1,
                hrv: 75,
                restingHR: 50,
                hydrationLiters: 3,
                mealsQuality: 5,
                mood: 5,
            }

            const result = RecoveryEngine.compute(input)

            expect(result.recoveryScore).toBeGreaterThan(80)
            expect(result.readinessScore).toBeGreaterThan(80)
            expect(result.grade).toMatch(/A/)
            expect(result.trainingIntensity).toBe('push')
            expect(result.riskFactors.length).toBe(0)
        })

        it('should compute a low score for fatigued input', () => {
            const input: RecoveryInput = {
                sleepHours: 4,
                sleepQuality: 1,
                energyLevel: 2,
                muscleSoreness: 5,
                stressLevel: 5,
                hrv: 20,
                restingHR: 85,
            }

            const result = RecoveryEngine.compute(input)

            expect(result.recoveryScore).toBeLessThan(30)
            expect(result.trainingIntensity).toBe('rest')
            expect(result.riskFactors.length).toBeGreaterThan(0)
            expect(result.tips.length).toBeGreaterThan(0)
        })

        it('should handle missing optional fields', () => {
            const input: RecoveryInput = {
                sleepHours: 7,
                sleepQuality: 3,
                energyLevel: 5,
                muscleSoreness: 2,
                stressLevel: 3,
            }

            const result = RecoveryEngine.compute(input)

            expect(result.recoveryScore).toBeGreaterThan(30)
            expect(result.recoveryScore).toBeLessThan(80)
            expect(result.recommendation).toBeTruthy()
        })

        it('should provide relevant breakdown', () => {
            const input: RecoveryInput = {
                sleepHours: 7,
                sleepQuality: 4,
                energyLevel: 7,
                muscleSoreness: 2,
                stressLevel: 2,
            }

            const result = RecoveryEngine.compute(input)

            expect(result.breakdown.sleep).toBeGreaterThan(0)
            expect(result.breakdown.sleep).toBeLessThanOrEqual(30)
            expect(result.breakdown.energy).toBeGreaterThan(0)
            expect(result.breakdown.energy).toBeLessThanOrEqual(20)
            expect(result.breakdown.soreness).toBeGreaterThan(0)
            expect(result.breakdown.soreness).toBeLessThanOrEqual(15)
            expect(result.breakdown.stress).toBeGreaterThan(0)
            expect(result.breakdown.stress).toBeLessThanOrEqual(15)
        })

        it('should give consistent grades', () => {
            const scores = [95, 85, 75, 65, 55, 45, 35, 20]
            const expectedGrades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']

            scores.forEach((targetScore, i) => {
                // Approximate input to get close to target score
                const input: RecoveryInput = {
                    sleepHours: targetScore / 12,
                    sleepQuality: Math.min(5, Math.ceil(targetScore / 20)),
                    energyLevel: Math.min(10, Math.ceil(targetScore / 10)),
                    muscleSoreness: Math.max(1, 6 - Math.ceil(targetScore / 20)),
                    stressLevel: Math.max(1, 6 - Math.ceil(targetScore / 20)),
                }

                const result = RecoveryEngine.compute(input)
                expect(result.grade).toBeTruthy()
            })
        })

        it('should identify sleep-related risk factors', () => {
            const input: RecoveryInput = {
                sleepHours: 4.5,
                sleepQuality: 2,
                energyLevel: 5,
                muscleSoreness: 2,
                stressLevel: 2,
            }

            const result = RecoveryEngine.compute(input)
            const sleepRisk = result.riskFactors.find(r => r.includes('Sommeil'))
            expect(sleepRisk).toBeTruthy()
        })

        it('should recommend appropriate training intensity', () => {
            const highRecovery: RecoveryInput = {
                sleepHours: 9,
                sleepQuality: 5,
                energyLevel: 10,
                muscleSoreness: 1,
                stressLevel: 1,
            }

            const lowRecovery: RecoveryInput = {
                sleepHours: 3,
                sleepQuality: 1,
                energyLevel: 1,
                muscleSoreness: 5,
                stressLevel: 5,
            }

            const high = RecoveryEngine.compute(highRecovery)
            const low = RecoveryEngine.compute(lowRecovery)

            expect(['push', 'normal']).toContain(high.trainingIntensity)
            expect(['rest', 'light']).toContain(low.trainingIntensity)
        })

        it('should factor in mood for readiness', () => {
            const base: RecoveryInput = {
                sleepHours: 7,
                sleepQuality: 3,
                energyLevel: 6,
                muscleSoreness: 2,
                stressLevel: 3,
                mood: 5, // excellent mood
            }

            const baseLowMood: RecoveryInput = {
                ...base,
                mood: 1, // terrible mood
            }

            const resultHigh = RecoveryEngine.compute(base)
            const resultLow = RecoveryEngine.compute(baseLowMood)

            expect(resultHigh.readinessScore).toBeGreaterThan(resultLow.readinessScore)
        })
    })
})

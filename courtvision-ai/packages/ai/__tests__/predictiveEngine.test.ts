/**
 * Tests — Predictive Engine
 */

import { PredictiveEngine, type PredictionInput, type HistoricalSession } from '../src/predictiveEngine'

const mockHistory: HistoricalSession[] = [
    {
        date: '2024-01-01',
        type: 'training',
        fgPct: 42,
        mentalScore: 68,
        shotsAttempted: 50,
        fatigueIndex: 30,
        zones: {
            restricted: { attempts: 5, made: 3 },
            paint: { attempts: 5, made: 2 },
            midrange: { attempts: 10, made: 4 },
            corner3: { attempts: 10, made: 4 },
            wing3: { attempts: 10, made: 3 },
            top3: { attempts: 10, made: 4 },
        },
    },
    {
        date: '2024-01-03',
        type: 'training',
        fgPct: 45,
        mentalScore: 72,
        shotsAttempted: 60,
        fatigueIndex: 35,
        zones: {
            restricted: { attempts: 6, made: 4 },
            paint: { attempts: 6, made: 3 },
            midrange: { attempts: 12, made: 5 },
            corner3: { attempts: 12, made: 5 },
            wing3: { attempts: 12, made: 4 },
            top3: { attempts: 12, made: 5 },
        },
    },
    {
        date: '2024-01-05',
        type: 'match',
        fgPct: 38,
        mentalScore: 60,
        shotsAttempted: 40,
        fatigueIndex: 50,
        zones: {
            restricted: { attempts: 4, made: 2 },
            paint: { attempts: 4, made: 1 },
            midrange: { attempts: 8, made: 3 },
            corner3: { attempts: 8, made: 3 },
            wing3: { attempts: 8, made: 2 },
            top3: { attempts: 8, made: 3 },
        },
    },
]

describe('PredictiveEngine', () => {

    describe('predict', () => {
        it('should generate a complete prediction', () => {
            const input: PredictionInput = {
                historicalSessions: mockHistory,
                recoveryScore: 75,
                sleepHours: 7.5,
                sleepQuality: 4,
                energyLevel: 7,
                stressLevel: 2,
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            }

            const prediction = PredictiveEngine.predict(input)

            expect(prediction.predictedFGPct).toBeGreaterThan(20)
            expect(prediction.predictedFGPct).toBeLessThan(80)
            expect(prediction.predictedMentalScore).toBeGreaterThan(20)
            expect(prediction.predictedMentalScore).toBeLessThanOrEqual(100)
            expect(prediction.predictedFatigueOnset).toBeGreaterThan(0)
            expect(prediction.confidence).toBeGreaterThan(0)
            expect(prediction.confidence).toBeLessThanOrEqual(1)
            expect(prediction.sampleSize).toBe(3)
            expect(prediction.readinessScore).toBeGreaterThan(0)
            expect(prediction.readinessGrade).toBeTruthy()
            expect(prediction.preGameTips.length).toBeGreaterThan(0)
        })

        it('should penalize low recovery', () => {
            const highRecovery: PredictionInput = {
                historicalSessions: mockHistory,
                recoveryScore: 90,
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            }

            const lowRecovery: PredictionInput = {
                ...highRecovery,
                recoveryScore: 20,
            }

            const predHigh = PredictiveEngine.predict(highRecovery)
            const predLow = PredictiveEngine.predict(lowRecovery)

            expect(predHigh.predictedFGPct).toBeGreaterThan(predLow.predictedFGPct)
        })

        it('should penalize rust (many days since last session)', () => {
            const fresh: PredictionInput = {
                historicalSessions: mockHistory,
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            }

            const rusty: PredictionInput = {
                ...fresh,
                daysSinceLastSession: 7,
            }

            const predFresh = PredictiveEngine.predict(fresh)
            const predRusty = PredictiveEngine.predict(rusty)

            expect(predFresh.predictedFGPct).toBeGreaterThan(predRusty.predictedFGPct)
        })

        it('should identify risk factors', () => {
            const input: PredictionInput = {
                historicalSessions: mockHistory,
                recoveryScore: 25,
                sleepHours: 4,
                stressLevel: 5,
                daysSinceLastSession: 0,
                dayOfWeek: 3,
                timeOfDay: 'evening',
                sessionType: 'match',
            }

            const prediction = PredictiveEngine.predict(input)
            expect(prediction.riskFactors.length).toBeGreaterThan(0)
        })

        it('should handle empty history', () => {
            const input: PredictionInput = {
                historicalSessions: [],
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            }

            const prediction = PredictiveEngine.predict(input)
            expect(prediction.predictedFGPct).toBeDefined()
            expect(prediction.confidence).toBeLessThanOrEqual(0.1)
        })

        it('should generate zone predictions', () => {
            const input: PredictionInput = {
                historicalSessions: mockHistory,
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            }

            const prediction = PredictiveEngine.predict(input)

            expect(prediction.zonePredictions.restricted).toBeDefined()
            expect(prediction.zonePredictions.midrange).toBeDefined()
            expect(prediction.zonePredictions.top3).toBeDefined()

            for (const zone of Object.values(prediction.zonePredictions)) {
                expect(zone.predictedPct).toBeGreaterThanOrEqual(0)
                expect(zone.confidence).toBeGreaterThanOrEqual(0)
                expect(['attack', 'moderate', 'avoid']).toContain(zone.recommendation)
            }
        })
    })

    describe('validatePrediction', () => {
        it('should compute accuracy of a prediction', () => {
            const prediction = PredictiveEngine.predict({
                historicalSessions: mockHistory,
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            })

            const accuracy = PredictiveEngine.validatePrediction(prediction, {
                fgPct: prediction.predictedFGPct,
                mentalScore: prediction.predictedMentalScore,
            })

            // Perfect prediction = 100% accuracy
            expect(accuracy).toBe(100)
        })

        it('should reduce accuracy for large errors', () => {
            const prediction = PredictiveEngine.predict({
                historicalSessions: mockHistory,
                daysSinceLastSession: 1,
                dayOfWeek: 3,
                timeOfDay: 'afternoon',
                sessionType: 'training',
            })

            const accuracy = PredictiveEngine.validatePrediction(prediction, {
                fgPct: prediction.predictedFGPct + 30,
                mentalScore: prediction.predictedMentalScore - 30,
            })

            expect(accuracy).toBeLessThan(70)
        })
    })
})

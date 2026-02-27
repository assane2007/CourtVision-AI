/**
 * Tests — Smart Training Engine
 */

import { SmartTrainingEngine, type TrainingPlanRequest } from '../src/smartTraining'

describe('SmartTrainingEngine', () => {

    const baseRequest: TrainingPlanRequest = {
        userId: 'test-user-123',
        position: 'SG',
        overallRating: 72,
        weaknesses: ['corner3_pct', 'mental_resilience'],
        goals: ['Améliorer mon 3pts corner', 'Être plus clutch'],
        recoveryScore: 75,
        fatigueLevel: 30,
        worstZones: ['corner3', 'wing3'],
        bestZones: ['midrange', 'paint'],
        avgShootingPct: 42,
        avgMentalScore: 65,
        availableDays: 5,
        sessionDurationMin: 60,
        hasGym: false,
        hasCourt: true,
        planType: 'weekly',
    }

    describe('generatePlan', () => {
        it('should generate a complete training plan', () => {
            const plan = SmartTrainingEngine.generatePlan(baseRequest)

            expect(plan.name).toBeTruthy()
            expect(plan.objective).toBeTruthy()
            expect(plan.planType).toBe('weekly')
            expect(plan.days.length).toBeGreaterThan(0)
            expect(plan.days.length).toBeLessThanOrEqual(baseRequest.availableDays)
            expect(plan.difficultyLevel).toBeGreaterThanOrEqual(1)
            expect(plan.difficultyLevel).toBeLessThanOrEqual(10)
            expect(plan.totalDurationMin).toBeGreaterThan(0)
            expect(plan.generatedBy).toBe('algorithmic')
        })

        it('should include warmup and cooldown for each day', () => {
            const plan = SmartTrainingEngine.generatePlan(baseRequest)

            for (const day of plan.days) {
                expect(day.warmup).toBeDefined()
                expect(day.warmup.name).toBeTruthy()
                expect(day.cooldown).toBeDefined()
                expect(day.cooldown.name).toBeTruthy()
                expect(day.drills.length).toBeGreaterThan(0)
            }
        })

        it('should respect session duration constraints', () => {
            const plan = SmartTrainingEngine.generatePlan(baseRequest)

            for (const day of plan.days) {
                // Each day's total duration should be reasonable
                expect(day.totalDurationMin).toBeGreaterThan(0)
                expect(day.totalDurationMin).toBeLessThanOrEqual(120) // max 2 hours
            }
        })

        it('should focus on weakness zones', () => {
            const plan = SmartTrainingEngine.generatePlan(baseRequest)

            // At least one drill should target the weak zones
            const allDrills = plan.days.flatMap(d => d.drills)
            const drillNames = allDrills.map(d => d.name.toLowerCase())

            // Should have some shooting drills
            const shootingDrills = allDrills.filter(d =>
                d.name.toLowerCase().includes('corner') ||
                d.name.toLowerCase().includes('wing') ||
                d.name.toLowerCase().includes('3') ||
                d.name.toLowerCase().includes('shoot') ||
                d.name.toLowerCase().includes('tir')
            )
            expect(shootingDrills.length).toBeGreaterThan(0)
        })

        it('should adjust difficulty for low recovery', () => {
            const lowRecoveryRequest: TrainingPlanRequest = {
                ...baseRequest,
                recoveryScore: 25,
                fatigueLevel: 80,
                planType: 'deload',
            }

            const plan = SmartTrainingEngine.generatePlan(lowRecoveryRequest)

            // Deload plan should be lighter
            expect(plan.difficultyLevel).toBeLessThanOrEqual(5)
        })

        it('should generate different plan types', () => {
            const types: TrainingPlanRequest['planType'][] = ['weekly', 'micro_cycle', 'deload', 'peaking']

            for (const planType of types) {
                const request = { ...baseRequest, planType }
                const plan = SmartTrainingEngine.generatePlan(request)
                expect(plan.planType).toBe(planType)
                expect(plan.days.length).toBeGreaterThan(0)
            }
        })

        it('should include mental exercises for low mental scores', () => {
            const lowMentalRequest: TrainingPlanRequest = {
                ...baseRequest,
                avgMentalScore: 40,
            }

            const plan = SmartTrainingEngine.generatePlan(lowMentalRequest)
            const allDrills = plan.days.flatMap(d => [
                ...d.drills,
                ...(d.mentalExercise ? [d.mentalExercise] : []),
            ])

            // Should include some mental-related content
            const hasMental = plan.days.some(d =>
                d.mentalExercise ||
                d.drills.some(drill =>
                    drill.name.toLowerCase().includes('mental') ||
                    drill.name.toLowerCase().includes('breathing') ||
                    drill.name.toLowerCase().includes('visualis')
                )
            )
            expect(hasMental).toBe(true)
        })
    })

    describe('adaptPlan', () => {
        it('should adapt a plan based on new performance data', () => {
            const plan = SmartTrainingEngine.generatePlan(baseRequest)
            const adapted = SmartTrainingEngine.adaptPlan(plan, 40, {
                fgPct: 55,
                mentalScore: 80,
            })

            // Should have adaptations recorded
            expect(adapted).toBeDefined()
            expect(adapted.days.length).toBeGreaterThan(0)
        })
    })
})

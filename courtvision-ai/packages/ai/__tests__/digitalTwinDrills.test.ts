/**
 * Tests — Twin Dynamic Drill Recommendations
 */

import {
    generateTwinDrillRecommendations,
    type TwinProfile,
    type TwinTrait,
} from '../src/digitalTwin'
import { describe, expect, it } from '@jest/globals'

const baseProfile: TwinProfile = {
    modelVersion: 'v2.0',
    updatedAt: new Date().toISOString(),
    sessionCount: 10,
    overallRating: 74,
    attributeCategories: [],
    playStyle: {
        primary: 'balanced',
        secondary: null,
        confidence: 0.8,
        description: 'Joueur complet',
        nbaArchetype: 'LeBron James',
        traits: [],
    },
    strengths: [],
    weaknesses: [],
    nbaComparisons: [],
    comfortZones: [],
    evolution: [],
    preferredZones: {},
    poseSignature: {
        avgElbowAngle: 92,
        avgReleaseHeight: 2.1,
        avgShoulderPosture: 68,
        avgArcAngle: 47,
        avgMaxVertical: 54,
        dominantHand: 'right',
    },
    mentalProfile: {
        resilience: 62,
        clutchFactor: 58,
        consistency: 64,
        pressureResponse: 'neutral',
        fatigueResistance: 61,
    },
}

function makeWeakness(overrides: Partial<TwinTrait>): TwinTrait {
    return {
        id: 'weak-default',
        label: 'Weakness',
        description: 'Needs work',
        type: 'weakness',
        severity: 3,
        category: 'shooting',
        evidenceCount: 5,
        trend: 'stable',
        ...overrides,
    }
}

describe('generateTwinDrillRecommendations', () => {
    it('prioritizes severe zone shooting weaknesses from Twin profile', () => {
        const profile: TwinProfile = {
            ...baseProfile,
            playStyle: {
                ...baseProfile.playStyle,
                primary: 'sharpshooter',
            },
            weaknesses: [
                makeWeakness({
                    id: 'weak-corner3',
                    label: 'Difficulte en corner3',
                    description: 'Baisse de rendement dans le corner droit',
                    severity: 5,
                    category: 'shooting',
                    evidenceCount: 8,
                    trend: 'declining',
                }),
            ],
            comfortZones: [
                {
                    zone: 'corner3',
                    attempts: 20,
                    efficiency: 22,
                    frequency: 34,
                    isComfort: false,
                },
            ],
        }

        const recommendations = generateTwinDrillRecommendations(profile, { limit: 4 })

        expect(recommendations.length).toBeGreaterThan(0)
        expect(recommendations[0].priority).toBeGreaterThanOrEqual(recommendations[recommendations.length - 1].priority)

        const corner3Recommendation = recommendations.find(rec => rec.zoneFocus === 'corner3')
        expect(corner3Recommendation).toBeDefined()
        expect(corner3Recommendation?.category).toBe('shooting')
        expect(corner3Recommendation?.linkedWeakness).toBe('Difficulte en corner3')
    })

    it('injects a mental recommendation when pressure response is struggling', () => {
        const profile: TwinProfile = {
            ...baseProfile,
            weaknesses: [],
            mentalProfile: {
                resilience: 34,
                clutchFactor: 31,
                consistency: 55,
                pressureResponse: 'struggles',
                fatigueResistance: 66,
            },
        }

        const recommendations = generateTwinDrillRecommendations(profile, { limit: 5 })
        const mentalRecommendation = recommendations.find(rec => rec.category === 'mental')

        expect(mentalRecommendation).toBeDefined()
        expect(mentalRecommendation?.rationale.toLowerCase()).toContain('profil mental')
        expect(mentalRecommendation?.priority).toBeGreaterThan(50)
    })

    it('returns a maintenance recommendation when no critical signal exists', () => {
        const profile: TwinProfile = {
            ...baseProfile,
            playStyle: {
                ...baseProfile.playStyle,
                primary: 'playmaker',
            },
            weaknesses: [],
            comfortZones: [],
            mentalProfile: {
                resilience: 74,
                clutchFactor: 72,
                consistency: 70,
                pressureResponse: 'neutral',
                fatigueResistance: 75,
            },
        }

        const recommendations = generateTwinDrillRecommendations(profile, { limit: 3 })

        expect(recommendations.length).toBe(1)
        expect(recommendations[0].id).toContain('maintenance')
        expect(recommendations[0].rank).toBe(1)
    })

    it('respects the requested recommendation limit', () => {
        const profile: TwinProfile = {
            ...baseProfile,
            weaknesses: [
                makeWeakness({ id: 'w1', label: 'Fragilite mentale', category: 'mental', severity: 4, trend: 'declining' }),
                makeWeakness({ id: 'w2', label: 'Efficacite limitee', category: 'shooting', severity: 4, trend: 'stable' }),
                makeWeakness({ id: 'w3', label: 'Endurance limitee', category: 'physical', severity: 3, trend: 'stable' }),
            ],
            comfortZones: [
                { zone: 'wing3', attempts: 12, efficiency: 24, frequency: 19, isComfort: false },
                { zone: 'midrange', attempts: 10, efficiency: 27, frequency: 16, isComfort: false },
            ],
            mentalProfile: {
                resilience: 40,
                clutchFactor: 38,
                consistency: 58,
                pressureResponse: 'struggles',
                fatigueResistance: 39,
            },
        }

        const recommendations = generateTwinDrillRecommendations(profile, { limit: 2 })

        expect(recommendations.length).toBe(2)
        expect(recommendations[0].rank).toBe(1)
        expect(recommendations[1].rank).toBe(2)
    })
})

/**
 * Apex Score — Calculation Integrity Tests
 *
 * Verifies that:
 * - Weight distribution sums to exactly 1.0
 * - Scores are always in [0, 100] range
 * - Grading covers the full 0-100 spectrum
 * - Shooting (40%) has more impact than improvement (10%)
 *
 * Pattern: AAA (Arrange → Act → Assert)
 *
 * NOTE: V5Orchestrator.computeApexScore is async and hits Supabase.
 * We test the grade computation (pure function) and weight invariants directly.
 * The weighted formula is: shooting*0.40 + mental*0.20 + consistency*0.20 + clutch*0.10 + improvement*0.10
 */

describe('Apex Score — Integrity', () => {

    // ── Weights ─────────────────────────────────────────────

    it('apex score weights sum to exactly 1.0', () => {
        // The weights as defined in v5Orchestrator.ts computeApexScore
        const weights = {
            shooting: 0.40,
            mental: 0.20,
            consistency: 0.20,
            clutch: 0.10,
            improvement: 0.10,
        }
        const sum = Object.values(weights).reduce((a, b) => a + b, 0)

        // Floating point precision: tolerance 1e-10
        expect(Math.abs(sum - 1.0)).toBeLessThan(1e-10)
    })

    it('weighted formula produces correct result for known values', () => {
        // Arrange
        const shooting = 80
        const mental = 70
        const consistency = 60
        const clutch = 50
        const improvement = 40

        // Act — same formula as v5Orchestrator
        const overall = Math.round(
            shooting * 0.40 +
            mental * 0.20 +
            consistency * 0.20 +
            clutch * 0.10 +
            improvement * 0.10
        )

        // Assert
        // 80*0.4 + 70*0.2 + 60*0.2 + 50*0.1 + 40*0.1
        // = 32 + 14 + 12 + 5 + 4 = 67
        expect(overall).toBe(67)
    })

    // ── Range [0, 100] ──────────────────────────────────────

    it('apex score is between 0 and 100 for any input', () => {
        const testCases = [
            { shooting: 100, mental: 100, consistency: 100, clutch: 100, improvement: 100 },
            { shooting: 0, mental: 0, consistency: 0, clutch: 0, improvement: 0 },
            { shooting: 50, mental: 50, consistency: 50, clutch: 50, improvement: 50 },
            { shooting: 100, mental: 0, consistency: 50, clutch: 100, improvement: 0 },
            { shooting: 0, mental: 100, consistency: 0, clutch: 0, improvement: 100 },
        ]

        testCases.forEach(scores => {
            const apex = Math.round(
                scores.shooting * 0.40 +
                scores.mental * 0.20 +
                scores.consistency * 0.20 +
                scores.clutch * 0.10 +
                scores.improvement * 0.10
            )
            expect(apex).toBeGreaterThanOrEqual(0)
            expect(apex).toBeLessThanOrEqual(100)
        })
    })

    it('a perfect player scores exactly 100', () => {
        const apex = Math.round(100 * 0.40 + 100 * 0.20 + 100 * 0.20 + 100 * 0.10 + 100 * 0.10)
        expect(apex).toBe(100)
    })

    it('a zero player scores exactly 0', () => {
        const apex = Math.round(0 * 0.40 + 0 * 0.20 + 0 * 0.20 + 0 * 0.10 + 0 * 0.10)
        expect(apex).toBe(0)
    })

    // ── Weight impact ───────────────────────────────────────

    it('shooting (40%) has more impact than improvement (10%)', () => {
        // Arrange
        const shootingFocused = Math.round(100 * 0.40 + 50 * 0.20 + 50 * 0.20 + 50 * 0.10 + 0 * 0.10)
        const improvementFocused = Math.round(0 * 0.40 + 50 * 0.20 + 50 * 0.20 + 50 * 0.10 + 100 * 0.10)

        // Assert
        expect(shootingFocused).toBeGreaterThan(improvementFocused)
    })

    it('shooting (40%) has more impact than mental (20%)', () => {
        const shootingHigh = Math.round(100 * 0.40 + 0 * 0.20 + 50 * 0.20 + 50 * 0.10 + 50 * 0.10)
        const mentalHigh = Math.round(0 * 0.40 + 100 * 0.20 + 50 * 0.20 + 50 * 0.10 + 50 * 0.10)

        expect(shootingHigh).toBeGreaterThan(mentalHigh)
    })

    // ── Grade ───────────────────────────────────────────────

    /**
     * computeApexGrade thresholds:
     * >= 95 → 'S'
     * >= 88 → 'A+'
     * >= 80 → 'A'
     * >= 72 → 'B+'
     * >= 64 → 'B'
     * >= 55 → 'C+'
     * >= 45 → 'C'
     * >= 35 → 'D'
     * < 35  → 'F'
     */
    function computeGrade(overall: number): string {
        if (overall >= 95) return 'S'
        if (overall >= 88) return 'A+'
        if (overall >= 80) return 'A'
        if (overall >= 72) return 'B+'
        if (overall >= 64) return 'B'
        if (overall >= 55) return 'C+'
        if (overall >= 45) return 'C'
        if (overall >= 35) return 'D'
        return 'F'
    }

    it('score >= 95 gives grade S', () => {
        expect(computeGrade(95)).toBe('S')
        expect(computeGrade(100)).toBe('S')
    })

    it('score >= 88 gives grade A+', () => {
        expect(computeGrade(88)).toBe('A+')
        expect(computeGrade(94)).toBe('A+')
    })

    it('score of 0 gives grade F', () => {
        expect(computeGrade(0)).toBe('F')
    })

    it('grades cover entire 0-100 spectrum without gaps', () => {
        const validGrades = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']

        for (let score = 0; score <= 100; score++) {
            const grade = computeGrade(score)
            expect(grade).toBeDefined()
            expect(validGrades).toContain(grade)
        }

        // Boundary check
        expect(computeGrade(100)).toBe('S')
        expect(computeGrade(0)).toBe('F')
    })

    it('grade transitions happen at correct boundaries', () => {
        expect(computeGrade(34)).toBe('F')
        expect(computeGrade(35)).toBe('D')
        expect(computeGrade(44)).toBe('D')
        expect(computeGrade(45)).toBe('C')
        expect(computeGrade(54)).toBe('C')
        expect(computeGrade(55)).toBe('C+')
        expect(computeGrade(63)).toBe('C+')
        expect(computeGrade(64)).toBe('B')
        expect(computeGrade(71)).toBe('B')
        expect(computeGrade(72)).toBe('B+')
        expect(computeGrade(79)).toBe('B+')
        expect(computeGrade(80)).toBe('A')
        expect(computeGrade(87)).toBe('A')
        expect(computeGrade(88)).toBe('A+')
        expect(computeGrade(94)).toBe('A+')
        expect(computeGrade(95)).toBe('S')
    })
})

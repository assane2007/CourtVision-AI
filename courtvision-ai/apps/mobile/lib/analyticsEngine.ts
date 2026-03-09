/**
 * AnalyticsEngine — Basketball data-science on-device analytics.
 *
 * Statistical methods running purely on the phone:
 *   1. Welch's t-test + Benjamini-Hochberg FDR + Mann-Whitney U fallback
 *   2. Pearson & Spearman correlation with Fisher z-transform CIs
 *   3. Fatigue curve modelling (within-session accuracy decay)
 *   4. Zone-specific progression tracking
 *   5. Hot-hand / streak detection (Wald–Wolfowitz runs test)
 *   6. Exponential-weighted moving average projections
 *   7. Causal impact estimation (before/after mechanic shifts)
 *   8. Shot distribution analysis (variance, skewness, percentiles)
 *   9. Shot selection efficiency (expected points per zone)
 *  10. Clutch performance analysis (late-session pressure)
 *  11. Session-to-session consistency profiling (CV + stability)
 *  12. Mechanic clustering (k-means on shot biomechanics)
 *
 * No external dependencies beyond SessionStorageService types.
 */

import type { StoredSession, StoredShot, SessionHistoryItem } from './sessionStorage'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface ConfidenceInterval {
    mean: number
    lower: number
    upper: number
    /** 0–1, significance level (0.05 = 95% confidence) */
    alpha: number
}

export interface SignificanceTest {
    metric: string
    periodA: { label: string; mean: number; stdDev: number; n: number }
    periodB: { label: string; mean: number; stdDev: number; n: number }
    tStatistic: number
    pValue: number
    /** p-value after Benjamini-Hochberg FDR correction */
    adjustedPValue: number
    significant: boolean
    effectSize: number // Cohen's d
    direction: 'improved' | 'declined' | 'unchanged'
    /** Mann-Whitney U p-value (non-parametric fallback for small n) */
    mannWhitneyP?: number
    /** Which test was used to determine significance */
    testUsed: 'welch-t' | 'mann-whitney'
}

export interface CorrelationResult {
    metricA: string
    metricB: string
    r: number          // Pearson r (−1 to +1)
    rSquared: number   // coefficient of determination
    pValue: number
    significant: boolean
    interpretation: string
    spearmanRho?: number  // rank correlation (robust to non-linearity)
    fisherCI?: { lower: number; upper: number } // 95% CI via Fisher z-transform
}

export interface FatigueCurve {
    sessionId: string
    quartiles: Array<{
        label: string
        shotCount: number
        fgPct: number
        avgElbow: number
        avgRelease: number
        avgPosture: number
    }>
    fatigueIndex: number      // 0–100, 0 = no fatigue, 100 = collapsed
    dropOffPoint: number | null // quartile index where accuracy drops > 5%
}

export interface ZoneProgression {
    zone: string
    periods: Array<{
        label: string
        attempts: number
        made: number
        fgPct: number
    }>
    trend: 'improving' | 'declining' | 'stable'
    bestPeriod: string
    totalAttempts: number
}

export interface HotHandResult {
    sessionId: string
    longestMadeStreak: number
    longestMissStreak: number
    runsTestZ: number
    runsTestP: number
    isStreaky: boolean // true = non-random pattern detected
    streakiness: 'hot-hand' | 'cold-streaks' | 'random'
    clusterRatio: number // >1 = more clustering than random
}

export interface EWMAProjection {
    metric: string
    currentValue: number
    projected2w: number
    projected4w: number
    confidence: ConfidenceInterval
    momentum: number // positive = accelerating, negative = decelerating
    trendStrength: number // 0–1
}

export interface CausalImpact {
    trigger: string
    triggerDate: string
    metric: string
    beforeMean: number
    afterMean: number
    lift: number     // percentage change
    pValue: number
    significant: boolean
    explanation: string
}

export interface ShotDistribution {
    metric: string
    n: number
    mean: number
    median: number
    stdDev: number
    variance: number
    skewness: number
    kurtosis: number
    percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number }
    isNormal: boolean
    interpretation: string
}

export interface ShotSelectionResult {
    zone: string
    attempts: number
    makes: number
    fgPct: number
    /** Points per zone: 3 for 3pt zones, 2 otherwise */
    pointValue: number
    /** Expected points per attempt = fgPct/100 × pointValue */
    expectedPoints: number
    /** Volume share (% of total shots) */
    volumeShare: number
    efficiency: 'elite' | 'good' | 'average' | 'poor'
}

export interface ClutchResult {
    sessionId: string
    earlyFG: number
    lateFG: number
    clutchDelta: number     // lateFG - earlyFG (positive = clutch)
    earlyMechanics: { elbow: number; release: number; posture: number }
    lateMechanics: { elbow: number; release: number; posture: number }
    isClutch: boolean       // positive delta beyond threshold
    label: 'clutch' | 'neutral' | 'choke'
}

export interface ConsistencyProfile {
    metric: string
    sessionMeans: number[]   // per-session averages
    overallMean: number
    overallCV: number        // coefficient of variation (%)
    stability: 'locked-in' | 'consistent' | 'variable' | 'erratic'
    bestSession: { index: number; value: number }
    worstSession: { index: number; value: number }
    trend: 'improving' | 'declining' | 'stable'
}

export interface MechanicCluster {
    clusterId: number
    centroid: { elbow: number; release: number; posture: number; height: number }
    shotCount: number
    fgPct: number
    label: string            // auto-generated description
    isOptimal: boolean       // highest FG% cluster
}

export interface FullAnalyticsReport {
    generatedAt: string
    sessionsAnalyzed: number
    shotsAnalyzed: number
    significance: SignificanceTest[]
    correlations: CorrelationResult[]
    fatigueCurves: FatigueCurve[]
    zoneProgression: ZoneProgression[]
    hotHand: HotHandResult[]
    projections: EWMAProjection[]
    causalImpacts: CausalImpact[]
    distributions: ShotDistribution[]
    shotSelection: ShotSelectionResult[]
    clutch: ClutchResult[]
    consistencyProfile: ConsistencyProfile[]
    mechanicClusters: MechanicCluster[]
}

// ══════════════════════════════════════════════════════════════
// Statistical Primitives
// ══════════════════════════════════════════════════════════════

function mean(arr: number[]): number {
    if (arr.length === 0) return 0
    const result = arr.reduce((a, b) => a + b, 0) / arr.length
    return isFinite(result) ? result : 0
}

function variance(arr: number[]): number {
    if (arr.length < 2) return 0
    const m = mean(arr)
    const result = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1) // Bessel's correction
    return isFinite(result) ? result : 0
}

function stdDev(arr: number[]): number {
    return Math.sqrt(variance(arr))
}

function median(arr: number[]): number {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const k = Math.max(0, Math.min(1, p / 100)) * (sorted.length - 1)
    const f = Math.floor(k)
    const c = Math.ceil(k)
    if (f === c) return sorted[f]
    return sorted[f] + (k - f) * (sorted[c] - sorted[f])
}

function skewness(arr: number[]): number {
    if (arr.length < 3) return 0
    const m = mean(arr)
    const s = stdDev(arr)
    if (s === 0) return 0
    const n = arr.length
    return (n / ((n - 1) * (n - 2))) * arr.reduce((sum, v) => sum + ((v - m) / s) ** 3, 0)
}

function kurtosis(arr: number[]): number {
    if (arr.length < 4) return 0
    const m = mean(arr)
    const s = stdDev(arr)
    if (s === 0) return 0
    const n = arr.length
    const excess = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) *
        arr.reduce((sum, v) => sum + ((v - m) / s) ** 4, 0) -
        (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
    return excess
}

/**
 * Welch's t-test — compares two independent samples with unequal variance.
 * Returns t-statistic and approximate p-value using Welch–Satterthwaite df.
 */
function welchTTest(a: number[], b: number[]): { t: number; df: number; p: number } {
    const nA = a.length, nB = b.length
    if (nA < 2 || nB < 2) return { t: 0, df: 0, p: 1 }

    const mA = mean(a), mB = mean(b)
    const vA = variance(a), vB = variance(b)
    const seA = vA / nA, seB = vB / nB
    const se = Math.sqrt(seA + seB)

    if (se === 0) return { t: 0, df: nA + nB - 2, p: 1 }

    const t = (mA - mB) / se

    // Welch–Satterthwaite degrees of freedom
    const df = (seA + seB) ** 2 / (seA ** 2 / (nA - 1) + seB ** 2 / (nB - 1))

    // Approximate two-tailed p-value using Student's t CDF approximation
    const p = tDistPValue(Math.abs(t), df)

    return { t, df, p }
}

/**
 * Approximate two-tailed p-value for Student's t-distribution.
 * Uses the Abramowitz & Stegun approximation (adequate for our use case).
 */
function tDistPValue(t: number, df: number): number {
    if (df <= 0) return 1
    const x = df / (df + t * t)
    // Regularized incomplete beta function approximation
    const p = incompleteBeta(df / 2, 0.5, x)
    return Math.min(1, Math.max(0, p))
}

/** Regularized incomplete beta function — series approximation */
function incompleteBeta(a: number, b: number, x: number): number {
    if (x <= 0) return 0
    if (x >= 1) return 1
    // Use continued fraction representation (Lentz's method)
    const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b)
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a

    // Simple series expansion for small x
    let sum = 1
    let term = 1
    for (let n = 1; n <= 200; n++) {
        term *= (n - b) * x / (a + n)
        sum += term
        if (Math.abs(term) < 1e-10) break
    }
    return Math.min(1, front * sum)
}

/** Log-gamma function (Lanczos approximation) */
function gammaLn(x: number): number {
    if (x <= 0) return 0
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.001208650973866179, -0.000005395239384953]
    let y = x
    let tmp = x + 5.5
    tmp -= (x + 0.5) * Math.log(tmp)
    let ser = 1.000000000190015
    for (let j = 0; j < 6; j++) {
        ser += c[j] / ++y
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x)
}

/**
 * Pearson correlation coefficient with significance test.
 */
function pearsonCorrelation(x: number[], y: number[]): { r: number; p: number } {
    const n = Math.min(x.length, y.length)
    if (n < 3) return { r: 0, p: 1 }

    const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n))
    let num = 0, denX = 0, denY = 0

    for (let i = 0; i < n; i++) {
        const dx = x[i] - mx, dy = y[i] - my
        num += dx * dy
        denX += dx * dx
        denY += dy * dy
    }

    const den = Math.sqrt(denX * denY)
    if (den === 0) return { r: 0, p: 1 }

    const r = num / den
    // t-test for significance of r
    const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10))
    const p = tDistPValue(Math.abs(t), n - 2)

    return { r, p }
}

/**
 * Wald–Wolfowitz runs test — tests whether a binary sequence is random.
 * Returns z-score and p-value.
 */
function runsTest(sequence: boolean[]): { z: number; p: number; runs: number } {
    if (sequence.length < 10) return { z: 0, p: 1, runs: 0 }

    const n1 = sequence.filter(v => v).length
    const n2 = sequence.length - n1
    if (n1 === 0 || n2 === 0) return { z: 0, p: 1, runs: 1 }

    // Count runs
    let runs = 1
    for (let i = 1; i < sequence.length; i++) {
        if (sequence[i] !== sequence[i - 1]) runs++
    }

    // Expected runs and variance under null hypothesis (random)
    const n = sequence.length
    const expectedRuns = 1 + (2 * n1 * n2) / n
    const varianceRuns = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1))

    if (varianceRuns <= 0) return { z: 0, p: 1, runs }

    const z = (runs - expectedRuns) / Math.sqrt(varianceRuns)
    // Approximate p from z using normal CDF
    const p = 2 * (1 - normalCDF(Math.abs(z)))

    return { z, p, runs }
}

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
    const sign = z < 0 ? -1 : 1
    z = Math.abs(z) / Math.sqrt(2)
    const t = 1 / (1 + p * z)
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)
    return 0.5 * (1 + sign * y)
}

/**
 * Exponentially weighted moving average with decay factor.
 */
function ewma(values: number[], alpha: number = 0.3): number[] {
    if (values.length === 0) return []
    const result = [values[0]]
    for (let i = 1; i < values.length; i++) {
        result.push(alpha * values[i] + (1 - alpha) * result[i - 1])
    }
    return result
}

/**
 * Mann-Whitney U test — non-parametric alternative to t-test.
 * Compares two independent samples without assuming normality.
 * Returns approximate p-value via normal approximation (valid for n >= 8).
 */
function mannWhitneyU(a: number[], b: number[]): { U: number; z: number; p: number } {
    const nA = a.length, nB = b.length
    if (nA < 2 || nB < 2) return { U: 0, z: 0, p: 1 }

    // Rank all values together
    const combined: Array<{ value: number; group: 'a' | 'b' }> = [
        ...a.map(v => ({ value: v, group: 'a' as const })),
        ...b.map(v => ({ value: v, group: 'b' as const })),
    ]
    combined.sort((x, y) => x.value - y.value)

    // Assign ranks with tie correction
    const ranks = new Array(combined.length)
    let i = 0
    while (i < combined.length) {
        let j = i
        while (j < combined.length && combined[j].value === combined[i].value) j++
        const avgRank = (i + 1 + j) / 2 // average rank for ties
        for (let k = i; k < j; k++) ranks[k] = avgRank
        i = j
    }

    // Sum ranks for group A
    let rankSumA = 0
    for (let k = 0; k < combined.length; k++) {
        if (combined[k].group === 'a') rankSumA += ranks[k]
    }

    const U_A = rankSumA - (nA * (nA + 1)) / 2
    const U_B = nA * nB - U_A
    const U = Math.min(U_A, U_B)

    // Normal approximation with tie correction
    const n = nA + nB
    const meanU = (nA * nB) / 2

    // Tie correction factor
    let tieCorrection = 0
    let idx = 0
    while (idx < combined.length) {
        let end = idx
        while (end < combined.length && combined[end].value === combined[idx].value) end++
        const tieSize = end - idx
        if (tieSize > 1) tieCorrection += tieSize ** 3 - tieSize
        idx = end
    }
    const varU = (nA * nB / 12) * ((n + 1) - tieCorrection / (n * (n - 1)))

    if (varU <= 0) return { U, z: 0, p: 1 }

    const z = (U - meanU) / Math.sqrt(varU)
    const p = 2 * (1 - normalCDF(Math.abs(z)))

    return { U, z, p }
}

/**
 * Spearman rank correlation — robust to non-linear monotonic relationships.
 * Converts values to ranks, then computes Pearson on the ranks.
 */
function spearmanCorrelation(x: number[], y: number[]): { rho: number; p: number } {
    const n = Math.min(x.length, y.length)
    if (n < 3) return { rho: 0, p: 1 }

    const rankX = assignRanks(x.slice(0, n))
    const rankY = assignRanks(y.slice(0, n))

    return { rho: pearsonCorrelation(rankX, rankY).r, p: pearsonCorrelation(rankX, rankY).p }
}

/** Assign average ranks to an array (1-based), handling ties */
function assignRanks(arr: number[]): number[] {
    const indexed = arr.map((v, i) => ({ v, i }))
    indexed.sort((a, b) => a.v - b.v)
    const ranks = new Array(arr.length)
    let i = 0
    while (i < indexed.length) {
        let j = i
        while (j < indexed.length && indexed[j].v === indexed[i].v) j++
        const avgRank = (i + 1 + j) / 2
        for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank
        i = j
    }
    return ranks
}

/**
 * Fisher z-transform — converts Pearson r to z-space for CI computation.
 * Returns 95% CI bounds on r.
 */
function fisherZConfidence(r: number, n: number): { lower: number; upper: number } {
    if (n < 4) return { lower: -1, upper: 1 }
    const z = Math.atanh(Math.max(-0.999, Math.min(0.999, r)))
    const se = 1 / Math.sqrt(n - 3)
    const zLower = z - 1.96 * se
    const zUpper = z + 1.96 * se
    return {
        lower: Math.round(Math.tanh(zLower) * 1000) / 1000,
        upper: Math.round(Math.tanh(zUpper) * 1000) / 1000,
    }
}

/**
 * Benjamini-Hochberg FDR correction — adjusts p-values for multiple comparisons.
 * Controls the false discovery rate at level q (default 0.05).
 */
function benjaminiHochberg(pValues: number[], q: number = 0.05): number[] {
    const n = pValues.length
    if (n === 0) return []

    // Sort indices by p-value
    const indices = Array.from({ length: n }, (_, i) => i)
    indices.sort((a, b) => pValues[a] - pValues[b])

    const adjusted = new Array(n)
    let cumMin = 1

    // Walk backwards: adjusted_p[i] = min(p[i] * n / rank, cumMin)
    for (let rank = n; rank >= 1; rank--) {
        const idx = indices[rank - 1]
        const adj = Math.min(1, pValues[idx] * n / rank)
        cumMin = Math.min(cumMin, adj)
        adjusted[idx] = cumMin
    }
    return adjusted
}

// ══════════════════════════════════════════════════════════════
// Analysis Functions
// ══════════════════════════════════════════════════════════════

/**
 * 1. Significance Testing — Are recent changes real or noise?
 *    Uses Welch's t-test for n >= 10 per group, Mann-Whitney U for smaller samples.
 *    Applies Benjamini-Hochberg FDR correction to control false positives across 6 metrics.
 */
export function analyzeSignificance(sessions: SessionHistoryItem[]): SignificanceTest[] {
    if (sessions.length < 6) return []

    const mid = Math.floor(sessions.length / 2)
    const recent = sessions.slice(0, mid)   // newer
    const earlier = sessions.slice(mid)      // older

    const metrics: Array<{ key: string; extract: (s: SessionHistoryItem) => number }> = [
        { key: 'FG%', extract: s => s.shootingPct },
        { key: 'Posture Quality', extract: s => s.avgPostureQuality },
        { key: 'Consistency', extract: s => s.mechanicConsistency },
        { key: 'Elbow Angle', extract: s => s.avgElbowAngle },
        { key: 'Release Time', extract: s => s.avgReleaseTime },
        { key: 'Follow-Through', extract: s => s.followThroughPct },
    ]

    const rawResults: Array<SignificanceTest & { _rawP: number }> = []

    for (const m of metrics) {
        const a = recent.map(m.extract)
        const b = earlier.map(m.extract)
        const mA = mean(a), mB = mean(b)
        const sA = stdDev(a), sB = stdDev(b)

        // Parametric test
        const { t, p: welchP } = welchTTest(a, b)
        // Non-parametric fallback
        const { p: mwP } = mannWhitneyU(a, b)

        // Use Mann-Whitney when either group has fewer than 10 observations
        const useNonParametric = a.length < 10 || b.length < 10
        const primaryP = useNonParametric ? mwP : welchP

        const pooledSD = Math.sqrt((sA ** 2 + sB ** 2) / 2)
        const d = pooledSD > 0 ? (mA - mB) / pooledSD : 0

        const isImproving = m.key === 'Release Time' ? mA < mB : mA > mB

        rawResults.push({
            metric: m.key,
            periodA: { label: `Recent (${recent.length})`, mean: mA, stdDev: sA, n: recent.length },
            periodB: { label: `Earlier (${earlier.length})`, mean: mB, stdDev: sB, n: earlier.length },
            tStatistic: t,
            pValue: primaryP,
            adjustedPValue: primaryP, // will be corrected below
            significant: false, // will be set below
            effectSize: Math.abs(d),
            direction: 'unchanged', // will be set below
            mannWhitneyP: mwP,
            testUsed: useNonParametric ? 'mann-whitney' : 'welch-t',
            _rawP: primaryP,
        })
    }

    // Benjamini-Hochberg FDR correction across all 6 metrics
    const rawPValues = rawResults.map(r => r._rawP)
    const adjustedPValues = benjaminiHochberg(rawPValues)

    const results: SignificanceTest[] = rawResults.map((r, i) => {
        const adjP = adjustedPValues[i]
        const sig = adjP < 0.05
        const mA = r.periodA.mean, mB = r.periodB.mean
        const isImproving = r.metric === 'Release Time' ? mA < mB : mA > mB

        return {
            metric: r.metric,
            periodA: r.periodA,
            periodB: r.periodB,
            tStatistic: r.tStatistic,
            pValue: r.pValue,
            adjustedPValue: Math.round(adjP * 10000) / 10000,
            significant: sig,
            effectSize: r.effectSize,
            direction: !sig ? 'unchanged' : isImproving ? 'improved' : 'declined',
            mannWhitneyP: r.mannWhitneyP,
            testUsed: r.testUsed,
        }
    })

    return results.sort((a, b) => a.adjustedPValue - b.adjustedPValue)
}

/**
 * 2. Correlation Matrix — Which mechanics drive accuracy?
 *    Now includes Spearman rank correlation (robust to non-linearity)
 *    and Fisher z-transform 95% confidence intervals on Pearson r.
 */
export function analyzeCorrelations(sessions: SessionHistoryItem[]): CorrelationResult[] {
    if (sessions.length < 5) return []

    const fg = sessions.map(s => s.shootingPct)
    const mechanics: Array<{ key: string; values: number[] }> = [
        { key: 'Elbow Angle', values: sessions.map(s => s.avgElbowAngle) },
        { key: 'Release Time', values: sessions.map(s => s.avgReleaseTime) },
        { key: 'Release Height', values: sessions.map(s => s.avgReleaseHeight) },
        { key: 'Posture Quality', values: sessions.map(s => s.avgPostureQuality) },
        { key: 'Follow-Through', values: sessions.map(s => s.followThroughPct) },
        { key: 'Consistency', values: sessions.map(s => s.mechanicConsistency) },
    ]

    const results: CorrelationResult[] = []

    for (const m of mechanics) {
        const { r, p } = pearsonCorrelation(m.values, fg)
        const { rho } = spearmanCorrelation(m.values, fg)
        const ci = fisherZConfidence(r, sessions.length)

        let interpretation = ''
        const absR = Math.abs(r)
        const dir = r > 0 ? 'increases' : 'decreases'

        if (absR >= 0.7) interpretation = `Strong: when ${m.key} ${dir}, your FG% moves significantly.`
        else if (absR >= 0.4) interpretation = `Moderate: ${m.key} has a noticeable effect on accuracy.`
        else if (absR >= 0.2) interpretation = `Weak: ${m.key} has a slight correlation with shooting.`
        else interpretation = `No significant relationship between ${m.key} and accuracy.`

        results.push({
            metricA: m.key,
            metricB: 'FG%',
            r: Math.round(r * 1000) / 1000,
            rSquared: Math.round(r * r * 1000) / 1000,
            pValue: p,
            significant: p < 0.05,
            interpretation,
            spearmanRho: Math.round(rho * 1000) / 1000,
            fisherCI: ci,
        })
    }

    return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
}

/**
 * 3. Fatigue Curve — How does accuracy change within a session?
 */
export function analyzeFatigue(sessions: StoredSession[]): FatigueCurve[] {
    const curves: FatigueCurve[] = []

    for (const session of sessions.slice(0, 10)) {
        const shots = session.shots
        if (shots.length < 8) continue

        const qSize = Math.floor(shots.length / 4)
        const quartiles = []

        for (let q = 0; q < 4; q++) {
            const start = q * qSize
            const end = q === 3 ? shots.length : (q + 1) * qSize
            const chunk = shots.slice(start, end)

            const made = chunk.filter(s => s.outcome === 'made').length
            const total = chunk.length

            quartiles.push({
                label: `Q${q + 1}`,
                shotCount: total,
                fgPct: total > 0 ? Math.round((made / total) * 1000) / 10 : 0,
                avgElbow: mean(chunk.map(s => s.elbowAngle)),
                avgRelease: mean(chunk.map(s => s.releaseTime)),
                avgPosture: mean(chunk.map(s => s.postureQuality)),
            })
        }

        // Fatigue index = how much Q4 drops vs Q1-Q2 average
        const earlyFG = (quartiles[0].fgPct + quartiles[1].fgPct) / 2
        const lateFG = quartiles[3].fgPct
        const fatigueIndex = Math.max(0, Math.min(100, Math.round((earlyFG - lateFG) * 2)))

        // Find the drop-off quartile
        let dropOff: number | null = null
        for (let i = 1; i < quartiles.length; i++) {
            if (quartiles[i].fgPct < quartiles[i - 1].fgPct - 5) {
                dropOff = i
                break
            }
        }

        curves.push({
            sessionId: session.id,
            quartiles,
            fatigueIndex,
            dropOffPoint: dropOff,
        })
    }

    return curves
}

/**
 * 4. Zone-Specific Progression — Track accuracy per court zone over time.
 */
export function analyzeZoneProgression(sessions: StoredSession[]): ZoneProgression[] {
    if (sessions.length < 3) return []

    // Split sessions into periods
    const periodSize = Math.max(3, Math.ceil(sessions.length / 3))
    const periods: Array<{ label: string; sessions: StoredSession[] }> = []

    for (let i = 0; i < sessions.length; i += periodSize) {
        const chunk = sessions.slice(i, i + periodSize)
        const idx = Math.floor(i / periodSize)
        periods.push({
            label: idx === 0 ? 'Recent' : idx === 1 ? 'Middle' : 'Early',
            sessions: chunk,
        })
    }
    periods.reverse() // chronological order

    // Collect all zones
    const allZones = new Set<string>()
    for (const s of sessions) {
        for (const shot of s.shots) {
            if (shot.zone) allZones.add(shot.zone)
        }
    }

    const results: ZoneProgression[] = []

    for (const zone of allZones) {
        const zonePeriods = periods.map(period => {
            let attempts = 0, made = 0
            for (const s of period.sessions) {
                for (const shot of s.shots) {
                    if (shot.zone !== zone) continue
                    attempts++
                    if (shot.outcome === 'made') made++
                }
            }
            return {
                label: period.label,
                attempts,
                made,
                fgPct: attempts > 0 ? Math.round((made / attempts) * 1000) / 10 : 0,
            }
        })

        const withData = zonePeriods.filter(p => p.attempts >= 3)
        if (withData.length < 2) continue

        const first = withData[0].fgPct
        const last = withData[withData.length - 1].fgPct
        const delta = last - first

        const trend: 'improving' | 'declining' | 'stable' =
            delta > 3 ? 'improving' : delta < -3 ? 'declining' : 'stable'

        const bestPeriod = withData.reduce((best, p) =>
            p.fgPct > best.fgPct ? p : best, withData[0]).label

        const totalAttempts = zonePeriods.reduce((s, p) => s + p.attempts, 0)

        results.push({ zone, periods: zonePeriods, trend, bestPeriod, totalAttempts })
    }

    return results.sort((a, b) => b.totalAttempts - a.totalAttempts)
}

/**
 * 5. Hot Hand Detection — Is the player's make/miss pattern random?
 */
export function analyzeHotHand(sessions: StoredSession[]): HotHandResult[] {
    const results: HotHandResult[] = []

    for (const session of sessions.slice(0, 10)) {
        const shots = session.shots.filter(s => s.outcome === 'made' || s.outcome === 'missed')
        if (shots.length < 10) continue

        const sequence = shots.map(s => s.outcome === 'made')

        // Longest streaks
        let maxMade = 0, maxMiss = 0, curMade = 0, curMiss = 0
        for (const made of sequence) {
            if (made) { curMade++; curMiss = 0; maxMade = Math.max(maxMade, curMade) }
            else { curMiss++; curMade = 0; maxMiss = Math.max(maxMiss, curMiss) }
        }

        // Runs test
        const { z, p, runs } = runsTest(sequence)

        // Cluster ratio: actual transitions vs expected
        const n = sequence.length
        const n1 = sequence.filter(v => v).length
        const expectedRuns = 1 + (2 * n1 * (n - n1)) / n
        const clusterRatio = expectedRuns > 0 ? runs / expectedRuns : 1

        const isStreaky = p < 0.05
        const streakiness: 'hot-hand' | 'cold-streaks' | 'random' =
            !isStreaky ? 'random' :
                z < 0 ? 'hot-hand' : 'cold-streaks'

        results.push({
            sessionId: session.id,
            longestMadeStreak: maxMade,
            longestMissStreak: maxMiss,
            runsTestZ: Math.round(z * 100) / 100,
            runsTestP: Math.round(p * 1000) / 1000,
            isStreaky,
            streakiness,
            clusterRatio: Math.round(clusterRatio * 100) / 100,
        })
    }

    return results
}

/**
 * 6. EWMA Projections — Smarter than linear regression.
 */
export function analyzeProjections(sessions: SessionHistoryItem[]): EWMAProjection[] {
    if (sessions.length < 4) return []

    const chronological = [...sessions].reverse()
    const projections: EWMAProjection[] = []

    const metrics: Array<{ key: string; extract: (s: SessionHistoryItem) => number }> = [
        { key: 'FG%', extract: s => s.shootingPct },
        { key: 'Overall Score', extract: s => s.overallScore },
        { key: 'Consistency', extract: s => s.mechanicConsistency },
    ]

    for (const m of metrics) {
        const values = chronological.map(m.extract)
        const smoothed = ewma(values, 0.3)
        const current = smoothed[smoothed.length - 1]

        // Calculate momentum (second derivative of EWMA)
        const recentN = Math.min(5, smoothed.length)
        const recentSlice = smoothed.slice(-recentN)
        let sumSlope = 0
        for (let i = 1; i < recentSlice.length; i++) {
            sumSlope += recentSlice[i] - recentSlice[i - 1]
        }
        const avgSlope = recentSlice.length > 1 ? sumSlope / (recentSlice.length - 1) : 0

        // Acceleration
        const slopes: number[] = []
        for (let i = 1; i < recentSlice.length; i++) {
            slopes.push(recentSlice[i] - recentSlice[i - 1])
        }
        const momentum = slopes.length >= 2 ? slopes[slopes.length - 1] - slopes[0] : 0

        // Project forward (assuming ~3 sessions/week)
        const proj2w = current + avgSlope * 6  // 6 sessions in 2 weeks
        const proj4w = current + avgSlope * 12 // 12 sessions in 4 weeks

        // Confidence interval from recent variance
        const recentValues = values.slice(-Math.min(8, values.length))
        const sd = stdDev(recentValues)
        const se = sd / Math.sqrt(recentValues.length)

        // Trend strength: R² of the smoothed values against time
        const n = smoothed.length
        const xMean = (n - 1) / 2
        let ssReg = 0, ssTot = 0
        const yMean = mean(smoothed)
        for (let i = 0; i < n; i++) {
            ssTot += (smoothed[i] - yMean) ** 2
        }
        // Linear fit on EWMA
        let num = 0, den = 0
        for (let i = 0; i < n; i++) {
            num += (i - xMean) * (smoothed[i] - yMean)
            den += (i - xMean) ** 2
        }
        const slope = den > 0 ? num / den : 0
        const intercept = yMean - slope * xMean
        for (let i = 0; i < n; i++) {
            ssReg += (intercept + slope * i - yMean) ** 2
        }
        const trendStrength = ssTot > 0 ? Math.min(1, ssReg / ssTot) : 0

        projections.push({
            metric: m.key,
            currentValue: Math.round(current * 10) / 10,
            projected2w: Math.round(Math.max(0, Math.min(100, proj2w)) * 10) / 10,
            projected4w: Math.round(Math.max(0, Math.min(100, proj4w)) * 10) / 10,
            confidence: {
                mean: Math.round(proj2w * 10) / 10,
                lower: Math.round(Math.max(0, proj2w - 1.96 * se) * 10) / 10,
                upper: Math.round(Math.min(100, proj2w + 1.96 * se) * 10) / 10,
                alpha: 0.05,
            },
            momentum: Math.round(momentum * 100) / 100,
            trendStrength: Math.round(trendStrength * 100) / 100,
        })
    }

    return projections
}

/**
 * 7. Causal Impact — Did a mechanic shift cause an outcome change?
 */
export function analyzeCausalImpact(sessions: SessionHistoryItem[]): CausalImpact[] {
    if (sessions.length < 8) return []

    const chrono = [...sessions].reverse()
    const results: CausalImpact[] = []

    const mechanics: Array<{ key: string; extract: (s: SessionHistoryItem) => number }> = [
        { key: 'Elbow Angle', extract: s => s.avgElbowAngle },
        { key: 'Release Time', extract: s => s.avgReleaseTime },
        { key: 'Posture', extract: s => s.avgPostureQuality },
        { key: 'Follow-Through', extract: s => s.followThroughPct },
    ]

    for (const m of mechanics) {
        const values = chrono.map(m.extract)
        const fgValues = chrono.map(s => s.shootingPct)

        // Detect changepoint: find the split that maximizes the t-statistic
        let bestSplit = -1, bestT = 0

        for (let split = 3; split < values.length - 3; split++) {
            const before = values.slice(0, split)
            const after = values.slice(split)
            const { t } = welchTTest(after, before)
            if (Math.abs(t) > Math.abs(bestT)) {
                bestT = t
                bestSplit = split
            }
        }

        if (bestSplit < 0) continue

        const mechanicBefore = values.slice(0, bestSplit)
        const mechanicAfter = values.slice(bestSplit)
        const { p: mechP } = welchTTest(mechanicAfter, mechanicBefore)

        if (mechP >= 0.10) continue // No significant mechanic shift

        // Check if FG% also changed at the same point
        const fgBefore = fgValues.slice(0, bestSplit)
        const fgAfter = fgValues.slice(bestSplit)
        const fgMeanBefore = mean(fgBefore)
        const fgMeanAfter = mean(fgAfter)
        const { p: fgP } = welchTTest(fgAfter, fgBefore)

        const lift = fgMeanBefore > 0 ? ((fgMeanAfter - fgMeanBefore) / fgMeanBefore) * 100 : 0

        const splitDate = chrono[bestSplit].createdAt
        const mechDelta = mean(mechanicAfter) - mean(mechanicBefore)
        const direction = mechDelta > 0 ? 'increased' : 'decreased'
        const fgDirection = lift > 0 ? 'improved' : 'declined'

        results.push({
            trigger: `${m.key} ${direction}`,
            triggerDate: splitDate,
            metric: 'FG%',
            beforeMean: Math.round(fgMeanBefore * 10) / 10,
            afterMean: Math.round(fgMeanAfter * 10) / 10,
            lift: Math.round(lift * 10) / 10,
            pValue: fgP,
            significant: fgP < 0.05,
            explanation: fgP < 0.05
                ? `When your ${m.key} ${direction}, your FG% ${fgDirection} by ${Math.abs(lift).toFixed(1)}% (statistically significant).`
                : `Your ${m.key} ${direction}, but the FG% change (${lift > 0 ? '+' : ''}${lift.toFixed(1)}%) isn't statistically significant yet.`,
        })
    }

    return results.sort((a, b) => a.pValue - b.pValue)
}

/**
 * 8. Shot Distribution Analysis — Understand the shape of your shooting.
 */
export function analyzeDistributions(sessions: StoredSession[]): ShotDistribution[] {
    const allShots = sessions.flatMap(s => s.shots)
    if (allShots.length < 10) return []

    const metrics: Array<{ key: string; extract: (s: StoredShot) => number }> = [
        { key: 'Elbow Angle', extract: s => s.elbowAngle },
        { key: 'Release Time', extract: s => s.releaseTime },
        { key: 'Release Height', extract: s => s.releaseHeightRatio },
        { key: 'Posture Quality', extract: s => s.postureQuality },
    ]

    const results: ShotDistribution[] = []

    for (const m of metrics) {
        const values = allShots.map(m.extract).filter(v => v > 0 && isFinite(v))
        if (values.length < 10) continue

        const mn = mean(values)
        const sd = stdDev(values)
        const sk = skewness(values)
        const ku = kurtosis(values)

        // Jarque-Bera normality test (simplified)
        const n = values.length
        const jb = (n / 6) * (sk ** 2 + (ku ** 2) / 4)
        const isNormal = jb < 5.99 // chi-squared critical value at α=0.05, df=2

        let interpretation: string
        if (sd / mn < 0.05) interpretation = 'Extremely consistent — your mechanics are locked in.'
        else if (sd / mn < 0.10) interpretation = 'High consistency — pro-level repeatability.'
        else if (sd / mn < 0.20) interpretation = 'Good consistency — keep refining your routine.'
        else interpretation = 'High variance — your mechanics shift between shots. Focus on repetition.'

        if (Math.abs(sk) > 1) {
            interpretation += sk > 0
                ? ' Right-skewed: most shots are tighter than average, with occasional outliers.'
                : ' Left-skewed: most shots are wider, with occasional tight shots.'
        }

        results.push({
            metric: m.key,
            n: values.length,
            mean: Math.round(mn * 100) / 100,
            median: Math.round(median(values) * 100) / 100,
            stdDev: Math.round(sd * 100) / 100,
            variance: Math.round(variance(values) * 100) / 100,
            skewness: Math.round(sk * 100) / 100,
            kurtosis: Math.round(ku * 100) / 100,
            percentiles: {
                p10: Math.round(percentile(values, 10) * 100) / 100,
                p25: Math.round(percentile(values, 25) * 100) / 100,
                p50: Math.round(percentile(values, 50) * 100) / 100,
                p75: Math.round(percentile(values, 75) * 100) / 100,
                p90: Math.round(percentile(values, 90) * 100) / 100,
            },
            isNormal,
            interpretation,
        })
    }

    return results
}

// ══════════════════════════════════════════════════════════════
// Basketball-Specific Analysis Functions
// ══════════════════════════════════════════════════════════════

/** 3-point zone identifiers */
const THREE_POINT_ZONES = new Set([
    'corner3Left', 'corner3Right', 'wing3Left', 'wing3Right',
    'top3', 'threePointLeft', 'threePointRight', 'threePoint',
    'corner3', 'wing3', 'top3Left', 'top3Right',
])

/**
 * 9. Shot Selection Efficiency — Are you taking smart shots?
 *    Calculates expected points per attempt by zone (the metric NBA teams optimize).
 */
export function analyzeShotSelection(sessions: StoredSession[]): ShotSelectionResult[] {
    const allShots = sessions.flatMap(s => s.shots).filter(s => s.zone)
    if (allShots.length < 10) return []

    const zoneMap = new Map<string, { attempts: number; makes: number }>()

    for (const shot of allShots) {
        const zone = shot.zone!
        const entry = zoneMap.get(zone) || { attempts: 0, makes: 0 }
        entry.attempts++
        if (shot.outcome === 'made') entry.makes++
        zoneMap.set(zone, entry)
    }

    const totalShots = allShots.length
    const results: ShotSelectionResult[] = []

    for (const [zone, { attempts, makes }] of zoneMap) {
        if (attempts < 3) continue

        const fgPct = Math.round((makes / attempts) * 1000) / 10
        const pointValue = THREE_POINT_ZONES.has(zone) ? 3 : 2
        const expectedPoints = Math.round((fgPct / 100) * pointValue * 100) / 100
        const volumeShare = Math.round((attempts / totalShots) * 1000) / 10

        // Efficiency thresholds based on point value
        // NBA league average: ~1.0 ePPA for 2pt, ~1.08 for 3pt
        const efficiency: ShotSelectionResult['efficiency'] =
            expectedPoints >= pointValue * 0.55 ? 'elite' :
                expectedPoints >= pointValue * 0.45 ? 'good' :
                    expectedPoints >= pointValue * 0.35 ? 'average' : 'poor'

        results.push({ zone, attempts, makes, fgPct, pointValue, expectedPoints, volumeShare, efficiency })
    }

    return results.sort((a, b) => b.expectedPoints - a.expectedPoints)
}

/**
 * 10. Clutch Performance — How do you shoot under late-session pressure?
 *     Compares the last 20% of shots (fatigued / pressure) vs. first 80%.
 */
export function analyzeClutchPerformance(sessions: StoredSession[]): ClutchResult[] {
    const results: ClutchResult[] = []

    for (const session of sessions.slice(0, 10)) {
        const shots = session.shots.filter(s => s.outcome === 'made' || s.outcome === 'missed')
        if (shots.length < 10) continue

        const splitIdx = Math.floor(shots.length * 0.8)
        const early = shots.slice(0, splitIdx)
        const late = shots.slice(splitIdx)

        const earlyMade = early.filter(s => s.outcome === 'made').length
        const lateMade = late.filter(s => s.outcome === 'made').length

        const earlyFG = Math.round((earlyMade / early.length) * 1000) / 10
        const lateFG = late.length > 0 ? Math.round((lateMade / late.length) * 1000) / 10 : 0
        const clutchDelta = Math.round((lateFG - earlyFG) * 10) / 10

        const earlyMechanics = {
            elbow: mean(early.map(s => s.elbowAngle)),
            release: mean(early.map(s => s.releaseTime)),
            posture: mean(early.map(s => s.postureQuality)),
        }
        const lateMechanics = {
            elbow: mean(late.map(s => s.elbowAngle)),
            release: mean(late.map(s => s.releaseTime)),
            posture: mean(late.map(s => s.postureQuality)),
        }

        const label: ClutchResult['label'] =
            clutchDelta > 5 ? 'clutch' : clutchDelta < -5 ? 'choke' : 'neutral'

        results.push({
            sessionId: session.id,
            earlyFG, lateFG, clutchDelta,
            earlyMechanics, lateMechanics,
            isClutch: clutchDelta > 5,
            label,
        })
    }

    return results
}

/**
 * 11. Consistency Profile — How stable are your mechanics session-to-session?
 *     Uses coefficient of variation (CV) and trend analysis.
 */
export function analyzeConsistencyProfile(sessions: SessionHistoryItem[]): ConsistencyProfile[] {
    if (sessions.length < 4) return []

    const chrono = [...sessions].reverse() // oldest first

    const metrics: Array<{ key: string; extract: (s: SessionHistoryItem) => number }> = [
        { key: 'FG%', extract: s => s.shootingPct },
        { key: 'Elbow Angle', extract: s => s.avgElbowAngle },
        { key: 'Release Time', extract: s => s.avgReleaseTime },
        { key: 'Posture Quality', extract: s => s.avgPostureQuality },
        { key: 'Consistency Score', extract: s => s.mechanicConsistency },
    ]

    const results: ConsistencyProfile[] = []

    for (const m of metrics) {
        const values = chrono.map(m.extract)
        const mn = mean(values)
        const sd = stdDev(values)
        const cv = mn > 0 ? Math.round((sd / mn) * 1000) / 10 : 0

        const stability: ConsistencyProfile['stability'] =
            cv < 3 ? 'locked-in' :
                cv < 8 ? 'consistent' :
                    cv < 15 ? 'variable' : 'erratic'

        let bestIdx = 0, worstIdx = 0
        const isLowerBetter = m.key === 'Release Time'
        for (let i = 1; i < values.length; i++) {
            if (isLowerBetter) {
                if (values[i] < values[bestIdx]) bestIdx = i
                if (values[i] > values[worstIdx]) worstIdx = i
            } else {
                if (values[i] > values[bestIdx]) bestIdx = i
                if (values[i] < values[worstIdx]) worstIdx = i
            }
        }

        // Trend: compare smoothed last 3 vs first 3
        const firstN = Math.min(3, Math.floor(values.length / 2))
        const earlyMean = mean(values.slice(0, firstN))
        const lateMean = mean(values.slice(-firstN))
        const delta = isLowerBetter ? earlyMean - lateMean : lateMean - earlyMean
        const trend: ConsistencyProfile['trend'] =
            delta > sd * 0.5 ? 'improving' : delta < -sd * 0.5 ? 'declining' : 'stable'

        results.push({
            metric: m.key,
            sessionMeans: values.map(v => Math.round(v * 100) / 100),
            overallMean: Math.round(mn * 100) / 100,
            overallCV: cv,
            stability,
            bestSession: { index: bestIdx, value: Math.round(values[bestIdx] * 100) / 100 },
            worstSession: { index: worstIdx, value: Math.round(values[worstIdx] * 100) / 100 },
            trend,
        })
    }

    return results
}

/**
 * 12. Mechanic Clustering — Group shots by biomechanical similarity.
 *     Lightweight k-means (k=3) on [elbowAngle, releaseTime, postureQuality, releaseHeight].
 *     Identifies which "form" produces the best outcomes.
 */
export function analyzeMechanicClusters(sessions: StoredSession[]): MechanicCluster[] {
    const allShots = sessions.flatMap(s => s.shots)
        .filter(s => s.elbowAngle > 0 && s.releaseTime > 0 && s.postureQuality > 0 && s.releaseHeightRatio > 0)
    if (allShots.length < 15) return []

    // Normalize features to [0, 1] for equal weighting
    const features = allShots.map(s => [s.elbowAngle, s.releaseTime, s.postureQuality, s.releaseHeightRatio])
    const mins = [0, 0, 0, 0].map((_, d) => Math.min(...features.map(f => f[d])))
    const maxes = [0, 0, 0, 0].map((_, d) => Math.max(...features.map(f => f[d])))
    const ranges = maxes.map((max, d) => max - mins[d] || 1) // avoid div by zero

    const normalized = features.map(f => f.map((v, d) => (v - mins[d]) / ranges[d]))

    // K-means with k=3 (good form, average form, poor form)
    const K = Math.min(3, allShots.length)
    // Initialize centroids: pick first, middle, last after sorting by outcome quality
    const sortedIndices = allShots
        .map((s, i) => ({ i, score: (s.outcome === 'made' ? 1 : 0) + s.postureQuality / 100 }))
        .sort((a, b) => a.score - b.score)
        .map(x => x.i)

    let centroids = [
        [...normalized[sortedIndices[0]]],
        [...normalized[sortedIndices[Math.floor(sortedIndices.length / 2)]]],
        [...normalized[sortedIndices[sortedIndices.length - 1]]],
    ].slice(0, K)

    const assignments = new Array(normalized.length).fill(0)

    // Iterate
    for (let iter = 0; iter < 20; iter++) {
        let changed = false

        // Assign each point to nearest centroid
        for (let i = 0; i < normalized.length; i++) {
            let bestK = 0, bestDist = Infinity
            for (let c = 0; c < K; c++) {
                let dist = 0
                for (let d = 0; d < 4; d++) dist += (normalized[i][d] - centroids[c][d]) ** 2
                if (dist < bestDist) { bestDist = dist; bestK = c }
            }
            if (assignments[i] !== bestK) { assignments[i] = bestK; changed = true }
        }

        if (!changed) break

        // Recompute centroids
        for (let c = 0; c < K; c++) {
            const members = normalized.filter((_, i) => assignments[i] === c)
            if (members.length === 0) continue
            centroids[c] = [0, 0, 0, 0].map((_, d) => mean(members.map(m => m[d])))
        }
    }

    // Build cluster results in original scale
    const clusters: MechanicCluster[] = []
    let bestFgPct = -1, bestClusterId = 0

    for (let c = 0; c < K; c++) {
        const memberIndices = assignments.map((a, i) => a === c ? i : -1).filter(i => i >= 0)
        if (memberIndices.length === 0) continue

        const memberShots = memberIndices.map(i => allShots[i])
        const made = memberShots.filter(s => s.outcome === 'made').length
        const fgPct = Math.round((made / memberShots.length) * 1000) / 10

        const centroid = {
            elbow: Math.round(mean(memberShots.map(s => s.elbowAngle)) * 10) / 10,
            release: Math.round(mean(memberShots.map(s => s.releaseTime)) * 1000) / 1000,
            posture: Math.round(mean(memberShots.map(s => s.postureQuality)) * 10) / 10,
            height: Math.round(mean(memberShots.map(s => s.releaseHeightRatio)) * 1000) / 1000,
        }

        // Auto-label based on FG% relative position
        let label = `Form ${c + 1}`

        if (fgPct > bestFgPct) { bestFgPct = fgPct; bestClusterId = c }

        clusters.push({
            clusterId: c,
            centroid,
            shotCount: memberShots.length,
            fgPct,
            label,
            isOptimal: false, // set below
        })
    }

    // Mark optimal cluster and generate labels
    for (const cl of clusters) {
        cl.isOptimal = cl.clusterId === bestClusterId
        if (cl.isOptimal) {
            cl.label = `Best Form (${cl.fgPct}% FG)`
        } else if (cl.fgPct < bestFgPct - 10) {
            cl.label = `Weak Form (${cl.fgPct}% FG)`
        } else {
            cl.label = `Average Form (${cl.fgPct}% FG)`
        }
    }

    return clusters.sort((a, b) => b.fgPct - a.fgPct)
}

// ══════════════════════════════════════════════════════════════
// Main Entry — Generate Full Report
// ══════════════════════════════════════════════════════════════

/**
 * Generates a complete basketball data-science analytics report.
 * Consumes both session-level summaries and raw shot-level data.
 */
export function generateAnalyticsReport(
    historyItems: SessionHistoryItem[],
    fullSessions: StoredSession[],
): FullAnalyticsReport {
    const shotsAnalyzed = fullSessions.reduce((s, sess) => s + sess.shots.length, 0)

    return {
        generatedAt: new Date().toISOString(),
        sessionsAnalyzed: historyItems.length,
        shotsAnalyzed,
        significance: analyzeSignificance(historyItems),
        correlations: analyzeCorrelations(historyItems),
        fatigueCurves: analyzeFatigue(fullSessions),
        zoneProgression: analyzeZoneProgression(fullSessions),
        hotHand: analyzeHotHand(fullSessions),
        projections: analyzeProjections(historyItems),
        causalImpacts: analyzeCausalImpact(historyItems),
        distributions: analyzeDistributions(fullSessions),
        shotSelection: analyzeShotSelection(fullSessions),
        clutch: analyzeClutchPerformance(fullSessions),
        consistencyProfile: analyzeConsistencyProfile(historyItems),
        mechanicClusters: analyzeMechanicClusters(fullSessions),
    }
}

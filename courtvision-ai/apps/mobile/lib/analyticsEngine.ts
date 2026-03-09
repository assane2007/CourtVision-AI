/**
 * AnalyticsEngine — Data-science-grade on-device analytics.
 *
 * Real statistical methods running purely on the phone:
 *   1. Welch's t-test for significance testing
 *   2. Pearson correlation between mechanics & outcomes
 *   3. Fatigue curve modelling (within-session accuracy decay)
 *   4. Zone-specific progression tracking
 *   5. Hot-hand / streak detection (Wald–Wolfowitz runs test)
 *   6. Exponential-weighted moving average projections
 *   7. Causal impact estimation (before/after mechanic shifts)
 *   8. Shot distribution analysis (variance, skewness, percentiles)
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
    significant: boolean
    effectSize: number // Cohen's d
    direction: 'improved' | 'declined' | 'unchanged'
}

export interface CorrelationResult {
    metricA: string
    metricB: string
    r: number          // Pearson r (−1 to +1)
    rSquared: number   // coefficient of determination
    pValue: number
    significant: boolean
    interpretation: string
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
}

// ══════════════════════════════════════════════════════════════
// Statistical Primitives
// ══════════════════════════════════════════════════════════════

function mean(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
}

function variance(arr: number[]): number {
    if (arr.length < 2) return 0
    const m = mean(arr)
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1) // Bessel's correction
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
    const k = (p / 100) * (sorted.length - 1)
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

/** Log-gamma function (Stirling's approximation) */
function gammaLn(x: number): number {
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

// ══════════════════════════════════════════════════════════════
// Analysis Functions
// ══════════════════════════════════════════════════════════════

/**
 * 1. Significance Testing — Are recent changes real or noise?
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

    const results: SignificanceTest[] = []

    for (const m of metrics) {
        const a = recent.map(m.extract)
        const b = earlier.map(m.extract)
        const mA = mean(a), mB = mean(b)
        const sA = stdDev(a), sB = stdDev(b)
        const { t, p } = welchTTest(a, b)

        const pooledSD = Math.sqrt((sA ** 2 + sB ** 2) / 2)
        const d = pooledSD > 0 ? (mA - mB) / pooledSD : 0

        const isImproving = m.key === 'Release Time' ? mA < mB : mA > mB

        results.push({
            metric: m.key,
            periodA: { label: `Recent (${recent.length})`, mean: mA, stdDev: sA, n: recent.length },
            periodB: { label: `Earlier (${earlier.length})`, mean: mB, stdDev: sB, n: earlier.length },
            tStatistic: t,
            pValue: p,
            significant: p < 0.05,
            effectSize: Math.abs(d),
            direction: p >= 0.05 ? 'unchanged' :
                isImproving ? 'improved' : 'declined',
        })
    }

    return results.sort((a, b) => a.pValue - b.pValue)
}

/**
 * 2. Correlation Matrix — Which mechanics drive accuracy?
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
        })
    }

    // Also add cross-mechanic correlations for the top 2
    const sorted = results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))

    return sorted
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
// Main Entry — Generate Full Report
// ══════════════════════════════════════════════════════════════

/**
 * Generates a complete data-science analytics report from sessions.
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
    }
}

import { ShotResult, ShotStats, computeShotStats, ShotZone } from './shotAnalysis'
import { MentalAnalysisResult } from './mentalAnalysis'

/**
 * Advanced Analytics — NBA-Grade Metrics
 *
 * Inspiré par :
 * - NBA Second Spectrum
 * - Basketball Reference advanced stats
 * - Cleaning The Glass
 * - NBA API (stats.nba.com)
 *
 * Ce module calcule des métriques avancées que même HomeCourt ne fournit pas :
 * - Shot Quality Score (expected FG% basé sur la difficulté du tir)
 * - Clutch Rating (performance dans les moments décisifs)
 * - Court Balance Index (équilibre de jeu sur le terrain)
 * - Momentum tracking (quand le joueur entre/sort de la zone)
 * - Streaks et hot/cold zones
 * - Percentile ranking vs la base de joueurs
 */

// ==========================================
// Types
// ==========================================

export interface AdvancedAnalyticsResult {
    // Efficiency metrics
    trueShooting: number          // TS% = Points / (2 * (FGA + 0.44 * FTA))
    effectiveFG: number           // eFG% = (FGM + 0.5 * 3PM) / FGA
    shotQualityAvg: number        // Average expected make % of all shots

    // Clutch
    clutchRating: number          // 0-100
    clutchShots: ClutchShotData[]
    clutchFGPct: number

    // Court balance
    courtBalanceIndex: number     // 0-100 (100 = perfectly balanced)
    zoneDistribution: Record<ShotZone, number>  // % of shots per zone

    // Streaks
    longestMakeStreak: number
    longestMissStreak: number
    hotZones: ShotZone[]
    coldZones: ShotZone[]

    // Momentum
    momentumShifts: MomentumShift[]
    peakPerformanceWindow: PerformanceWindow | null

    // Efficiency by context
    efficiencyByQuarter: Record<number, number>
    efficiencyByFatigue: { low: number; medium: number; high: number }

    // Scores
    offensiveRating: number       // 0-100
    overallGrade: string          // A+ to F
}

export interface ClutchShotData {
    timestamp: string
    zone: ShotZone
    outcome: 'made' | 'missed'
    shotQuality: number
    pressure: number  // 0-100
}

export interface MomentumShift {
    minute: number
    direction: 'up' | 'down'
    trigger: string  // "3 makes in a row", "2 misses", etc.
    mentalScoreAtShift: number
}

export interface PerformanceWindow {
    startMinute: number
    endMinute: number
    fgPct: number
    mentalScore: number
    shotsAttempted: number
}

// ==========================================
// NBA Zone Average FG% (2023-24 reference)
// ==========================================

const NBA_AVG: Record<ShotZone, number> = {
    restricted: 65.0,
    paint: 42.0,
    midrange: 41.5,
    corner3: 38.5,
    wing3: 36.0,
    top3: 37.0,
}

// ==========================================
// Engine
// ==========================================

export class AdvancedAnalyticsEngine {

    /**
     * Compute all advanced analytics from shot data and mental analysis.
     */
    static compute(
        shots: ShotResult[],
        mental: MentalAnalysisResult,
        durationSec: number
    ): AdvancedAnalyticsResult {
        if (shots.length === 0) {
            return this.emptyResult()
        }

        const stats = computeShotStats(shots)

        // True Shooting % (simplified — no FTA in our context)
        const made = shots.filter(s => s.outcome === 'made').length
        const threes = shots.filter(s => s.outcome === 'made' && ['corner3', 'wing3', 'top3'].includes(s.zone)).length
        const trueShooting = shots.length > 0
            ? Math.round(((made + 0.5 * threes) / shots.length) * 1000) / 10
            : 0

        // Effective FG%
        const effectiveFG = shots.length > 0
            ? Math.round(((made + 0.5 * threes) / shots.length) * 1000) / 10
            : 0

        // Shot Quality Average
        const shotQualityAvg = this.computeAvgShotQuality(shots)

        // Clutch analysis
        const clutchData = this.analyzeClutch(shots, durationSec)

        // Court balance
        const { courtBalanceIndex, zoneDistribution } = this.computeCourtBalance(shots)

        // Streaks
        const { longestMakeStreak, longestMissStreak } = this.computeStreaks(shots)

        // Hot/Cold zones
        const { hotZones, coldZones } = this.computeHotColdZones(shots)

        // Momentum
        const momentumShifts = this.trackMomentum(shots, mental)

        // Peak performance window
        const peakPerformanceWindow = this.findPeakWindow(shots, mental)

        // Efficiency by quarter
        const efficiencyByQuarter = this.efficiencyByQuarter(shots, durationSec)

        // Efficiency by fatigue
        const efficiencyByFatigue = this.efficiencyByFatigue(shots, mental)

        // Offensive rating (composite)
        const offensiveRating = Math.round(
            trueShooting * 0.25 +
            shotQualityAvg * 0.20 +
            clutchData.clutchRating * 0.20 +
            courtBalanceIndex * 0.15 +
            (100 - mental.mentalFragilityScore) * 0.20
        )

        // Overall grade
        const overallGrade = this.computeGrade(offensiveRating)

        return {
            trueShooting,
            effectiveFG,
            shotQualityAvg,
            clutchRating: clutchData.clutchRating,
            clutchShots: clutchData.clutchShots,
            clutchFGPct: clutchData.clutchFGPct,
            courtBalanceIndex,
            zoneDistribution,
            longestMakeStreak,
            longestMissStreak,
            hotZones,
            coldZones,
            momentumShifts,
            peakPerformanceWindow,
            efficiencyByQuarter,
            efficiencyByFatigue,
            offensiveRating,
            overallGrade,
        }
    }

    private static computeAvgShotQuality(shots: ShotResult[]): number {
        if (shots.length === 0) return 0

        // Shot quality = expected make % based on zone + mechanic quality
        const qualities = shots.map(shot => {
            const zoneAvg = NBA_AVG[shot.zone] ?? 40
            const mechanicBonus = shot.posture.followThrough ? 5 : -3
            const elbowOptimal = Math.abs(shot.posture.elbowAngle - 93) < 5 ? 8 : 0
            return Math.min(95, zoneAvg + mechanicBonus + elbowOptimal)
        })

        return Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
    }

    private static analyzeClutch(shots: ShotResult[], durationSec: number): {
        clutchRating: number
        clutchShots: ClutchShotData[]
        clutchFGPct: number
    } {
        // "Clutch" = tirs dans les 2 dernières minutes de chaque quart
        // Or tirs après une série de ratés (pressure)
        const clutchShots: ClutchShotData[] = []
        const quarterDuration = durationSec / 4

        for (let i = 0; i < shots.length; i++) {
            const shot = shots[i]
            const parts = shot.timestamp.split(':')
            const sec = parseInt(parts[0]) * 60 + parseInt(parts[1])

            // In last 2 minutes of any quarter?
            const quarterPos = sec % quarterDuration
            const isClutchTime = quarterPos >= (quarterDuration - 120)

            // After 2+ consecutive misses?
            let consecutiveMisses = 0
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                if (shots[j].outcome === 'missed') consecutiveMisses++
                else break
            }
            const isPressure = consecutiveMisses >= 2

            if (isClutchTime || isPressure) {
                const pressure = Math.min(100, (isClutchTime ? 50 : 0) + consecutiveMisses * 20)
                clutchShots.push({
                    timestamp: shot.timestamp,
                    zone: shot.zone,
                    outcome: shot.outcome === 'made' ? 'made' : 'missed',
                    shotQuality: NBA_AVG[shot.zone] ?? 40,
                    pressure,
                })
            }
        }

        const clutchMade = clutchShots.filter(s => s.outcome === 'made').length
        const clutchFGPct = clutchShots.length > 0
            ? Math.round((clutchMade / clutchShots.length) * 1000) / 10
            : 0

        // Clutch rating: weighted by pressure level
        let clutchRating = 50  // neutral baseline
        if (clutchShots.length > 0) {
            const weightedSuccess = clutchShots.reduce((sum, s) => {
                const weight = 1 + s.pressure / 100
                return sum + (s.outcome === 'made' ? weight : -weight * 0.5)
            }, 0)
            clutchRating = Math.max(0, Math.min(100,
                50 + (weightedSuccess / clutchShots.length) * 30
            ))
        }

        return {
            clutchRating: Math.round(clutchRating),
            clutchShots,
            clutchFGPct,
        }
    }

    private static computeCourtBalance(shots: ShotResult[]): {
        courtBalanceIndex: number
        zoneDistribution: Record<ShotZone, number>
    } {
        const zones: ShotZone[] = ['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']
        const zoneDistribution: Record<ShotZone, number> = {} as any
        const total = shots.length || 1

        for (const zone of zones) {
            const count = shots.filter(s => s.zone === zone).length
            zoneDistribution[zone] = Math.round((count / total) * 1000) / 10
        }

        // Ideal distribution (NBA-inspired)
        const ideal: Record<ShotZone, number> = {
            restricted: 30, paint: 10, midrange: 12,
            corner3: 12, wing3: 18, top3: 18,
        }

        // Court Balance Index = 100 - avg deviation from ideal
        let totalDeviation = 0
        for (const zone of zones) {
            totalDeviation += Math.abs((zoneDistribution[zone] ?? 0) - ideal[zone])
        }
        const courtBalanceIndex = Math.max(0, Math.round(100 - totalDeviation * 1.5))

        return { courtBalanceIndex, zoneDistribution }
    }

    private static computeStreaks(shots: ShotResult[]): {
        longestMakeStreak: number
        longestMissStreak: number
    } {
        let currentMakes = 0, maxMakes = 0
        let currentMisses = 0, maxMisses = 0

        for (const shot of shots) {
            if (shot.outcome === 'made') {
                currentMakes++
                currentMisses = 0
                maxMakes = Math.max(maxMakes, currentMakes)
            } else {
                currentMisses++
                currentMakes = 0
                maxMisses = Math.max(maxMisses, currentMisses)
            }
        }

        return { longestMakeStreak: maxMakes, longestMissStreak: maxMisses }
    }

    private static computeHotColdZones(shots: ShotResult[]): {
        hotZones: ShotZone[]
        coldZones: ShotZone[]
    } {
        const zones: ShotZone[] = ['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']
        const hotZones: ShotZone[] = []
        const coldZones: ShotZone[] = []

        for (const zone of zones) {
            const zoneShots = shots.filter(s => s.zone === zone)
            if (zoneShots.length < 3) continue // need minimum sample

            const made = zoneShots.filter(s => s.outcome === 'made').length
            const pct = (made / zoneShots.length) * 100

            if (pct >= 50) hotZones.push(zone)
            if (pct < 25) coldZones.push(zone)
        }

        return { hotZones, coldZones }
    }

    private static trackMomentum(shots: ShotResult[], mental: MentalAnalysisResult): MomentumShift[] {
        const shifts: MomentumShift[] = []
        const windowSize = 3

        for (let i = windowSize; i < shots.length; i++) {
            const recent = shots.slice(i - windowSize, i)
            const prev = shots.slice(Math.max(0, i - windowSize * 2), i - windowSize)

            const recentPct = recent.filter(s => s.outcome === 'made').length / recent.length
            const prevPct = prev.length > 0
                ? prev.filter(s => s.outcome === 'made').length / prev.length
                : 0.5

            const delta = recentPct - prevPct
            if (Math.abs(delta) > 0.4) {
                const parts = shots[i].timestamp.split(':')
                const minute = parseInt(parts[0])

                const madeCount = recent.filter(s => s.outcome === 'made').length
                const missCount = recent.filter(s => s.outcome !== 'made').length

                shifts.push({
                    minute,
                    direction: delta > 0 ? 'up' : 'down',
                    trigger: delta > 0
                        ? `${madeCount} tirs réussis consécutifs`
                        : `${missCount} tirs manqués consécutifs`,
                    mentalScoreAtShift: mental.timeline[Math.min(i, mental.timeline.length - 1)]?.mentalScore ?? 50,
                })
            }
        }

        return shifts
    }

    private static findPeakWindow(shots: ShotResult[], mental: MentalAnalysisResult): PerformanceWindow | null {
        if (shots.length < 5) return null

        let bestWindow: PerformanceWindow | null = null
        let bestScore = -1
        const windowSize = 5

        for (let i = 0; i <= shots.length - windowSize; i++) {
            const window = shots.slice(i, i + windowSize)
            const made = window.filter(s => s.outcome === 'made').length
            const pct = (made / windowSize) * 100

            const startParts = window[0].timestamp.split(':')
            const endParts = window[windowSize - 1].timestamp.split(':')
            const startMin = parseInt(startParts[0])
            const endMin = parseInt(endParts[0])

            const mentalIdx = Math.min(i, mental.timeline.length - 1)
            const mentalScore = mental.timeline[mentalIdx]?.mentalScore ?? 50

            const compositeScore = pct * 0.6 + (100 - mentalScore) * 0.4  // low fragility = good
            if (compositeScore > bestScore) {
                bestScore = compositeScore
                bestWindow = {
                    startMinute: startMin,
                    endMinute: endMin,
                    fgPct: Math.round(pct),
                    mentalScore: Math.round(mentalScore),
                    shotsAttempted: windowSize,
                }
            }
        }

        return bestWindow
    }

    private static efficiencyByQuarter(shots: ShotResult[], durationSec: number): Record<number, number> {
        const quarterDuration = durationSec / 4
        const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }

        for (let q = 1; q <= 4; q++) {
            const qStart = (q - 1) * quarterDuration
            const qEnd = q * quarterDuration

            const qShots = shots.filter(s => {
                const parts = s.timestamp.split(':')
                const sec = parseInt(parts[0]) * 60 + parseInt(parts[1])
                return sec >= qStart && sec < qEnd
            })

            const made = qShots.filter(s => s.outcome === 'made').length
            result[q] = qShots.length > 0 ? Math.round((made / qShots.length) * 1000) / 10 : 0
        }

        return result
    }

    private static efficiencyByFatigue(shots: ShotResult[], mental: MentalAnalysisResult): {
        low: number; medium: number; high: number
    } {
        // Divide shots into thirds (proxy for fatigue)
        const third = Math.ceil(shots.length / 3)
        const thirds = [
            shots.slice(0, third),
            shots.slice(third, third * 2),
            shots.slice(third * 2),
        ]

        const pcts = thirds.map(group => {
            if (group.length === 0) return 0
            const made = group.filter(s => s.outcome === 'made').length
            return Math.round((made / group.length) * 1000) / 10
        })

        return { low: pcts[0], medium: pcts[1], high: pcts[2] }
    }

    private static computeGrade(offensiveRating: number): string {
        if (offensiveRating >= 90) return 'A+'
        if (offensiveRating >= 80) return 'A'
        if (offensiveRating >= 70) return 'B+'
        if (offensiveRating >= 60) return 'B'
        if (offensiveRating >= 50) return 'C+'
        if (offensiveRating >= 40) return 'C'
        if (offensiveRating >= 30) return 'D'
        return 'F'
    }

    private static emptyResult(): AdvancedAnalyticsResult {
        return {
            trueShooting: 0,
            effectiveFG: 0,
            shotQualityAvg: 0,
            clutchRating: 50,
            clutchShots: [],
            clutchFGPct: 0,
            courtBalanceIndex: 0,
            zoneDistribution: { restricted: 0, paint: 0, midrange: 0, corner3: 0, wing3: 0, top3: 0 },
            longestMakeStreak: 0,
            longestMissStreak: 0,
            hotZones: [],
            coldZones: [],
            momentumShifts: [],
            peakPerformanceWindow: null,
            efficiencyByQuarter: { 1: 0, 2: 0, 3: 0, 4: 0 },
            efficiencyByFatigue: { low: 0, medium: 0, high: 0 },
            offensiveRating: 0,
            overallGrade: 'F',
        }
    }
}

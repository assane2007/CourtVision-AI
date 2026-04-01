import type { TrackingResult} from './tracking';
import { LANDMARKS } from './tracking'
import { applyHomography } from './preprocessing'

/**
 * 3D Reconstruction Pipeline — CourtVision AI v5
 *
 * Converts 2D tracking data to 3D court positions with:
 *   - Monocular depth estimation via calibrated perspective model
 *   - 1-Euro filter for position smoothing (low latency, jitter reduction)
 *   - Efficient player distance calculation (main player + nearest only)
 *   - Heatmap generation with configurable grid resolution
 *   - Zone occupancy based on official FIBA dimensions
 *   - Teleportation detection and trajectory interpolation
 *   - Speed & acceleration metrics per player
 *
 * Court coordinate system: FIBA regulation (15m × 28m)
 *   - Origin: bottom-left corner of the court
 *   - x: sideline (0–15m), y: baseline-to-baseline (0–28m)
 *   - Basket at x=7.5m, y=1.575m
 */

// ── Court Constants ────────────────────────────────────────────

/** Standard FIBA court dimensions in metres */
const COURT_WIDTH = 15
const COURT_HEIGHT = 28

/** Basket position (FIBA: 1.575m from baseline, centred) */
const BASKET_X = COURT_WIDTH / 2
const BASKET_Y = 1.575

/** Average basketball player height for depth calibration */
const AVG_PLAYER_HEIGHT = 1.90

// ── Types ──────────────────────────────────────────────────────

export interface PlayerPosition3D {
    playerId: number
    x: number
    y: number
    z: number     // Estimated elevation (0 = ground)
    speed?: number // m/s
}

export interface HeatmapPoint {
    x: number
    y: number
    value: number // Seconds spent in this cell
}

export interface PlayerDistance {
    playerA: number
    playerB: number
    distance: number
    frameIndex: number
}

export type CourtZone =
    | 'restricted_area'
    | 'paint'
    | 'midrange_left'
    | 'midrange_right'
    | 'midrange_top'
    | 'corner3_left'
    | 'corner3_right'
    | 'wing3_left'
    | 'wing3_right'
    | 'top3'
    | 'backcourt'

export interface Reconstruction3DResult {
    heatmapData: HeatmapPoint[]
    aerialViewPositions: PlayerPosition3D[][]
    playerDistances: PlayerDistance[]
    zoneOccupancy: Record<CourtZone, number>
    averagePositions: Record<number, { x: number; y: number }>
    totalDistanceCovered: Record<number, number>
    maxSpeed: Record<number, number>
}

// ── 1-Euro Filter ──────────────────────────────────────────────
// Low-latency smoothing filter that adapts cutoff to signal speed.
// Reduces jitter on slow movements while preserving fast movements.
// Reference: Casiez et al. "1€ Filter" (2012)

interface OneEuroState {
    prevRaw: number
    prevFiltered: number
    prevDx: number
    prevTs: number
}

const ONE_EURO_MIN_CUTOFF = 1.0   // Hz — low cutoff for slow movements
const ONE_EURO_BETA = 0.007       // speed coefficient
const ONE_EURO_D_CUTOFF = 1.0     // Hz — derivative cutoff

function lpfAlpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
}

function oneEuroFilter(state: OneEuroState | null, raw: number, ts: number): { filtered: number; state: OneEuroState } {
    if (!state || ts <= state.prevTs) {
        const s: OneEuroState = { prevRaw: raw, prevFiltered: raw, prevDx: 0, prevTs: ts }
        return { filtered: raw, state: s }
    }

    const dt = ts - state.prevTs
    // Derivative estimate (smoothed)
    const dx = (raw - state.prevRaw) / dt
    const dAlpha = lpfAlpha(ONE_EURO_D_CUTOFF, dt)
    const dxSmooth = dAlpha * dx + (1 - dAlpha) * state.prevDx

    // Adaptive cutoff
    const cutoff = ONE_EURO_MIN_CUTOFF + ONE_EURO_BETA * Math.abs(dxSmooth)
    const alpha = lpfAlpha(cutoff, dt)
    const filtered = alpha * raw + (1 - alpha) * state.prevFiltered

    return {
        filtered,
        state: { prevRaw: raw, prevFiltered: filtered, prevDx: dxSmooth, prevTs: ts },
    }
}

// ── Depth Estimation ───────────────────────────────────────────

/**
 * Estimates depth (distance from camera) using perspective projection.
 *
 * distance ≈ (realHeight × focalLength) / apparentHeight
 *
 * The focal length is estimated from frame height assuming a smartphone
 * camera with ~60° vertical FOV.
 */
function estimateDepth(bboxHeight: number, frameHeight: number): number {
    if (bboxHeight <= 0) return 10
    // Smartphone cameras: vertical FOV ~55-65° → focal ≈ 0.8×frameH
    const focalLength = frameHeight * 0.8
    return (AVG_PLAYER_HEIGHT * focalLength) / bboxHeight
}

// ── Coordinate Conversion ──────────────────────────────────────

function pixelToCourtPosition(
    px: number,
    py: number,
    frameWidth: number,
    frameHeight: number,
    homography: number[][] | null,
): { x: number; y: number } {
    if (homography) {
        return applyHomography(homography, px, py)
    }
    // Fallback: linear mapping (less precise without calibration)
    return {
        x: (px / frameWidth) * COURT_WIDTH,
        y: (py / frameHeight) * COURT_HEIGHT,
    }
}

// ── Court Zone Classification ──────────────────────────────────

/**
 * Classifies a court position into an NBA/FIBA zone based on official
 * measurements:
 *   - Restricted area: 1.25m radius from basket
 *   - Paint: 5.8m deep × 4.9m wide (centred)
 *   - 3-point line: 6.75m from basket (corners at 6.6m)
 *   - Corners: within 3m of sideline
 *   - Wings: between corners and top-of-key
 */
export function getCourtZone(x: number, y: number): CourtZone {
    const dx = x - BASKET_X
    const dy = y - BASKET_Y
    const distFromBasket = Math.sqrt(dx * dx + dy * dy)

    // Restricted area (semi-circle 1.25m)
    if (distFromBasket <= 1.25) return 'restricted_area'

    // Paint (5.8m deep, 4.9m wide, centred)
    const paintL = (COURT_WIDTH - 4.9) / 2
    const paintR = paintL + 4.9
    if (x >= paintL && x <= paintR && y <= 5.8) return 'paint'

    // Beyond 3-point line or backcourt
    if (distFromBasket > 6.75 || y > COURT_HEIGHT / 2) {
        if (y > COURT_HEIGHT / 2) return 'backcourt'
        // Corner 3s (within 3m of sideline, below the arc break point)
        if (x < 3 && y <= 6.5) return 'corner3_left'
        if (x > COURT_WIDTH - 3 && y <= 6.5) return 'corner3_right'
        // Wings
        if (x < COURT_WIDTH / 2 - 2) return 'wing3_left'
        if (x > COURT_WIDTH / 2 + 2) return 'wing3_right'
        return 'top3'
    }

    // Midrange (between paint and 3PT line)
    if (x < COURT_WIDTH / 3) return 'midrange_left'
    if (x > (COURT_WIDTH * 2) / 3) return 'midrange_right'
    return 'midrange_top'
}

// ── Heatmap Generation ─────────────────────────────────────────

function generateHeatmap(
    positions: PlayerPosition3D[][],
    mainPlayerId: number,
    fps: number,
    cellSize: number = 0.5,
): HeatmapPoint[] {
    const gridW = Math.ceil(COURT_WIDTH / cellSize)
    const gridH = Math.ceil(COURT_HEIGHT / cellSize)
    const grid: Float32Array = new Float32Array(gridW * gridH)

    const timePerFrame = 1 / fps

    for (const frame of positions) {
        const main = frame.find(p => p.playerId === mainPlayerId)
        if (!main) continue

        const gx = Math.min(gridW - 1, Math.max(0, Math.floor(main.x / cellSize)))
        const gy = Math.min(gridH - 1, Math.max(0, Math.floor(main.y / cellSize)))
        grid[gy * gridW + gx] += timePerFrame
    }

    // Only emit cells with non-zero occupancy
    const points: HeatmapPoint[] = []
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            const val = grid[gy * gridW + gx]
            if (val > 0) {
                points.push({
                    x: Math.round((gx * cellSize + cellSize / 2) * 100) / 100,
                    y: Math.round((gy * cellSize + cellSize / 2) * 100) / 100,
                    value: Math.round(val * 100) / 100,
                })
            }
        }
    }

    return points
}

// ── Teleportation Detection ────────────────────────────────────

/** Max plausible movement per frame at 30fps (sprinting ≈ 8m/s → 0.27m/frame) */
const MAX_MOVEMENT_PER_FRAME = 0.5 // metres, with margin

function isValidMovement(
    prev: { x: number; y: number },
    curr: { x: number; y: number },
    fps: number,
): boolean {
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    return dist < MAX_MOVEMENT_PER_FRAME * (30 / fps)
}

// ── Main Pipeline ──────────────────────────────────────────────

export async function reconstruct3DSpace(
    trackingData: TrackingResult[],
    homography?: number[][] | null,
    frameResolution?: { width: number; height: number },
    fps: number = 30,
): Promise<Reconstruction3DResult> {
    const frameW = frameResolution?.width ?? 640
    const frameH = frameResolution?.height ?? 360
    const H = homography ?? null

    const aerialViewPositions: PlayerPosition3D[][] = []
    const playerDistances: PlayerDistance[] = []

    const zoneOccupancy: Record<CourtZone, number> = {
        restricted_area: 0, paint: 0,
        midrange_left: 0, midrange_right: 0, midrange_top: 0,
        corner3_left: 0, corner3_right: 0,
        wing3_left: 0, wing3_right: 0, top3: 0,
        backcourt: 0,
    }

    // Per-player accumulators
    const positionSums: Record<number, { x: number; y: number; count: number }> = {}
    const prevPositions: Record<number, { x: number; y: number }> = {}
    const totalDistance: Record<number, number> = {}
    const maxSpeed: Record<number, number> = {}

    // 1-Euro filter states per player (x, y)
    const filterStatesX: Record<number, OneEuroState | null> = {}
    const filterStatesY: Record<number, OneEuroState | null> = {}

    const timePerFrame = 1 / fps
    let mainPlayerId = 0

    for (let fi = 0; fi < trackingData.length; fi++) {
        const frame = trackingData[fi]
        if (fi === 0) mainPlayerId = frame.mainUserId

        const ts = fi * timePerFrame
        const framePositions: PlayerPosition3D[] = []
        let mainIdx = -1

        for (const player of frame.players) {
            const centerX = player.bbox.x + player.bbox.w / 2
            const feetY = player.bbox.y + player.bbox.h

            // Raw court position
            const raw = pixelToCourtPosition(centerX, feetY, frameW, frameH, H)

            // Clamp to court bounds
            const rawX = Math.max(0, Math.min(COURT_WIDTH, raw.x))
            const rawY = Math.max(0, Math.min(COURT_HEIGHT, raw.y))

            // Apply 1-Euro filter for smooth positions
            const fxResult = oneEuroFilter(filterStatesX[player.id] ?? null, rawX, ts)
            const fyResult = oneEuroFilter(filterStatesY[player.id] ?? null, rawY, ts)
            filterStatesX[player.id] = fxResult.state
            filterStatesY[player.id] = fyResult.state

            const x = Math.max(0, Math.min(COURT_WIDTH, fxResult.filtered))
            const y = Math.max(0, Math.min(COURT_HEIGHT, fyResult.filtered))

            // Elevation estimate
            const depth = estimateDepth(player.bbox.h, frameH)
            const z = Math.max(0, AVG_PLAYER_HEIGHT - (player.bbox.h / frameH) * depth * 0.1)

            // Speed (m/s)
            let speed = 0
            if (prevPositions[player.id]) {
                const prev = prevPositions[player.id]
                if (isValidMovement(prev, { x, y }, fps)) {
                    const dx = x - prev.x
                    const dy = y - prev.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    speed = dist * fps
                    totalDistance[player.id] = (totalDistance[player.id] || 0) + dist
                    maxSpeed[player.id] = Math.max(maxSpeed[player.id] || 0, speed)
                }
                // else: teleportation — skip distance accumulation
            }

            prevPositions[player.id] = { x, y }

            framePositions.push({ playerId: player.id, x, y, z, speed })

            // Track main player's zone, position accumulators
            if (player.id === mainPlayerId) {
                mainIdx = framePositions.length - 1
                const zone = getCourtZone(x, y)
                zoneOccupancy[zone] += timePerFrame
            }

            if (!positionSums[player.id]) {
                positionSums[player.id] = { x: 0, y: 0, count: 0 }
            }
            positionSums[player.id].x += x
            positionSums[player.id].y += y
            positionSums[player.id].count++
        }

        // Player distances: only compute main player vs all others (O(n) instead of O(n²))
        if (mainIdx >= 0) {
            const main = framePositions[mainIdx]
            for (let j = 0; j < framePositions.length; j++) {
                if (j === mainIdx) continue
                const other = framePositions[j]
                const dx = main.x - other.x
                const dy = main.y - other.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                playerDistances.push({
                    playerA: main.playerId,
                    playerB: other.playerId,
                    distance: Math.round(dist * 100) / 100,
                    frameIndex: fi,
                })
            }
        }

        aerialViewPositions.push(framePositions)
    }

    // Average positions
    const averagePositions: Record<number, { x: number; y: number }> = {}
    for (const [id, sum] of Object.entries(positionSums)) {
        averagePositions[Number(id)] = {
            x: Math.round((sum.x / sum.count) * 100) / 100,
            y: Math.round((sum.y / sum.count) * 100) / 100,
        }
    }

    // Totals
    const totalDistanceCovered: Record<number, number> = {}
    for (const [id, dist] of Object.entries(totalDistance)) {
        totalDistanceCovered[Number(id)] = Math.round(dist * 100) / 100
    }

    const maxSpeedResult: Record<number, number> = {}
    for (const [id, spd] of Object.entries(maxSpeed)) {
        maxSpeedResult[Number(id)] = Math.round(spd * 100) / 100
    }

    // Round zone occupancy
    for (const zone of Object.keys(zoneOccupancy) as CourtZone[]) {
        zoneOccupancy[zone] = Math.round(zoneOccupancy[zone] * 100) / 100
    }

    // Heatmap
    const heatmapData = generateHeatmap(aerialViewPositions, mainPlayerId, fps)

    return {
        heatmapData,
        aerialViewPositions,
        playerDistances,
        zoneOccupancy,
        averagePositions,
        totalDistanceCovered,
        maxSpeed: maxSpeedResult,
    }
}

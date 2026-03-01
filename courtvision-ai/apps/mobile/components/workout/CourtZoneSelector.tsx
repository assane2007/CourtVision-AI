/**
 * CourtZoneSelector — Interactive NBA Zone Selector
 *
 * Premium SVG half-court with accurate NBA geometry and curved zone shapes
 * matching real court boundaries (arcs, restricted area, paint).
 *
 * 11 interactive zones with color-coded FG% and NBA comparison labels.
 * Uses mathematically correct 3-point arc (23.75ft radius), restricted area
 * arc (4ft), and NBA-regulation paint dimensions.
 *
 * Design V4 "Apex": deep space background, amber glow on selection.
 *
 * Skills applied:
 *   - rendering-svg-precision: all coords to 1 decimal
 *   - mobile-performance: memo'd sub-components, StyleSheet
 *   - rendering-animate-svg-wrapper: animation on Animated.View wrapper
 */

import React, { memo, useMemo, useCallback } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, {
    Path, Rect, Circle as SvgCircle, Line as SvgLine, G, Text as SvgText,
    Defs, LinearGradient, Stop,
} from 'react-native-svg'
import Animated, { FadeIn } from 'react-native-reanimated'
import { T } from '../../lib/theme'

// ── Types ──────────────────────────────────────────────────────

export interface ZoneStats {
    attempts: number
    made: number
    pct: number
}

export interface CourtZoneData {
    restrictedArea: ZoneStats
    paint: ZoneStats
    midRangeLeft: ZoneStats
    midRangeRight: ZoneStats
    midRangeCenter: ZoneStats
    corner3Left: ZoneStats
    corner3Right: ZoneStats
    wing3Left: ZoneStats
    wing3Right: ZoneStats
    topKey3: ZoneStats
    freeThrow: ZoneStats
}

interface CourtZoneSelectorProps {
    data: Partial<CourtZoneData>
    onSelectZone?: (zone: keyof CourtZoneData) => void
    selectedZone?: keyof CourtZoneData | null
    compact?: boolean
    showNbaComparison?: boolean
}

// ── NBA Half-Court (baseline at bottom) ────────────────────────
// 50ft wide × 47ft deep → SVG 500 × 470
const W = 500
const H = 470
const BASKET_X = 250
const BASKET_Y = H - 52.5    // 5.25ft from baseline (bottom)
const PAINT_L = 170           // (500 - 160) / 2
const PAINT_R = 330
const PAINT_TOP = H - 190    // 19ft from baseline
const THREE_R = 237.5        // 23.75ft
const RESTRICT_R = 40        // 4ft
const CORNER_X = 30          // 3ft from sideline
const CORNER_H_FROM_BASE = 140
const FT_R = 60              // 6ft FT circle radius

// ── NBA 2023-24 Zone Averages ──────────────────────────────────

const NBA_ZONE_AVG: Record<keyof CourtZoneData, number> = {
    restrictedArea: 65.5,
    paint: 42.8,
    midRangeLeft: 42.2,
    midRangeRight: 42.5,
    midRangeCenter: 44.0,
    corner3Left: 38.5,
    corner3Right: 39.0,
    wing3Left: 37.2,
    wing3Right: 37.0,
    topKey3: 36.5,
    freeThrow: 78.0,
}

// ── Helpers ────────────────────────────────────────────────────

function getZoneColor(pct: number, attempts: number): string {
    if (attempts === 0) return 'rgba(255,255,255,0.05)'
    if (pct >= 55) return 'rgba(0,198,122,0.50)'
    if (pct >= 45) return 'rgba(0,198,122,0.28)'
    if (pct >= 35) return 'rgba(255,186,0,0.32)'
    if (pct >= 25) return 'rgba(255,107,0,0.32)'
    return 'rgba(255,58,94,0.32)'
}

function getTextColor(pct: number, attempts: number): string {
    if (attempts === 0) return 'rgba(255,255,255,0.25)'
    if (pct >= 45) return T.color.semantic.success
    if (pct >= 35) return T.color.semantic.warning
    return T.color.semantic.error
}

// Precision helper — round to 1 decimal
const r1 = (n: number) => Math.round(n * 10) / 10

// Generate arc path points on a circle
function arcPoints(cx: number, cy: number, radius: number, startDeg: number, endDeg: number, segments: number): string[] {
    const pts: string[] = []
    for (let i = 0; i <= segments; i++) {
        const angle = ((startDeg + (i / segments) * (endDeg - startDeg)) * Math.PI) / 180
        pts.push(`${r1(cx + radius * Math.cos(angle))} ${r1(cy - radius * Math.sin(angle))}`)
    }
    return pts
}

// ── Zone Path Builders ─────────────────────────────────────────

/** Restricted area: semi-circle under the basket */
function restrictedAreaPath(): string {
    const pts = arcPoints(BASKET_X, BASKET_Y, RESTRICT_R, 180, 0, 16)
    return `M ${BASKET_X - RESTRICT_R} ${BASKET_Y} ` + pts.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ') + ` L ${BASKET_X + RESTRICT_R} ${H} L ${BASKET_X - RESTRICT_R} ${H} Z`
}

/** Paint (excluding restricted area) */
function paintPath(): string {
    // Bottom of paint is baseline, top is PAINT_TOP
    // Exclude the restricted area at the bottom
    const restrictArc = arcPoints(BASKET_X, BASKET_Y, RESTRICT_R, 0, 180, 16)
    return `M ${PAINT_L} ${PAINT_TOP} L ${PAINT_R} ${PAINT_TOP} L ${PAINT_R} ${H} L ${BASKET_X + RESTRICT_R} ${H} ` +
        restrictArc.map(p => `L ${p}`).join(' ') +
        ` L ${BASKET_X - RESTRICT_R} ${H} L ${PAINT_L} ${H} Z`
}

/** Mid-range left: between paint left edge and 3PT line, left side */
function midLeftPath(): string {
    // Left boundary: 3PT corner line (x=CORNER_X) up to where arc starts
    // Right boundary: paint left edge (x=PAINT_L)
    // Top: the 3PT arc segment on the left side
    // Bottom: baseline
    const arcPts = arcPoints(BASKET_X, BASKET_Y, THREE_R, 190, 240, 10)
    return `M ${CORNER_X} ${H} L ${CORNER_X} ${H - CORNER_H_FROM_BASE} ` +
        arcPts.map(p => `L ${p}`).join(' ') +
        ` L ${PAINT_L} ${PAINT_TOP} L ${PAINT_L} ${H} Z`
}

/** Mid-range right */
function midRightPath(): string {
    const arcPts = arcPoints(BASKET_X, BASKET_Y, THREE_R, 300, 350, 10)
    return `M ${PAINT_R} ${H} L ${PAINT_R} ${PAINT_TOP} ` +
        arcPts.map(p => `L ${p}`).join(' ') +
        ` L ${W - CORNER_X} ${H - CORNER_H_FROM_BASE} L ${W - CORNER_X} ${H} Z`
}

/** Mid-range center (above paint, below 3PT arc) */
function midCenterPath(): string {
    const arcPts = arcPoints(BASKET_X, BASKET_Y, THREE_R, 240, 300, 12)
    return `M ${PAINT_L} ${PAINT_TOP} ` +
        arcPts.map(p => `L ${p}`).join(' ') +
        ` L ${PAINT_R} ${PAINT_TOP} Z`
}

/** Corner 3 left */
function corner3LeftPath(): string {
    return `M 0 ${H} L ${CORNER_X} ${H} L ${CORNER_X} ${H - CORNER_H_FROM_BASE} L 0 ${H - CORNER_H_FROM_BASE} Z`
}

/** Corner 3 right */
function corner3RightPath(): string {
    return `M ${W - CORNER_X} ${H} L ${W} ${H} L ${W} ${H - CORNER_H_FROM_BASE} L ${W - CORNER_X} ${H - CORNER_H_FROM_BASE} Z`
}

/** Wing 3 left */
function wing3LeftPath(): string {
    const inner = arcPoints(BASKET_X, BASKET_Y, THREE_R, 190, 240, 10)
    return `M 0 ${H - CORNER_H_FROM_BASE} L ${CORNER_X} ${H - CORNER_H_FROM_BASE} ` +
        inner.map(p => `L ${p}`).join(' ') +
        ` L 0 ${r1(BASKET_Y - THREE_R * Math.sin((240 * Math.PI) / 180))} Z`
}

/** Wing 3 right */
function wing3RightPath(): string {
    const inner = arcPoints(BASKET_X, BASKET_Y, THREE_R, 300, 350, 10)
    return `M ${W - CORNER_X} ${H - CORNER_H_FROM_BASE} L ${W} ${H - CORNER_H_FROM_BASE} L ${W} ${r1(BASKET_Y - THREE_R * Math.sin((300 * Math.PI) / 180))} ` +
        [...inner].reverse().map(p => `L ${p}`).join(' ') + ' Z'
}

/** Top of key 3 */
function topKey3Path(): string {
    // The top arc portion + sides going to the edge
    const arcPts = arcPoints(BASKET_X, BASKET_Y, THREE_R, 240, 300, 16)
    // Outer boundary is the top of the court (y=0)
    const leftArc = arcPts[0].split(' ')
    const rightArc = arcPts[arcPts.length - 1].split(' ')
    return `M 0 0 L ${W} 0 L ${W} ${H - CORNER_H_FROM_BASE} L ${W} ${rightArc[1]} ` +
        [...arcPts].reverse().map(p => `L ${p}`).join(' ') +
        ` L 0 ${leftArc[1]} Z`
}

// ── Court Lines Component ──────────────────────────────────────

const CourtLines = memo(() => {
    const LINE = 'rgba(255,255,255,0.14)'
    const LINE_THIN = 'rgba(255,255,255,0.08)'

    // 3PT arc path (full, for rendering on top of zone fills)
    const threeArcPts = arcPoints(BASKET_X, BASKET_Y, THREE_R, 350, 190, 32)
    const threeArc = `M ${CORNER_X} ${H} L ${CORNER_X} ${H - CORNER_H_FROM_BASE} ` +
        threeArcPts.map(p => `L ${p}`).join(' ') +
        ` L ${W - CORNER_X} ${H - CORNER_H_FROM_BASE} L ${W - CORNER_X} ${H}`

    const restrictArc = arcPoints(BASKET_X, BASKET_Y, RESTRICT_R, 180, 0, 16)
    const restrictPath = restrictArc.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')

    const ftCirclePts = arcPoints(BASKET_X, H - 190, FT_R, 0, 360, 24)
    const ftCircle = ftCirclePts.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ') + ' Z'

    return (
        <G>
            {/* Court outline */}
            <Rect x="0" y="0" width={W} height={H} fill="none" stroke={LINE} strokeWidth="1.5" rx="4" />

            {/* Baseline */}
            <SvgLine x1={0} y1={H} x2={W} y2={H} stroke={LINE} strokeWidth="1.5" />

            {/* Paint */}
            <Rect x={PAINT_L} y={PAINT_TOP} width={PAINT_R - PAINT_L} height={190}
                fill="none" stroke={LINE} strokeWidth="1.2" />

            {/* Free throw circle */}
            <Path d={ftCircle} fill="none" stroke={LINE_THIN} strokeWidth="0.8" />

            {/* Restricted area */}
            <Path d={restrictPath} fill="none" stroke={LINE_THIN} strokeWidth="0.8" />

            {/* 3PT line */}
            <Path d={threeArc} fill="none" stroke={LINE} strokeWidth="1.3" />

            {/* Backboard */}
            <SvgLine x1={220} y1={H - 40} x2={280} y2={H - 40} stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />

            {/* Rim */}
            <SvgCircle cx={BASKET_X} cy={BASKET_Y} r={9}
                stroke={T.color.signature.primary} strokeWidth="1.5"
                fill="rgba(255,107,0,0.12)" />
        </G>
    )
})

// ── Zone Label Sub-Component ───────────────────────────────────

interface ZoneLabelProps {
    zone: keyof CourtZoneData
    x: number
    y: number
    stats: ZoneStats
    isSelected: boolean
    compact: boolean
    showNba: boolean
}

const ZoneLabel = memo(({ zone, x, y, stats, isSelected, compact, showNba }: ZoneLabelProps) => {
    const color = getTextColor(stats.pct, stats.attempts)
    return (
        <G>
            {isSelected && (
                <SvgCircle cx={x} cy={y} r={28} fill="rgba(255,107,0,0.12)"
                    stroke={T.color.signature.primary} strokeWidth="1.5" />
            )}
            <SvgText x={x} y={y - 6} fill={color}
                fontSize={compact ? 13 : 15} fontWeight="bold" textAnchor="middle"
                opacity={isSelected ? 1 : 0.9}>
                {stats.attempts > 0 ? `${Math.round(stats.pct)}%` : '—'}
            </SvgText>
            <SvgText x={x} y={y + 9} fill="rgba(255,255,255,0.4)"
                fontSize={compact ? 9 : 10} textAnchor="middle">
                {stats.attempts > 0 ? `${stats.made}/${stats.attempts}` : '0 tirs'}
            </SvgText>
            {showNba && stats.attempts > 0 && (
                <SvgText x={x} y={y + 21}
                    fill={stats.pct >= NBA_ZONE_AVG[zone] ? 'rgba(0,198,122,0.7)' : 'rgba(255,58,94,0.7)'}
                    fontSize={8} textAnchor="middle">
                    NBA: {NBA_ZONE_AVG[zone]}%
                </SvgText>
            )}
        </G>
    )
})

// ── Zone Definitions ───────────────────────────────────────────

const ZONE_DEFS: { key: keyof CourtZoneData; pathFn: () => string; labelX: number; labelY: number }[] = [
    { key: 'restrictedArea', pathFn: restrictedAreaPath, labelX: BASKET_X, labelY: H - 25 },
    { key: 'paint', pathFn: paintPath, labelX: BASKET_X, labelY: PAINT_TOP + 55 },
    { key: 'midRangeLeft', pathFn: midLeftPath, labelX: 100, labelY: H - 80 },
    { key: 'midRangeRight', pathFn: midRightPath, labelX: 400, labelY: H - 80 },
    { key: 'midRangeCenter', pathFn: midCenterPath, labelX: BASKET_X, labelY: PAINT_TOP - 40 },
    { key: 'corner3Left', pathFn: corner3LeftPath, labelX: 15, labelY: H - 50 },
    { key: 'corner3Right', pathFn: corner3RightPath, labelX: W - 15, labelY: H - 50 },
    { key: 'wing3Left', pathFn: wing3LeftPath, labelX: 35, labelY: H - 195 },
    { key: 'wing3Right', pathFn: wing3RightPath, labelX: W - 35, labelY: H - 195 },
    { key: 'topKey3', pathFn: topKey3Path, labelX: BASKET_X, labelY: 60 },
]

// ── Main Component ─────────────────────────────────────────────

export function CourtZoneSelector({
    data,
    onSelectZone,
    selectedZone = null,
    compact = false,
    showNbaComparison = false,
}: CourtZoneSelectorProps) {
    const empty: ZoneStats = { attempts: 0, made: 0, pct: 0 }

    const zones = useMemo(() => ({
        restrictedArea: data.restrictedArea ?? empty,
        paint: data.paint ?? empty,
        midRangeLeft: data.midRangeLeft ?? empty,
        midRangeRight: data.midRangeRight ?? empty,
        midRangeCenter: data.midRangeCenter ?? empty,
        corner3Left: data.corner3Left ?? empty,
        corner3Right: data.corner3Right ?? empty,
        wing3Left: data.wing3Left ?? empty,
        wing3Right: data.wing3Right ?? empty,
        topKey3: data.topKey3 ?? empty,
        freeThrow: data.freeThrow ?? empty,
    }), [data])

    // Pre-compute zone paths (memoized)
    const zonePaths = useMemo(() =>
        ZONE_DEFS.map(z => ({ ...z, path: z.pathFn() })),
    [])

    const handlePress = useCallback((zone: keyof CourtZoneData) => {
        onSelectZone?.(zone)
    }, [onSelectZone])

    return (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.container, compact && styles.compact]}>
            <Svg width={W * 0.64} height={H * 0.64} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                <Defs>
                    <LinearGradient id="zoneFloor" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="rgba(255,107,0,0.04)" />
                        <Stop offset="1" stopColor="rgba(255,107,0,0.01)" />
                    </LinearGradient>
                </Defs>

                {/* Court background */}
                <Rect x="0" y="0" width={W} height={H} rx="6" fill="url(#zoneFloor)" />

                {/* Zone fill areas — curved shapes */}
                {zonePaths.map(({ key, path }) => {
                    const stats = zones[key]
                    const isSelected = selectedZone === key
                    return (
                        <Path
                            key={key}
                            d={path}
                            fill={getZoneColor(stats.pct, stats.attempts)}
                            stroke={isSelected ? T.color.signature.primary : 'rgba(255,255,255,0.04)'}
                            strokeWidth={isSelected ? 2.5 : 0.5}
                            onPress={() => handlePress(key)}
                        />
                    )
                })}

                {/* Court lines on top of fills */}
                <CourtLines />

                {/* Zone labels */}
                {zonePaths.map(({ key, labelX, labelY }) => (
                    <ZoneLabel
                        key={`lbl-${key}`}
                        zone={key}
                        x={labelX}
                        y={labelY}
                        stats={zones[key]}
                        isSelected={selectedZone === key}
                        compact={compact}
                        showNba={showNbaComparison}
                    />
                ))}

                {/* Free throw label (uses paint area, separate label) */}
                {zones.freeThrow.attempts > 0 && (
                    <ZoneLabel
                        zone="freeThrow"
                        x={BASKET_X}
                        y={PAINT_TOP + 15}
                        stats={zones.freeThrow}
                        isSelected={selectedZone === 'freeThrow'}
                        compact={compact}
                        showNba={showNbaComparison}
                    />
                )}
            </Svg>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    compact: {
        transform: [{ scale: 0.85 }],
    },
})

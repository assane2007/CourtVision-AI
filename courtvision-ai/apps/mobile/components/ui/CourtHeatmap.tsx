/**
 * CourtHeatmap — Premium SVG Half-Court Heatmap
 *
 * Renders an NBA half-court with gradient heat zones showing shot accuracy
 * per zone. Uses proper mathematical arc construction for the 3-point line
 * and accurate court proportions based on NBA official dimensions.
 *
 * Skills applied:
 *   - rendering-svg-precision: coordinates to 1 decimal
 *   - rendering-animate-svg-wrapper: animation on wrapper View
 *   - mobile-performance: memoized sub-components, StyleSheet
 */

import React, { memo, useMemo } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, {
    Path, Circle, Rect, G, Line, Defs,
    LinearGradient, RadialGradient, Stop, Ellipse,
    Text as SvgText,
} from 'react-native-svg'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { T } from '../../lib/theme'
import { CVText } from './CVText'
import { GlassCard } from './GlassCard'

const { width: SCREEN_W } = Dimensions.get('window')

// ── NBA Half-Court SVG Viewport ────────────────────────────────
// 50ft wide × 47ft deep → 500 × 470 SVG units (1ft = 10 units)
const VB_W = 500
const VB_H = 470

// Key court measurements (SVG units = ft × 10)
const BASKET_X = 250        // Center
const BASKET_Y = 52.5       // 5.25ft from baseline
const PAINT_W = 160          // 16ft wide
const PAINT_H = 190          // 19ft deep
const FT_CIRCLE_R = 60       // 6ft radius
const THREE_PT_R = 237.5     // 23.75ft radius
const RESTRICTED_R = 40      // 4ft radius
const CORNER_3_X = 30        // 3ft from sideline
const CORNER_3_H = 140       // Corner 3 height (where arc meets sideline)

interface ShotZone {
    id: string
    /** Court x 0-100 */
    x: number
    /** Court y 0-100 */
    y: number
    /** FG% 0-100 */
    accuracy: number
    /** Number of shots */
    shots: number
}

interface CourtHeatmapProps {
    data: ShotZone[]
    onZonePress?: (zone: ShotZone) => void
    width?: number
    /** Title above the heatmap */
    title?: string
}

// ── Geometry: NBA 3PT Arc ──────────────────────────────────────

function build3PtArc(segments: number = 32): string {
    // Corner lines + arc from left corner to right corner
    const parts: string[] = []

    // Left corner line (baseline to where arc begins)
    parts.push(`M ${CORNER_3_X} ${VB_H}`)
    parts.push(`L ${CORNER_3_X} ${VB_H - CORNER_3_H}`)

    // Arc from left to right (over the top)
    for (let i = 0; i <= segments; i++) {
        // Sweep from left (~192°) to right (~348°)
        const startAngle = Math.PI + 0.15
        const endAngle = 2 * Math.PI - 0.15
        const angle = startAngle + (i / segments) * (endAngle - startAngle)
        const x = BASKET_X + THREE_PT_R * Math.cos(angle)
        const y = (VB_H - BASKET_Y) - THREE_PT_R * Math.sin(angle)
        const rx = Math.round(x * 10) / 10
        const ry = Math.round(y * 10) / 10
        parts.push(`L ${rx} ${ry}`)
    }

    // Right corner line
    parts.push(`L ${VB_W - CORNER_3_X} ${VB_H - CORNER_3_H}`)
    parts.push(`L ${VB_W - CORNER_3_X} ${VB_H}`)

    return parts.join(' ')
}

function buildRestrictedArc(segments: number = 16): string {
    const parts: string[] = []
    for (let i = 0; i <= segments; i++) {
        const angle = Math.PI + (i / segments) * Math.PI
        const x = BASKET_X + RESTRICTED_R * Math.cos(angle)
        const y = (VB_H - BASKET_Y) + RESTRICTED_R * Math.sin(angle)
        const rx = Math.round(x * 10) / 10
        const ry = Math.round(y * 10) / 10
        parts.push(i === 0 ? `M ${rx} ${ry}` : `L ${rx} ${ry}`)
    }
    return parts.join(' ')
}

function buildFTCircle(segments: number = 24): string {
    const cx = BASKET_X
    const cy = VB_H - PAINT_H
    const parts: string[] = []
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const x = cx + FT_CIRCLE_R * Math.cos(angle)
        const y = cy + FT_CIRCLE_R * Math.sin(angle)
        const rx = Math.round(x * 10) / 10
        const ry = Math.round(y * 10) / 10
        parts.push(i === 0 ? `M ${rx} ${ry}` : `L ${rx} ${ry}`)
    }
    parts.push('Z')
    return parts.join(' ')
}

// ── Zone Color by Accuracy ─────────────────────────────────────

function getHeatColor(accuracy: number): { fill: string; glow: string } {
    if (accuracy >= 60) return { fill: 'rgba(0,198,122,0.6)', glow: 'rgba(0,198,122,0.3)' }
    if (accuracy >= 50) return { fill: 'rgba(0,198,122,0.4)', glow: 'rgba(0,198,122,0.2)' }
    if (accuracy >= 40) return { fill: 'rgba(255,186,0,0.5)', glow: 'rgba(255,186,0,0.25)' }
    if (accuracy >= 30) return { fill: 'rgba(255,107,0,0.45)', glow: 'rgba(255,107,0,0.2)' }
    return { fill: 'rgba(255,58,94,0.45)', glow: 'rgba(255,58,94,0.2)' }
}

// ── Court Lines (memoized) ─────────────────────────────────────

const CourtLines = memo(() => {
    const threeArc = useMemo(() => build3PtArc(), [])
    const restrictedArc = useMemo(() => buildRestrictedArc(), [])
    const ftCircle = useMemo(() => buildFTCircle(), [])

    const paintL = (VB_W - PAINT_W) / 2
    const paintR = (VB_W + PAINT_W) / 2
    const paintTop = VB_H - PAINT_H

    const LINE = 'rgba(255,255,255,0.12)'

    return (
        <G>
            {/* Court outline */}
            <Rect x="0" y="0" width={VB_W} height={VB_H} fill="none" stroke={LINE} strokeWidth="1.5" />

            {/* Hardwood grain lines */}
            {Array.from({ length: 10 }, (_, i) => {
                const bx = (VB_W / 10) * i
                return (
                    <Line key={`g${i}`} x1={bx} y1={0} x2={bx} y2={VB_H}
                        stroke={i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.025)'}
                        strokeWidth="0.5" />
                )
            })}

            {/* Paint */}
            <Rect x={paintL} y={paintTop} width={PAINT_W} height={PAINT_H}
                fill="rgba(255,107,0,0.03)" stroke={LINE} strokeWidth="1.2" />

            {/* Free throw line */}
            <Line x1={paintL} y1={paintTop} x2={paintR} y2={paintTop} stroke={LINE} strokeWidth="1.2" />

            {/* Free throw circle */}
            <Path d={ftCircle} fill="none" stroke={LINE} strokeWidth="0.8" />

            {/* Restricted area */}
            <Path d={restrictedArc} fill="rgba(255,107,0,0.02)" stroke={LINE} strokeWidth="0.8" />

            {/* 3-point line */}
            <Path d={threeArc} fill="none" stroke={LINE} strokeWidth="1.3" />

            {/* Backboard */}
            <Line x1={220} y1={VB_H - 40} x2={280} y2={VB_H - 40} stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />

            {/* Rim */}
            <Circle cx={BASKET_X} cy={VB_H - BASKET_Y} r={9} fill="rgba(255,107,0,0.12)" stroke="#FF6B00" strokeWidth="1.5" />
        </G>
    )
})

// ── Heat Zone Bubble ───────────────────────────────────────────

interface HeatBubbleProps {
    zone: ShotZone
}

const HeatBubble = memo(({ zone }: HeatBubbleProps) => {
    // Map 0-100 coords to SVG viewport
    const cx = Math.round((zone.x / 100) * VB_W * 10) / 10
    const cy = Math.round((zone.y / 100) * VB_H * 10) / 10
    const { fill, glow } = getHeatColor(zone.accuracy)

    // Size based on shot volume (min 18, max 40)
    const r = Math.min(40, Math.max(18, 14 + zone.shots * 1.5))
    const glowR = r * 1.8

    return (
        <G>
            {/* Outer glow */}
            <Circle cx={cx} cy={cy} r={glowR} fill={glow} opacity={0.6} />
            {/* Core heat */}
            <Circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.85} />
            {/* Center dot */}
            <Circle cx={cx} cy={cy} r={Math.max(4, r * 0.25)} fill={fill} opacity={1} />
            {/* Percentage label */}
            <SvgText
                x={cx}
                y={cy + 4}
                fill="white"
                fontSize="13"
                fontWeight="bold"
                textAnchor="middle"
                opacity={0.95}
            >
                {Math.round(zone.accuracy)}%
            </SvgText>
        </G>
    )
})

// ── Main Component ─────────────────────────────────────────────

function CourtHeatmapInner({ data, onZonePress, width, title }: CourtHeatmapProps) {
    const courtW = width ?? SCREEN_W - T.spacing[8]
    const courtH = Math.round(courtW * (VB_H / VB_W))

    return (
        <GlassCard padding={0} style={styles.card}>
            {title && (
                <Animated.Text entering={FadeInDown.delay(50).duration(300)} style={styles.title}>
                    {title}
                </Animated.Text>
            )}

            <Animated.View entering={FadeIn.duration(500)} style={[styles.courtWrap, { width: courtW, height: courtH }]}>
                {/* Ambient glow */}
                <View style={styles.ambientGlow} />

                <Svg width={courtW} height={courtH} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
                    <Defs>
                        <LinearGradient id="heatFloor" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#1A1408" />
                            <Stop offset="0.5" stopColor="#140F08" />
                            <Stop offset="1" stopColor="#0A0804" />
                        </LinearGradient>
                    </Defs>

                    {/* Court floor */}
                    <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#heatFloor)" />

                    {/* Court lines (memoized) */}
                    <CourtLines />

                    {/* Heat zones */}
                    {data.map(zone => (
                        <HeatBubble key={zone.id} zone={zone} />
                    ))}
                </Svg>
            </Animated.View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={[styles.legendDot, { backgroundColor: T.color.semantic.success }]} />
                <CVText preset="caption" color="secondary">Elite</CVText>
                <View style={[styles.legendDot, { backgroundColor: T.color.semantic.warning, marginLeft: 10 }]} />
                <CVText preset="caption" color="secondary">Avg</CVText>
                <View style={[styles.legendDot, { backgroundColor: T.color.semantic.error, marginLeft: 10 }]} />
                <CVText preset="caption" color="secondary">Cold</CVText>
            </View>
        </GlassCard>
    )
}

export const CourtHeatmap = memo(CourtHeatmapInner)

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
    },
    title: {
        color: T.color.text.primary,
        fontFamily: T.fonts.display.bold,
        fontSize: T.fontSize.sm,
        letterSpacing: -0.2,
        paddingHorizontal: T.spacing[4],
        paddingTop: T.spacing[3],
        paddingBottom: T.spacing[2],
    },
    courtWrap: {
        borderRadius: T.radius.md,
        overflow: 'hidden',
        position: 'relative',
    },
    ambientGlow: {
        position: 'absolute',
        top: '35%',
        left: '25%',
        width: '50%',
        height: '30%',
        borderRadius: 100,
        backgroundColor: 'rgba(255,107,0,0.025)',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
})

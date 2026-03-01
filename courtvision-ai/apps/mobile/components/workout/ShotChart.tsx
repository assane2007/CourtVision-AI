/**
 * ShotChart — Premium SVG Half-Court Shot Chart
 *
 * Dark hardwood-style court with made (amber glow) / missed (red X) markers.
 * Uses mathematically correct NBA court geometry: 23.75ft 3PT arc, 4ft
 * restricted area, 16ft paint, and proper free throw circle.
 *
 * Design V4 "Apex": deep space court floor, amber shot glow, red miss marks.
 *
 * Skills applied:
 *   - rendering-svg-precision: coordinates to 1 decimal
 *   - rendering-animate-svg-wrapper: animation on Animated.View wrapper
 *   - mobile-performance: memo'd sub-components, StyleSheet, no inline objects
 */
import { memo, useMemo } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, {
    Rect, Circle, Line, Path, G, Defs,
    LinearGradient, Stop, Text as SvgText,
} from 'react-native-svg'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { T } from '../../lib/theme'

const { width: SCREEN_W } = Dimensions.get('window')

// ── Types ──────────────────────────────────────────────────────

interface Shot {
    x: number  // 0-100 court coordinates
    y: number  // 0-100 court coordinates
    made: boolean
    zone?: string
}

interface ShotChartProps {
    shots: Shot[]
    width?: number
    height?: number
    onZonePress?: (zone: string) => void
    showZones?: boolean
    highlightedZone?: string
    /** Title above the chart */
    title?: string
}

// ── SVG Viewport (NBA half-court) ──────────────────────────────
// 50ft × 47ft → 500 × 470  (1ft = 10 SVG units)
const VB_W = 500
const VB_H = 470
const BASKET_X = 250
const BASKET_Y = VB_H - 52.5    // baseline at bottom
const PAINT_L = 170
const PAINT_R = 330
const PAINT_TOP = VB_H - 190
const THREE_R = 237.5
const RESTRICT_R = 40
const CORNER_X = 30
const CORNER_H = 140
const FT_R = 60

// ── Colors ─────────────────────────────────────────────────────

const MADE_COLOR = '#FF6B00'      // Amber Blaze
const MADE_GLOW = 'rgba(255,107,0,0.45)'
const MISSED_COLOR = '#FF375F'
const MISSED_GLOW = 'rgba(255,55,95,0.3)'
const LINE_COLOR = 'rgba(255,255,255,0.10)'
const LINE_FAINT = 'rgba(255,255,255,0.06)'

// ── Precision helper ───────────────────────────────────────────
const r1 = (n: number) => Math.round(n * 10) / 10

// ── Arc builder ────────────────────────────────────────────────
function arcPath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number, segs: number): string {
    const pts: string[] = []
    for (let i = 0; i <= segs; i++) {
        const a = ((startDeg + (i / segs) * (endDeg - startDeg)) * Math.PI) / 180
        pts.push(i === 0
            ? `M ${r1(cx + radius * Math.cos(a))} ${r1(cy - radius * Math.sin(a))}`
            : `L ${r1(cx + radius * Math.cos(a))} ${r1(cy - radius * Math.sin(a))}`)
    }
    return pts.join(' ')
}

// ── Court Lines (memoized) ─────────────────────────────────────

const CourtLines = memo(() => {
    // 3PT arc from left corner to right corner
    const three = `M ${CORNER_X} ${VB_H} L ${CORNER_X} ${VB_H - CORNER_H} ` +
        (() => {
            const pts: string[] = []
            for (let i = 0; i <= 32; i++) {
                const deg = 190 + (i / 32) * 160 // 190° to 350°
                const a = (deg * Math.PI) / 180
                pts.push(`L ${r1(BASKET_X + THREE_R * Math.cos(a))} ${r1(BASKET_Y - THREE_R * Math.sin(a))}`)
            }
            return pts.join(' ')
        })() +
        ` L ${VB_W - CORNER_X} ${VB_H - CORNER_H} L ${VB_W - CORNER_X} ${VB_H}`

    // Restricted area arc
    const restrict = arcPath(BASKET_X, BASKET_Y, RESTRICT_R, 180, 0, 16)

    // Free throw circle
    const ftPts: string[] = []
    for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2
        const cmd = i === 0 ? 'M' : 'L'
        ftPts.push(`${cmd} ${r1(BASKET_X + FT_R * Math.cos(a))} ${r1(PAINT_TOP + FT_R * Math.sin(a))}`)
    }
    const ftCircle = ftPts.join(' ') + ' Z'

    return (
        <G>
            {/* Court outline */}
            <Rect x="0" y="0" width={VB_W} height={VB_H} fill="none" stroke={LINE_COLOR} strokeWidth="1.5" />

            {/* Subtle hardwood grain */}
            {Array.from({ length: 10 }, (_, i) => (
                <Line key={`g${i}`}
                    x1={(VB_W / 10) * i} y1={0}
                    x2={(VB_W / 10) * i} y2={VB_H}
                    stroke={i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.02)'}
                    strokeWidth="0.5" />
            ))}

            {/* Paint */}
            <Rect x={PAINT_L} y={PAINT_TOP} width={PAINT_R - PAINT_L} height={190}
                fill="rgba(255,107,0,0.02)" stroke={LINE_COLOR} strokeWidth="1" />

            {/* Free throw line */}
            <Line x1={PAINT_L} y1={PAINT_TOP} x2={PAINT_R} y2={PAINT_TOP} stroke={LINE_COLOR} strokeWidth="1" />

            {/* Free throw circle */}
            <Path d={ftCircle} fill="none" stroke={LINE_FAINT} strokeWidth="0.8" />

            {/* Restricted area */}
            <Path d={restrict} fill="none" stroke={LINE_FAINT} strokeWidth="0.8" />

            {/* 3PT */}
            <Path d={three} fill="none" stroke={LINE_COLOR} strokeWidth="1.2" />

            {/* Backboard */}
            <Line x1={220} y1={VB_H - 40} x2={280} y2={VB_H - 40} stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />

            {/* Rim */}
            <Circle cx={BASKET_X} cy={BASKET_Y} r={9}
                fill="rgba(255,107,0,0.1)" stroke={MADE_COLOR} strokeWidth="1.5" />
        </G>
    )
})

// ── Shot Marker (memoized) ─────────────────────────────────────

interface MarkerProps {
    shot: Shot
}

const ShotMarker = memo(({ shot }: MarkerProps) => {
    // Map 0-100 to SVG viewport
    const sx = r1((shot.x / 100) * VB_W)
    const sy = r1((shot.y / 100) * VB_H)

    if (shot.made) {
        return (
            <G>
                <Circle cx={sx} cy={sy} r={10} fill={MADE_GLOW} opacity={0.5} />
                <Circle cx={sx} cy={sy} r={5} fill={MADE_COLOR} opacity={0.92} />
            </G>
        )
    }

    const s = 4.5
    return (
        <G>
            <Circle cx={sx} cy={sy} r={8} fill={MISSED_GLOW} opacity={0.3} />
            <Line x1={sx - s} y1={sy - s} x2={sx + s} y2={sy + s}
                stroke={MISSED_COLOR} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={sx + s} y1={sy - s} x2={sx - s} y2={sy + s}
                stroke={MISSED_COLOR} strokeWidth={2.5} strokeLinecap="round" />
        </G>
    )
})

// ── Main Component ─────────────────────────────────────────────

function ShotChartInner({
    shots,
    width = SCREEN_W - 32,
    height,
    showZones = false,
    title,
}: ShotChartProps) {
    // Compute height from aspect ratio if not provided
    const svgH = height ?? Math.round(width * (VB_H / VB_W))

    const madeCount = useMemo(() => shots.filter(s => s.made).length, [shots])
    const total = shots.length
    const fgPct = total > 0 ? Math.round((madeCount / total) * 100) : 0

    return (
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <View style={[styles.container, { width, height: svgH }]}>
                {/* Ambient glow */}
                <View style={styles.ambientGlow} />

                <Svg width={width} height={svgH} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
                    <Defs>
                        <LinearGradient id="shotFloor" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#161C24" />
                            <Stop offset="0.5" stopColor="#121820" />
                            <Stop offset="1" stopColor="#0C1018" />
                        </LinearGradient>
                    </Defs>

                    {/* Court floor */}
                    <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#shotFloor)" />

                    {/* Court lines */}
                    <CourtLines />

                    {/* Shot markers */}
                    {shots.map((shot, i) => (
                        <ShotMarker key={i} shot={shot} />
                    ))}
                </Svg>

                {/* Legend + FG% */}
                <View style={styles.legendBar}>
                    <View style={styles.legendGroup}>
                        <View style={[styles.legendDot, { backgroundColor: MADE_COLOR }]} />
                        <Animated.Text style={styles.legendText}>Made</Animated.Text>
                    </View>
                    <View style={styles.legendGroup}>
                        <Animated.Text style={[styles.legendX, { color: MISSED_COLOR }]}>×</Animated.Text>
                        <Animated.Text style={styles.legendText}>Missed</Animated.Text>
                    </View>
                    {total > 0 && (
                        <Animated.Text style={styles.fgText}>
                            {madeCount}/{total} · {fgPct}%
                        </Animated.Text>
                    )}
                </View>
            </View>
        </Animated.View>
    )
}

export const ShotChart = memo(ShotChartInner)

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        borderRadius: T.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        position: 'relative',
    },
    ambientGlow: {
        position: 'absolute',
        top: '40%',
        left: '25%',
        width: '50%',
        height: '20%',
        borderRadius: 80,
        backgroundColor: 'rgba(255,107,0,0.02)',
    },
    legendBar: {
        position: 'absolute',
        top: 8,
        right: 12,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    legendGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: T.color.text.tertiary,
        fontSize: 9,
        fontFamily: T.fonts.body.semibold,
    },
    legendX: {
        fontSize: 12,
        fontFamily: T.fonts.display.bold,
        marginTop: -1,
    },
    fgText: {
        color: T.color.text.secondary,
        fontSize: 10,
        fontFamily: T.fonts.body.semibold,
        marginLeft: 4,
    },
})

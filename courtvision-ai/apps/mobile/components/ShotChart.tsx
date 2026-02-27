/**
 * ShotChart — CourtVision AI V4
 * SVG half-court with made/missed shot markers
 * Inspired by HomeCourt shot chart: dark court, amber makes, red misses
 */
import { memo, useCallback } from 'react'
import { View, Text, TouchableOpacity, Dimensions } from 'react-native'
import Svg, { Rect, Circle, Line, Path, G } from 'react-native-svg'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { T } from '../lib/theme'

const { width: SCREEN_W } = Dimensions.get('window')

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
}

const COURT_COLOR = '#121820'
const LINE_COLOR = 'rgba(255,255,255,0.10)'
const MADE_COLOR = T.color.signature.primary   // #FF6B00
const MISSED_COLOR = T.color.semantic.error    // #FF375F

function ShotChartInner({
    shots,
    width = SCREEN_W - 32,
    height = 280,
    showZones = false,
}: ShotChartProps) {
    const padX = 16
    const padY = 16
    const courtW = width - padX * 2
    const courtH = height - padY * 2

    return (
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <View style={{
                width,
                height,
                backgroundColor: COURT_COLOR,
                borderRadius: T.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
            }}>
                <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    <G>
                        {/* Court outline */}
                        <Rect
                            x={padX} y={padY}
                            width={courtW} height={courtH}
                            fill="none" stroke={LINE_COLOR} strokeWidth={1}
                        />

                        {/* Paint / Key */}
                        <Rect
                            x={width / 2 - courtW * 0.15}
                            y={courtH - courtH * 0.35 + padY}
                            width={courtW * 0.30}
                            height={courtH * 0.35}
                            fill="none" stroke={LINE_COLOR} strokeWidth={1}
                        />

                        {/* Free throw circle */}
                        <Circle
                            cx={width / 2}
                            cy={courtH - courtH * 0.35 + padY}
                            r={courtW * 0.12}
                            fill="none" stroke={LINE_COLOR} strokeWidth={1}
                        />

                        {/* 3-point arc */}
                        <Path
                            d={`M ${padX + courtW * 0.06} ${height - padY}
                                L ${padX + courtW * 0.06} ${courtH - courtH * 0.30 + padY}
                                Q ${width / 2} ${padY + courtH * 0.08} ${padX + courtW * 0.94} ${courtH - courtH * 0.30 + padY}
                                L ${padX + courtW * 0.94} ${height - padY}`}
                            fill="none" stroke={LINE_COLOR} strokeWidth={1}
                        />

                        {/* Basket */}
                        <Circle
                            cx={width / 2}
                            cy={height - padY - 12}
                            r={4}
                            fill="none" stroke={LINE_COLOR} strokeWidth={1.5}
                        />

                        {/* Shots */}
                        {shots.map((shot, i) => {
                            const sx = padX + (shot.x / 100) * courtW
                            const sy = padY + (shot.y / 100) * courtH

                            if (shot.made) {
                                return (
                                    <Circle
                                        key={i}
                                        cx={sx} cy={sy}
                                        r={5}
                                        fill={MADE_COLOR}
                                        opacity={0.9}
                                    />
                                )
                            } else {
                                // X mark for missed
                                const s = 4
                                return (
                                    <G key={i}>
                                        <Line
                                            x1={sx - s} y1={sy - s}
                                            x2={sx + s} y2={sy + s}
                                            stroke={MISSED_COLOR}
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                        />
                                        <Line
                                            x1={sx + s} y1={sy - s}
                                            x2={sx - s} y2={sy + s}
                                            stroke={MISSED_COLOR}
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                        />
                                    </G>
                                )
                            }
                        })}
                    </G>
                </Svg>

                {/* Legend */}
                <View style={{
                    position: 'absolute', top: 8, right: 12,
                    flexDirection: 'row', gap: 12,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MADE_COLOR }} />
                        <Text style={{ color: T.color.text.tertiary, fontSize: 9, fontFamily: T.fonts.body.semibold }}>Made</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: MISSED_COLOR, fontSize: 10, fontFamily: T.fonts.display.bold }}>×</Text>
                        <Text style={{ color: T.color.text.tertiary, fontSize: 9, fontFamily: T.fonts.body.semibold }}>Missed</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    )
}

export const ShotChart = memo(ShotChartInner)

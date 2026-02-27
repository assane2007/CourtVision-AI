/**
 * ShotScienceGrid — CourtVision AI V4
 * 2×3 grid of metrics (HomeCourt Shot Science style)
 * Label: overline dim | Value: smallStat white | Hairline separators
 */
import { memo } from 'react'
import { View, Text } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { T } from '../lib/theme'

const type = (T as any).type

interface Metric {
    label: string   // 'SHOT TYPE', 'RELEASE TIME'...
    value: string   // 'Catch & Shoot', '1.5s'...
    unit?: string
}

interface ShotScienceGridProps {
    metrics: Metric[]
}

function ShotScienceGridInner({ metrics }: ShotScienceGridProps) {
    const rows: Metric[][] = []
    for (let i = 0; i < metrics.length; i += 2) {
        rows.push(metrics.slice(i, i + 2))
    }

    return (
        <Animated.View
            entering={FadeInDown.delay(160).duration(400)}
            style={{
                ...(T as any).glass?.regular ?? T.glass.light,
                borderRadius: T.borderRadius.lg,
                overflow: 'hidden',
            }}
        >
            {rows.map((row, rowIdx) => (
                <View key={rowIdx}>
                    {rowIdx > 0 && (
                        <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    )}
                    <View style={{ flexDirection: 'row' }}>
                        {row.map((metric, colIdx) => (
                            <View
                                key={colIdx}
                                style={{
                                    flex: 1,
                                    padding: T.spacing[4],
                                    borderLeftWidth: colIdx > 0 ? 0.5 : 0,
                                    borderLeftColor: 'rgba(255,255,255,0.06)',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{
                                    ...type.overline,
                                    color: T.color.text.tertiary,
                                    marginBottom: T.spacing[2],
                                }}>
                                    {metric.label}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={{
                                        ...type.smallStat,
                                        color: T.color.text.primary,
                                    }}>
                                        {metric.value}
                                    </Text>
                                    {metric.unit && (
                                        <Text style={{
                                            fontSize: 14,
                                            fontFamily: T.fonts.body.regular,
                                            color: T.color.text.tertiary,
                                            marginLeft: 2,
                                        }}>
                                            {metric.unit}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                        {/* Fill empty cell if odd */}
                        {row.length === 1 && <View style={{ flex: 1 }} />}
                    </View>
                </View>
            ))}
        </Animated.View>
    )
}

export const ShotScienceGrid = memo(ShotScienceGridInner)

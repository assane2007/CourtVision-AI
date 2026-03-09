/**
 * WeeklyDots — CourtVision AI V4
 * 7 dots for the 7 days of the week.
 * Filled amber = session done, ring amber = today, dim = empty
 */
import { memo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { T } from '../../lib/theme'

const type = T.type

interface WeeklyDotsProps {
    data: { day: string; hasSession: boolean; isToday: boolean; score?: number }[]
    onDayPress?: (day: string) => void
}

function WeeklyDotsInner({ data, onDayPress }: WeeklyDotsProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(160).duration(400)}
            style={{
                ...T.glass.base,
                borderRadius: T.radius.lg,
                padding: T.spacing[4],
            }}
        >
            {/* Header */}
            <View style={{
                flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: T.spacing[4],
            }}>
                <Text style={{
                    ...type.cardTitle,
                    color: T.color.text.primary,
                }}>
                    This Week
                </Text>
                <Text style={{
                    ...type.overline,
                    color: T.color.text.secondary,
                }}>
                    {data.filter(d => d.hasSession).length}/7 SESSIONS
                </Text>
            </View>

            {/* Dots row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {data.map((d, i) => {
                    const dotSize = d.hasSession ? 12 : d.isToday ? 12 : 8

                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => onDayPress?.(d.day)}
                            activeOpacity={0.7}
                            style={{ alignItems: 'center', gap: T.spacing[2], minWidth: 44, minHeight: 44, justifyContent: 'center' }}
                            accessibilityLabel={`${d.day}${d.hasSession ? ', session done' : ''}${d.isToday ? ', today' : ''}`}
                        >
                            <View style={{
                                width: dotSize,
                                height: dotSize,
                                borderRadius: dotSize / 2,
                                backgroundColor: d.hasSession
                                    ? T.color.brand.primary
                                    : d.isToday
                                        ? 'transparent'
                                        : `${T.color.text.tertiary}40`,
                                borderWidth: d.isToday && !d.hasSession ? 2 : 0,
                                borderColor: d.isToday ? T.color.brand.primary : 'transparent',
                                ...(d.hasSession ? T.glow.soft(T.color.brand.primary) : {}),
                            }} />
                            <Text style={{
                                fontSize: 10,
                                fontFamily: d.isToday ? T.fonts.body.bold : T.fonts.body.regular,
                                color: d.isToday
                                    ? T.color.brand.primary
                                    : d.hasSession
                                        ? T.color.text.secondary
                                        : T.color.text.tertiary,
                            }}>
                                {d.day}
                            </Text>
                            {d.hasSession && d.score != null && (
                                <Text style={{
                                    fontSize: 9,
                                    fontFamily: T.fonts.display.bold,
                                    color: T.ratingColor(d.score),
                                }}>
                                    {d.score}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )
                })}
            </View>
        </Animated.View>
    )
}

export const WeeklyDots = memo(WeeklyDotsInner)

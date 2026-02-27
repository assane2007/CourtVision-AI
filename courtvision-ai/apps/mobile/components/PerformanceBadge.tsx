/**
 * PerformanceBadge — CourtVision AI V4
 * 'ELITE' green / 'GREAT' amber / 'SOLID' gold / 'DEVELOPING' red
 * Badge pill with tinted background and border
 */
import { memo } from 'react'
import { View, Text } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { T } from '../lib/theme'

interface PerformanceBadgeProps {
    score: number
    size?: 'sm' | 'md' | 'lg'
}

function getBadge(score: number) {
    if (score >= 90) return { label: 'ELITE', color: T.color.semantic.success }
    if (score >= 75) return { label: 'GREAT', color: T.color.signature.primary }
    if (score >= 60) return { label: 'SOLID', color: T.color.gamification.gold }
    return { label: 'DEVELOPING', color: T.color.semantic.error }
}

const SIZES = {
    sm: { px: 8, py: 3, fontSize: 9, letterSpacing: 1.5 },
    md: { px: 12, py: 5, fontSize: 11, letterSpacing: 1.2 },
    lg: { px: 16, py: 7, fontSize: 13, letterSpacing: 1.0 },
}

function PerformanceBadgeInner({ score, size = 'md' }: PerformanceBadgeProps) {
    const { label, color } = getBadge(score)
    const s = SIZES[size]

    return (
        <Animated.View entering={FadeInDown.duration(300)}>
            <View style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}40`,
                borderWidth: 1,
                borderRadius: 9999,
                paddingHorizontal: s.px,
                paddingVertical: s.py,
                alignSelf: 'flex-start',
            }}>
                <Text style={{
                    color,
                    fontSize: s.fontSize,
                    fontFamily: T.fonts.display.bold,
                    fontWeight: '800',
                    letterSpacing: s.letterSpacing,
                }}>
                    {label}
                </Text>
            </View>
        </Animated.View>
    )
}

export const PerformanceBadge = memo(PerformanceBadgeInner)

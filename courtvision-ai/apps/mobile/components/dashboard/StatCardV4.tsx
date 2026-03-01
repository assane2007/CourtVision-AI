/**
 * StatCard — CourtVision AI V4
 * Glass stat card with animated counter, overline label, optional delta.
 * Inspired by HomeCourt + NBA App + Apple Fitness+
 */
import { memo, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle, useAnimatedProps,
    withTiming, Easing, FadeInDown,
} from 'react-native-reanimated'
import { T } from '../../lib/theme'

const type = (T as any).type

interface StatCardProps {
    label: string
    value: string | number
    unit?: string
    delta?: string
    variant?: 'glass' | 'accent' | 'success' | 'danger' | 'gold'
    size?: 'hero' | 'big' | 'medium' | 'small'
    index?: number
    onPress?: () => void
}

const VARIANT_STYLES: Record<string, any> = {
    glass: (T as any).glass?.regular ?? T.glass.thin,
    accent: T.glass.vivid,
    success: T.glass.vivid,
    danger: (T as any).glass?.danger ?? T.glass.thin,
    gold: (T as any).glass?.gold ?? T.glass.thin,
}

const SIZE_STYLES: Record<string, any> = {
    hero: type.hero,
    big: type.statLarge,
    medium: type.mediumStat,
    small: type.mediumStat,
}

function StatCardInner({ label, value, unit, delta, variant = 'glass', size = 'medium', index = 0, onPress }: StatCardProps) {
    const isNumeric = typeof value === 'number'
    const displayVal = useSharedValue(0)

    useEffect(() => {
        if (isNumeric) {
            displayVal.value = withTiming(value as number, {
                duration: 800,
                easing: Easing.out(Easing.cubic),
            })
        }
    }, [value])

    const glassStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.glass
    const textStyle = SIZE_STYLES[size] ?? SIZE_STYLES.medium
    const valueColor = variant === 'accent' ? T.color.signature.primary
        : variant === 'success' ? T.color.semantic.success
            : variant === 'danger' ? T.color.semantic.error
                : variant === 'gold' ? T.color.gamification.gold
                    : T.color.text.primary

    const Wrapper = (onPress ? TouchableOpacity : View) as any

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
            <Wrapper
                {...(onPress ? { onPress, activeOpacity: 0.8 } : {})}
                style={{
                    ...glassStyle,
                    borderRadius: T.borderRadius.lg,
                    padding: T.spacing[4],
                    minHeight: size === 'hero' ? 140 : 80,
                    justifyContent: 'center',
                }}
            >
                {/* Overline label */}
                <Text style={{
                    ...type.overline,
                    color: T.color.text.secondary,
                    marginBottom: T.spacing[1],
                }}>
                    {label}
                </Text>

                {/* Value row */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{
                        ...textStyle,
                        color: valueColor,
                    }}>
                        {isNumeric ? Math.round(value as number) : value}
                    </Text>
                    {unit && (
                        <Text style={{
                            fontSize: textStyle.fontSize * 0.55,
                            fontFamily: T.fonts.display.bold,
                            color: T.color.text.tertiary,
                            marginLeft: 2,
                        }}>
                            {unit}
                        </Text>
                    )}
                </View>

                {/* Delta */}
                {delta && (
                    <Text style={{
                        fontSize: 13,
                        fontFamily: T.fonts.body.semibold,
                        color: delta.includes('+') || delta.includes('▲') ? T.color.semantic.success : T.color.semantic.error,
                        marginTop: T.spacing[1],
                    }}>
                        {delta}
                    </Text>
                )}
            </Wrapper>
        </Animated.View>
    )
}

export const StatCard = memo(StatCardInner)

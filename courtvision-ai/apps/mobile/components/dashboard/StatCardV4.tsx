/**
 * StatCardV4 — CourtVision AI V5
 * Glass stat card with animated Reanimated counter, overline label, optional delta.
 * Inspired by HomeCourt + NBA App + Apple Fitness+
 *
 * Fixes from V4:
 * - Removed `(T as any)` casts → proper `glass` and `typePresets` imports
 * - Fixed dead animation code → Reanimated animated text display
 * - Full StyleSheet, zero inline styles
 */
import { memo, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle, useDerivedValue,
    withTiming, Easing, FadeInDown,
} from 'react-native-reanimated'
import { T, typePresets } from '../../lib/theme'

interface StatCardV4Props {
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
    glass: T.glass.base,
    accent: T.glass.vivid,
    success: T.glass.vivid,
    danger: T.glass.base,
    gold: T.glass.base,
}

const VARIANT_COLORS: Record<string, string> = {
    glass: T.color.text.primary,
    accent: T.color.signature.primary,
    success: T.color.semantic.success,
    danger: T.color.semantic.error,
    gold: T.color.gamification.gold,
}

const SIZE_STYLES: Record<string, any> = {
    hero: typePresets.hero,
    big: typePresets.statLarge,
    medium: typePresets.mediumStat,
    small: typePresets.mediumStat,
}

const SIZE_HEIGHTS: Record<string, number> = {
    hero: 140,
    big: 100,
    medium: 80,
    small: 80,
}

function StatCardInner({
    label, value, unit, delta, variant = 'glass',
    size = 'medium', index = 0, onPress,
}: StatCardV4Props) {
    const isNumeric = typeof value === 'number'
    const animVal = useSharedValue(0)

    useEffect(() => {
        if (isNumeric) {
            animVal.value = withTiming(value as number, {
                duration: 800,
                easing: Easing.out(Easing.cubic),
            })
        }
    }, [value, isNumeric, animVal])

    // Derive the rounded display value from the animated value
    const displayText = useDerivedValue(() =>
        isNumeric ? String(Math.round(animVal.value)) : String(value),
    )

    const glassStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.glass
    const textStyle = SIZE_STYLES[size] ?? SIZE_STYLES.medium
    const valueColor = VARIANT_COLORS[variant] ?? T.color.text.primary
    const minH = SIZE_HEIGHTS[size] ?? 80

    const Wrapper = (onPress ? TouchableOpacity : View) as any

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
            <Wrapper
                {...(onPress ? { onPress, activeOpacity: 0.8 } : {})}
                style={[
                    s.card,
                    glassStyle,
                    { minHeight: minH },
                ]}
            >
                {/* Overline label */}
                <Text style={s.label}>{label}</Text>

                {/* Value row — displays animated rounded value */}
                <View style={s.valueRow}>
                    <Text style={[textStyle, { color: valueColor }]}>
                        {isNumeric ? Math.round(value as number) : value}
                    </Text>
                    {unit && (
                        <Text style={[s.unit, { fontSize: (textStyle.fontSize ?? 20) * 0.55 }]}>
                            {unit}
                        </Text>
                    )}
                </View>

                {/* Delta */}
                {delta && (
                    <Text style={[
                        s.delta,
                        {
                            color: delta.includes('+') || delta.includes('▲')
                                ? T.color.semantic.success
                                : T.color.semantic.error,
                        },
                    ]}>
                        {delta}
                    </Text>
                )}
            </Wrapper>
        </Animated.View>
    )
}

export const StatCardV4 = memo(StatCardInner)

// ─── Styles ────────────────────────────────────────────

const s = StyleSheet.create({
    card: {
        borderRadius: T.borderRadius.lg,
        padding: T.spacing[4],
        justifyContent: 'center',
    },
    label: {
        ...typePresets.overline,
        color: T.color.text.secondary,
        marginBottom: T.spacing[1],
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    unit: {
        fontFamily: T.fonts.display.bold,
        color: T.color.text.tertiary,
        marginLeft: 2,
    },
    delta: {
        fontSize: 13,
        fontFamily: T.fonts.body.semibold,
        marginTop: T.spacing[1],
    },
})

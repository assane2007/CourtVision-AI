/**
 * StatCard — Carte de statistique premium avec animation count-up.
 *
 * Tailles : sm | md | lg
 * Variantes : standard, trend (+/- vs hier), accent (brand highlight)
 *
 * Usage :
 *   <StatCard label="Précision" value={73} unit="%" size="lg" trend={+5} />
 */

import React, { useEffect } from 'react'
import {
    View, Text, ViewStyle, StyleSheet,
} from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, withDelay, withSpring,
    interpolate, Easing,
} from 'react-native-reanimated'
import { T } from '../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type StatCardSize = 'sm' | 'md' | 'lg'
export type StatCardVariant = 'default' | 'accent' | 'success' | 'danger'

export interface StatCardProps {
    label: string
    value: number
    unit?: string            // "%" | "pts" | "m" | etc.
    size?: StatCardSize
    variant?: StatCardVariant
    trend?: number           // +5 = +5%, -3 = -3% vs hier
    trendLabel?: string      // "vs last session" (défaut)
    icon?: React.ReactNode
    delay?: number           // stagger delay
    style?: ViewStyle
    loading?: boolean
}

// ─── Config par taille ────────────────────────────────────────

const SIZE_CONFIG = {
    sm: {
        padding:    12,
        labelSize:  T.font.xs,
        valueSize:  T.font.xxl,   // 24
        unitSize:   T.font.md,
        trendSize:  T.font.xs,
        gap:        4,
    },
    md: {
        padding:    16,
        labelSize:  T.font.sm,
        valueSize:  T.font.xxxl,  // 32
        unitSize:   T.font.base,
        trendSize:  T.font.sm,
        gap:        6,
    },
    lg: {
        padding:    20,
        labelSize:  T.font.base,
        valueSize:  42,           // hero-light
        unitSize:   T.font.lg,
        trendSize:  T.font.sm,
        gap:        8,
    },
} as const

// ─── Couleur par variante ─────────────────────────────────────

function variantColor(variant: StatCardVariant) {
    switch (variant) {
        case 'accent':  return T.colors.accent         // amber #FF6B00
        case 'success': return T.colors.green
        case 'danger':  return T.colors.red
        default:        return T.colors.textPrimary
    }
}

function variantGlass(variant: StatCardVariant) {
    switch (variant) {
        case 'accent':  return T.glass.accent
        case 'success': return T.glass.success
        default:        return T.glass.light
    }
}

// ─── Skeleton Loader interne ──────────────────────────────────

function SkeletonPulse({ width, height, radius = 6 }: { width: number | string; height: number; radius?: number }) {
    const opacity = useSharedValue(0.12)
    useEffect(() => {
        opacity.value = withTiming(0.35, {
            duration: 800, easing: Easing.inOut(Easing.sin),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
    return (
        <Animated.View style={[{
            width: width as any, height, borderRadius: radius,
            backgroundColor: T.colors.dimmer,
        }, style]} />
    )
}

// ─── CountUp interne ─────────────────────────────────────────

function AnimatedValue({ value, delay, size, color }: {
    value: number; delay: number; size: number; color: string
}) {
    const progress = useSharedValue(0)
    const displayed = useSharedValue(0)

    useEffect(() => {
        const anim = withDelay(delay, withTiming(1, {
            duration: T.animation.duration.slow,
            easing: Easing.out(Easing.cubic),
        }))
        progress.value = anim
        displayed.value = anim
    }, [value, delay])

    const textStyle = useAnimatedStyle(() => {
        // Opacity fade-in accompagne le count-up
        return { opacity: interpolate(progress.value, [0, 0.15], [0, 1]) }
    })

    // On utilise un compteur JS via setInterval mirroring = plus simple avec Reanimated
    // On expose la valeur via un hook de mise à jour React
    const [display, setDisplay] = React.useState(0)
    useEffect(() => {
        let start = 0
        const end = value
        let raf: ReturnType<typeof requestAnimationFrame>
        const startTime = performance.now()
        const duration = T.animation.duration.slow + delay

        const tick = (now: number) => {
            const elapsed = now - startTime - delay
            if (elapsed < 0) {
                raf = requestAnimationFrame(tick)
                return
            }
            const t = Math.min(elapsed / T.animation.duration.slow, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setDisplay(Math.round(eased * end))
            if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [value, delay])

    return (
        <Animated.Text style={[{
            color,
            fontSize: size,
            fontWeight: '900',
            letterSpacing: -1,
            fontVariant: ['tabular-nums'],
        }, textStyle]}>
            {display}
        </Animated.Text>
    )
}

// ─── StatCard ─────────────────────────────────────────────────

export function StatCard({
    label,
    value,
    unit,
    size = 'md',
    variant = 'default',
    trend,
    trendLabel = 'vs last session',
    icon,
    delay = 0,
    style,
    loading = false,
}: StatCardProps) {
    const cfg = SIZE_CONFIG[size]
    const color = variantColor(variant)
    const glass = variantGlass(variant)

    // Entrée de la card
    const opacity = useSharedValue(0)
    const translateY = useSharedValue(16)
    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }))
        translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 200 }))
    }, [delay])

    const cardStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }))

    if (loading) {
        return (
            <View style={[styles.base, glass, { padding: cfg.padding }, style]}>
                <SkeletonPulse width="55%" height={cfg.labelSize + 2} />
                <SkeletonPulse width="70%" height={cfg.valueSize * 0.8} radius={8} />
                {trend !== undefined && <SkeletonPulse width="45%" height={cfg.trendSize + 2} />}
            </View>
        )
    }

    const isTrendPositive = (trend ?? 0) >= 0

    return (
        <Animated.View style={[styles.base, glass, { padding: cfg.padding, gap: cfg.gap }, cardStyle, style]}>
            {/* Label + icon */}
            <View style={styles.labelRow}>
                <Text style={[styles.label, { fontSize: cfg.labelSize }]} numberOfLines={1}>
                    {label}
                </Text>
                {icon && <View style={styles.iconWrapper}>{icon}</View>}
            </View>

            {/* Valeur + unité */}
            <View style={styles.valueRow}>
                <AnimatedValue value={value} delay={delay} size={cfg.valueSize} color={color} />
                {unit && (
                    <Text style={[styles.unit, { fontSize: cfg.unitSize, color }]}>
                        {unit}
                    </Text>
                )}
            </View>

            {/* Trend */}
            {trend !== undefined && (
                <View style={styles.trendRow}>
                    <Text style={[
                        styles.trendArrow,
                        { color: isTrendPositive ? T.colors.green : T.colors.orange },
                        { fontSize: cfg.trendSize },
                    ]}>
                        {isTrendPositive ? '↑' : '↓'} {Math.abs(trend)}%
                    </Text>
                    <Text style={[styles.trendLabel, { fontSize: cfg.trendSize - 1 }]}>
                        {' '}{trendLabel}
                    </Text>
                </View>
            )}
        </Animated.View>
    )
}

// ─── Styles statiques ────────────────────────────────────────

const styles = StyleSheet.create({
    base: {
        borderRadius: T.radius.lg,
        overflow: 'hidden',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        color: T.colors.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.2,
        flexShrink: 1,
    },
    iconWrapper: {
        marginLeft: 6,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
    },
    unit: {
        fontWeight: '700',
        marginBottom: 4,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    trendArrow: {
        fontWeight: '800',
    },
    trendLabel: {
        color: T.colors.muted,
        fontWeight: '500',
    },
})

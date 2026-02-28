/**
 * StatCard — Carte de statistique premium avec animation count-up.
 *
 * Tailles : sm | md | lg
 * Variantes : standard, trend (+/- vs hier), accent (brand highlight)
 *
 * Usage :
 *   <StatCard label="Précision" value={73} unit="%" size="lg" trend={+5} />
 */

/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from 'react'
import {
    View, Text, ViewStyle, StyleSheet,
} from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, withDelay, withSpring,
    interpolate, Easing,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
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
        padding: 12,
        labelSize: T.fontSize.xs,
        valueSize: T.fontSize.xl,   // 24
        unitSize: T.fontSize.md,
        trendSize: T.fontSize.xs,
        gap: 4,
    },
    md: {
        padding: 16,
        labelSize: T.fontSize.sm,
        valueSize: T.fontSize['2xl'],  // 32
        unitSize: T.fontSize.base,
        trendSize: T.fontSize.sm,
        gap: 6,
    },
    lg: {
        padding: 20,
        labelSize: T.fontSize.base,
        valueSize: 42,           // hero-light
        unitSize: T.fontSize.lg,
        trendSize: T.fontSize.sm,
        gap: 8,
    },
} as const

// ─── Couleur par variante ─────────────────────────────────────

function variantColor(variant: StatCardVariant) {
    switch (variant) {
        case 'accent': return T.color.signature.primary         // amber #FF6B00
        case 'success': return T.color.semantic.success
        case 'danger': return T.color.semantic.error
        default: return T.color.text.primary
    }
}

function variantGlass(variant: StatCardVariant) {
    switch (variant) {
        case 'accent': return T.glass.accent
        case 'success': return T.glass.success
        default: return T.glass.light
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
            backgroundColor: T.color.border.subtle,
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
        const start = 0
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

    // Premium Apple Fitness+ Blur settings
    const blurTint = variant === 'default' ? 'systemThinMaterialDark' : (variant === 'accent' ? 'systemMaterialDark' : 'dark')
    const blurIntensity = variant === 'default' ? 40 : 60

    if (loading) {
        return (
            <View style={[styles.base, glass, { padding: cfg.padding, overflow: 'hidden' }, style]}>
                <BlurView intensity={blurIntensity} tint={blurTint as any} style={StyleSheet.absoluteFillObject} />
                <SkeletonPulse width="55%" height={cfg.labelSize + 2} />
                <SkeletonPulse width="70%" height={cfg.valueSize * 0.8} radius={8} />
                {trend !== undefined && <SkeletonPulse width="45%" height={cfg.trendSize + 2} />}
            </View>
        )
    }

    const isTrendPositive = (trend ?? 0) >= 0

    return (
        <Animated.View style={[styles.base, glass, { padding: cfg.padding, gap: cfg.gap, overflow: 'hidden' }, cardStyle, style]}>
            <BlurView intensity={blurIntensity} tint={blurTint as any} style={StyleSheet.absoluteFillObject} />

            {/* Outline subtil premium (inner border) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <View style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: T.borderRadius.lg }} />
            </View>

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
                        { color: isTrendPositive ? T.color.semantic.success : T.color.semantic.warning },
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
        borderRadius: T.borderRadius.lg,
        overflow: 'hidden',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        color: T.color.text.secondary,
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
        color: T.color.text.secondary,
        fontWeight: '500',
    },
})

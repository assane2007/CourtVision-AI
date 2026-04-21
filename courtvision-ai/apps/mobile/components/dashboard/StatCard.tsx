/**
 * StatCard — Carte de statistique premium avec animation count-up.
 *
 * Tailles : sm | md | lg
 * Variantes : standard, trend (+/- vs hier), accent (brand highlight)
 *
 * Usage :
 *   <StatCard label="Précision" value={73} unit="%" size="lg" trend={+5} />
 */

import { useEffect, useMemo, useState } from 'react'
import type { ViewStyle} from 'react-native';
import {
    View, Text, StyleSheet,
} from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, withDelay, withSpring,
    interpolate, Easing,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { T } from '../../lib/theme'

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
        labelSize: 11,
        valueSize: 56,
        unitSize: T.fontSize.lg,
        trendSize: T.fontSize.sm,
        gap: 8,
    },
} as const

function variantColor(variant: StatCardVariant) {
    switch (variant) {
        case 'accent': return T.color.ai.primary
        case 'success': return T.color.semantic.success
        case 'danger': return T.color.semantic.error
        default: return T.color.text.primary
    }
}

function variantGlass(variant: StatCardVariant) {
    switch (variant) {
        case 'accent': return T.glass.vivid
        case 'success': return T.glass.base
        default: return T.glass.thin
    }
}

// ─── Skeleton Loader interne ──────────────────────────────────

function SkeletonPulse({ width, height, radius = 6 }: { width: number | string; height: number; radius?: number }) {
    const opacity = useSharedValue(0.12)
    useEffect(() => {
        opacity.value = withTiming(0.35, {
            duration: 800, easing: Easing.inOut(Easing.sin),
        })
    }, [opacity])
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
    return (
        <Animated.View style={[{
            width: width as any, height, borderRadius: radius,
            backgroundColor: T.color.border.soft,
        }, style]} />
    )
}

// ─── CountUp interne ─────────────────────────────────────────

function AnimatedValue({ value, delay: delayMs, size, color }: {
    value: number; delay: number; size: number; color: string
}) {
    const [displayValue, setDisplayValue] = useState(0)
    const progress = useSharedValue(0)

    useEffect(() => {
        progress.value = withDelay(delayMs, withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
        }))

        let frame = 0
        const total = 24
        const start = setTimeout(() => {
            const tick = () => {
                frame += 1
                const t = frame / total
                const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
                setDisplayValue(Math.round(value * eased))
                if (frame < total) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
        }, delayMs)
        return () => clearTimeout(start)
    }, [value, delayMs, progress])

    const textStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.15], [0, 1]),
    }))

    return (
        <Animated.Text style={[{
            color,
            fontSize: size,
            fontFamily: T.fonts.mono.regular,
            letterSpacing: 0.64,
            fontVariant: ['tabular-nums'],
        }, textStyle]}>
            {displayValue}
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
        translateY.value = withDelay(delay, withSpring(0, T.spring.snappy))
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
    const scanLines = useMemo(() => Array.from({ length: 8 }, (_, i) => i), [])

    return (
        <Animated.View style={[styles.base, glass, { padding: cfg.padding, gap: cfg.gap, overflow: 'hidden' }, cardStyle, style]}>
            <BlurView intensity={blurIntensity} tint={blurTint as any} style={StyleSheet.absoluteFillObject} />
            <View pointerEvents="none" style={styles.gridLayer}>
                {scanLines.map((i) => (
                    <View key={i} style={styles.gridLine} />
                ))}
            </View>
            <View pointerEvents="none" style={styles.scanLayer}>
                {scanLines.map((i) => (
                    <View key={`s-${i}`} style={styles.scanLine} />
                ))}
            </View>

            {/* Outline subtil premium (inner border) */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <View style={{ flex: 1, borderWidth: 0.5, borderColor: T.color.border.base, borderRadius: T.radius.lg }} />
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
                        { color: isTrendPositive ? T.color.semantic.success : T.color.brand.primary },
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
    gridLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-evenly',
    },
    gridLine: {
        height: 0.5,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    scanLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    scanLine: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        color: T.color.text.quaternary,
        fontFamily: T.fonts.body.medium,
        letterSpacing: 0.88,
        textTransform: 'uppercase',
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
        fontFamily: T.fonts.mono.regular,
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

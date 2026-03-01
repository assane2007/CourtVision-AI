/**
 * XPBadge  Animated popup for XP gains.
 * XPLevelBar  Level progression bar with glow + celebration.
 *
 * V3  Reanimated, English, premium design.
 */

import React, { useEffect } from 'react'
import { Text, View, StyleSheet } from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    withSpring, withSequence, withDelay, runOnJS,
    Easing, interpolate, FadeIn,
} from 'react-native-reanimated'
import { xpToNextLevel, xpToLevel } from '../../lib/store'
import { T } from '../../lib/theme'

//  XP Badge (popup toast) 

interface XPBadgeProps {
    amount: number
    label?: string
    onDone?: () => void
}

export function XPBadge({ amount, label, onDone }: XPBadgeProps) {
    const progress = useSharedValue(0)
    const opacity = useSharedValue(0)

    useEffect(() => {
        // Phase 1: spring in
        opacity.value = withTiming(1, { duration: 200 })
        progress.value = withSequence(
            withSpring(1, { damping: 12, stiffness: 140 }),
            withDelay(1200, withTiming(0, { duration: 400 }, (finished) => {
                if (finished && onDone) runOnJS(onDone)()
            })),
        )
    }, [])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1]),
        transform: [
            { scale: progress.value },
            { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
        ],
    }))

    return (
        <Animated.View style={[styles.badge, animatedStyle]}>
            <Text style={styles.badgeEmoji}></Text>
            <Text style={styles.badgeAmount}>+{amount} XP</Text>
            {label && <Text style={styles.badgeLabel}>{label}</Text>}
        </Animated.View>
    )
}

//  XP Level Bar 

interface XPLevelBarProps {
    xp: number
    compact?: boolean
    showCelebration?: boolean
}

export function XPLevelBar({ xp, compact = false, showCelebration = false }: XPLevelBarProps) {
    const level = xpToLevel(xp)
    const { current, needed, pct } = xpToNextLevel(xp)

    const barWidth = useSharedValue(0)
    const glowPulse = useSharedValue(0)
    const celebScale = useSharedValue(1)

    useEffect(() => {
        barWidth.value = withDelay(300, withTiming(pct / 100, {
            duration: 900,
            easing: Easing.out(Easing.cubic),
        }))

        // Glow pulse when bar is nearly full
        if (pct > 80) {
            glowPulse.value = withSequence(
                withTiming(1, { duration: 600 }),
                withTiming(0.5, { duration: 600 }),
                withTiming(1, { duration: 600 }),
            )
        }

        // Level-up celebration
        if (showCelebration) {
            celebScale.value = withSequence(
                withSpring(1.15, { damping: 8, stiffness: 180 }),
                withSpring(1, { damping: 10 }),
            )
        }
    }, [pct, showCelebration])

    const barStyle = useAnimatedStyle(() => ({
        width: `${barWidth.value * 100}%` as any,
    }))

    const containerScale = useAnimatedStyle(() => ({
        transform: [{ scale: celebScale.value }],
    }))

    if (compact) {
        return (
            <View style={styles.compactRow}>
                <Animated.View entering={FadeIn.duration(300)} style={styles.levelPill}>
                    <Text style={styles.levelPillText}>LVL {level}</Text>
                </Animated.View>
                <View style={styles.compactTrack}>
                    <Animated.View style={[styles.compactFill, barStyle]} />
                </View>
                <Text style={styles.compactLabel}>{current}/{needed}</Text>
            </View>
        )
    }

    return (
        <Animated.View style={[styles.card, containerScale]}>
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={styles.levelRow}>
                    <Text style={styles.levelEmoji}></Text>
                    <Text style={styles.levelText}>Level {level}</Text>
                </View>
                <Text style={styles.xpText}>{current} / {needed} XP</Text>
            </View>

            {/* Progress track */}
            <View style={styles.track}>
                <Animated.View style={[styles.fill, barStyle]}>
                    {/* Shimmer overlay */}
                    <View style={styles.shimmer} />
                </Animated.View>
            </View>

            {/* Footer */}
            <Text style={styles.footerText}>
                {Math.round(pct)}% to Level {level + 1}
            </Text>
        </Animated.View>
    )
}

//  Styles 

const styles = StyleSheet.create({
    // Badge
    badge: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: T.zIndex.toast,
        backgroundColor: `${T.gamification.purple}18`,
        borderRadius: T.radius.xl,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderColor: `${T.gamification.purple}50`,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...T.glow.soft(T.gamification.purple),
    },
    badgeEmoji: { fontSize: 16 },
    badgeAmount: {
        color: T.gamification.purple,
        fontWeight: '900',
        fontSize: T.fontSize.md,
        letterSpacing: 0.3,
    },
    badgeLabel: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.sm,
    },

    // Card (full variant)
    card: {
        ...T.glass.base,
        borderRadius: T.radius.xl,
        padding: T.spacing[4],
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    levelEmoji: { fontSize: 16 },
    levelText: {
        color: T.color.text.primary,
        fontWeight: '800',
        fontSize: T.fontSize.base,
        letterSpacing: 0.2,
    },
    xpText: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.sm,
        fontWeight: '600',
    },

    // Track (full)
    track: {
        height: 8,
        backgroundColor: T.color.border.base,
        borderRadius: 4,
        overflow: 'hidden',
    },
    fill: {
        height: 8,
        borderRadius: 4,
        backgroundColor: T.gamification.purple,
        ...T.glow.soft(T.gamification.purple),
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
    },
    footerText: {
        color: T.color.text.tertiary,
        fontSize: T.fontSize.xs,
        marginTop: 6,
        textAlign: 'right',
    },

    // Compact variant
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    levelPill: {
        backgroundColor: `${T.gamification.purple}15`,
        borderColor: `${T.gamification.purple}30`,
        borderWidth: 1,
        borderRadius: T.radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    levelPillText: {
        color: T.gamification.purple,
        fontSize: T.fontSize.xs,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    compactTrack: {
        flex: 1,
        height: 4,
        backgroundColor: T.color.border.base,
        borderRadius: 2,
        overflow: 'hidden',
    },
    compactFill: {
        height: 4,
        borderRadius: 2,
        backgroundColor: T.gamification.purple,
        ...T.glow.soft(T.gamification.purple),
    },
    compactLabel: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.xs,
        fontWeight: '600',
    },
})

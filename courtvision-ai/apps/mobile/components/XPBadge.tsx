/**
 * XPBadge — Badge animé premium pour les gains d'XP.
 * XPLevelBar — Barre de progression XP avec glow.
 */

import React, { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import { xpToNextLevel, xpToLevel } from '../lib/store'
import { T } from '../lib/theme'

// ─── XP Badge (popup) ─────────────────────────────────────────

interface XPBadgeProps {
    amount: number
    label?: string
    onDone?: () => void
}

export function XPBadge({ amount, label, onDone }: XPBadgeProps) {
    const scale     = useRef(new Animated.Value(0)).current
    const opacity   = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
            Animated.delay(1200),
            Animated.parallel([
                Animated.timing(translateY, { toValue: -40, duration: 500, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
        ]).start(() => onDone?.())
    }, [])

    return (
        <Animated.View style={{
            position: 'absolute', alignSelf: 'center', zIndex: 100,
            transform: [{ scale }, { translateY }],
            opacity,
            backgroundColor: `${T.colors.purple}18`,
            borderRadius: T.radius.xl,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderWidth: 1.5, borderColor: `${T.colors.purple}50`,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            ...T.glow(T.colors.purple, 0.4),
        }}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <Text style={{ color: T.colors.purple, fontWeight: '900', fontSize: 16 }}>+{amount} XP</Text>
            {label && <Text style={{ color: T.colors.muted, fontSize: 12 }}>{label}</Text>}
        </Animated.View>
    )
}

// ─── XP Level Bar ─────────────────────────────────────────────

interface XPLevelBarProps {
    xp: number
    compact?: boolean
}

export function XPLevelBar({ xp, compact = false }: XPLevelBarProps) {
    const level = xpToLevel(xp)
    const { current, needed, pct } = xpToNextLevel(xp)
    const progressAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: pct / 100,
            duration: 800,
            useNativeDriver: false,
        }).start()
    }, [pct])

    if (compact) {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                    ...T.glass.light,
                    backgroundColor: `${T.colors.purple}15`,
                    borderColor: `${T.colors.purple}30`,
                    borderRadius: T.radius.sm,
                    paddingHorizontal: 10, paddingVertical: 4,
                }}>
                    <Text style={{ color: T.colors.purple, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>LVL {level}</Text>
                </View>
                <View style={{ flex: 1, height: 4, backgroundColor: T.colors.dimmer, borderRadius: 2, overflow: 'hidden' }}>
                    <Animated.View style={{
                        height: 4, borderRadius: 2,
                        backgroundColor: T.colors.purple,
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        ...T.glow(T.colors.purple, 0.3),
                    }} />
                </View>
                <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600' }}>{current}/{needed}</Text>
            </View>
        )
    }

    return (
        <View style={{
            ...T.glass.light,
            borderRadius: T.radius.lg,
            padding: 16,
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>⚡</Text>
                    <Text style={{ color: T.colors.white, fontWeight: '800', fontSize: 15 }}>Niveau {level}</Text>
                </View>
                <Text style={{ color: T.colors.muted, fontSize: 12, fontWeight: '600' }}>{current} / {needed} XP</Text>
            </View>
            <View style={{ height: 8, backgroundColor: T.colors.dimmer, borderRadius: 4, overflow: 'hidden' }}>
                <Animated.View style={{
                    height: 8, borderRadius: 4,
                    backgroundColor: T.colors.purple,
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    ...T.glow(T.colors.purple, 0.4),
                }} />
            </View>
            <Text style={{ color: T.colors.dim, fontSize: 10, marginTop: 6, textAlign: 'right' }}>
                {Math.round(pct)}% vers le niveau {level + 1}
            </Text>
        </View>
    )
}

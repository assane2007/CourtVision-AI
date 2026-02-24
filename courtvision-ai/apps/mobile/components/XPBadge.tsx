/**
 * XPBadge — Badge animé montrant un gain d'XP.
 * Apparaît avec une animation bounce, puis disparaît.
 * 
 * Usage :
 *   <XPBadge amount={25} label="Tir enregistré" onDone={() => {}} />
 * 
 * XPLevelBar — Barre de progression XP avec animation.
 *   <XPLevelBar xp={450} />
 */

import React, { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import { xpToNextLevel, xpToLevel } from '../lib/store'

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
            // Pop in
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
            // Float up + fade out
            Animated.delay(1000),
            Animated.parallel([
                Animated.timing(translateY, { toValue: -30, duration: 500, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
        ]).start(() => onDone?.())
    }, [])

    return (
        <Animated.View style={{
            position: 'absolute',
            alignSelf: 'center',
            zIndex: 100,
            transform: [{ scale }, { translateY }],
            opacity,
            backgroundColor: 'rgba(179,136,255,0.2)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderWidth: 1.5,
            borderColor: '#B388FF',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#B388FF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
        }}>
            <Text style={{ fontSize: 14 }}>⚡</Text>
            <Text style={{ color: '#B388FF', fontWeight: '800', fontSize: 15 }}>+{amount} XP</Text>
            {label && (
                <Text style={{ color: '#8B949E', fontSize: 12 }}>{label}</Text>
            )}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                    backgroundColor: 'rgba(179,136,255,0.2)',
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 1,
                    borderColor: 'rgba(179,136,255,0.4)',
                }}>
                    <Text style={{ color: '#B388FF', fontSize: 11, fontWeight: '800' }}>LVL {level}</Text>
                </View>
                <View style={{ flex: 1, height: 4, backgroundColor: '#21262D', borderRadius: 2, overflow: 'hidden' }}>
                    <Animated.View style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: '#B388FF',
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    }} />
                </View>
                <Text style={{ color: '#8B949E', fontSize: 10 }}>{current}/{needed}</Text>
            </View>
        )
    }

    return (
        <View style={{
            backgroundColor: '#161B22',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#21262D',
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>⚡</Text>
                    <Text style={{ color: '#E6EDF3', fontWeight: '700', fontSize: 15 }}>Niveau {level}</Text>
                </View>
                <Text style={{ color: '#8B949E', fontSize: 12 }}>{current} / {needed} XP</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#21262D', borderRadius: 4, overflow: 'hidden' }}>
                <Animated.View style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#B388FF',
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    shadowColor: '#B388FF',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                }} />
            </View>
            <Text style={{ color: '#484F58', fontSize: 10, marginTop: 6, textAlign: 'right' }}>
                {Math.round(pct)}% vers le niveau {level + 1}
            </Text>
        </View>
    )
}

/**
 * SkeletonLoader — Composant d'animation de chargement shimmer.
 * Remplace les spinners pour un UX premium type LinkedIn/Instagram.
 * 
 * Usage :
 *   <SkeletonLoader width={200} height={16} borderRadius={8} />
 *   <SkeletonCard />
 *   <SkeletonHighlight />
 */

import React, { useEffect, useRef } from 'react'
import { Animated, View, ViewStyle } from 'react-native'

interface SkeletonProps {
    width?: number | string
    height?: number
    borderRadius?: number
    style?: ViewStyle
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const shimmerAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    })

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: '#21262D',
                    opacity,
                },
                style,
            ]}
        />
    )
}

// ── Preset : dashboard stat card ──────────────────────────────
export function SkeletonStatCard() {
    return (
        <View style={{
            flex: 1, backgroundColor: '#161B22', borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: '#21262D',
            gap: 8,
        }}>
            <SkeletonLoader height={10} width="60%" />
            <SkeletonLoader height={30} width="50%" />
            <SkeletonLoader height={8} width="40%" />
        </View>
    )
}

// ── Preset : highlight card ───────────────────────────────────
export function SkeletonHighlight() {
    return (
        <View style={{
            width: 120, height: 180,
            backgroundColor: '#161B22',
            borderRadius: 16, marginHorizontal: 4,
            borderWidth: 1, borderColor: '#21262D',
            padding: 12, justifyContent: 'flex-end', gap: 6,
        }}>
            <SkeletonLoader height={10} width="80%" />
            <SkeletonLoader height={8} width="60%" />
            <SkeletonLoader height={8} width="45%" />
        </View>
    )
}

// ── Preset : leaderboard row ──────────────────────────────────
export function SkeletonLeaderboardRow() {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#161B22', borderRadius: 14,
            padding: 14, marginBottom: 8, gap: 12,
        }}>
            <SkeletonLoader width={28} height={28} borderRadius={14} />
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, gap: 6 }}>
                <SkeletonLoader height={12} width="55%" />
                <SkeletonLoader height={9} width="35%" />
            </View>
            <SkeletonLoader width={40} height={20} borderRadius={10} />
        </View>
    )
}

// ── Preset : weekly chart ─────────────────────────────────────
export function SkeletonWeeklyChart() {
    const HEIGHTS = [40, 55, 20, 65, 50, 15, 70]
    return (
        <View style={{
            backgroundColor: '#161B22', borderRadius: 18,
            padding: 16, borderWidth: 1, borderColor: '#21262D',
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70, marginBottom: 8 }}>
                {HEIGHTS.map((h, i) => (
                    <View key={i} style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <SkeletonLoader height={h} width="100%" borderRadius={4} />
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
                {HEIGHTS.map((_, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <SkeletonLoader height={8} width="80%" />
                    </View>
                ))}
            </View>
        </View>
    )
}

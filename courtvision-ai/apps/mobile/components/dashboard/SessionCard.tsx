/**
 * SessionCard — Carte d'une session dans le feed.
 *
 * Affiche : date, durée, stats clés (tirs/mental/distance),
 * badge de performance (Elite/Great/Good/Keep Going).
 * Tap → navigation vers le rapport complet.
 *
 * Usage :
 *   <SessionCard session={session} onPress={() => router.push(`/analysis/${session.id}`)} />
 */

import React, { useEffect, memo } from 'react'
import type { ViewStyle } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withDelay, withTiming, withSpring, Easing,
} from 'react-native-reanimated'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export interface SessionCardData {
    id: string
    created_at: string          // ISO string
    duration_minutes?: number
    shooting_fg_pct?: number    // 0-100
    mental_score?: number       // 0-100
    shots_attempted?: number
    shots_made?: number
    distance_km?: number
    highlight_count?: number
}

export interface SessionCardProps {
    session: SessionCardData
    onPress: () => void
    delay?: number
    style?: ViewStyle
    compact?: boolean           // version condensée pour les timelines
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
    })
}

// ─── MiniStat ────────────────────────────────────────────────

function MiniStat({ icon, label, value, color = T.color.text.secondary }: {
    icon: keyof typeof Feather.glyphMap
    label: string
    value: string
    color?: string
}) {
    return (
        <View style={styles.miniStat}>
            <Feather name={icon} size={12} color={color} />
            <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
            <Text style={styles.miniStatLabel}>{label}</Text>
        </View>
    )
}

// ─── PerformanceBadge ─────────────────────────────────────────

function PerformanceBadge({ value }: { value: number }) {
    let label = 'WORK IN PROGRESS'
    let color: string = T.color.semantic.info
    if (value >= 90) { label = 'ELITE'; color = T.color.gamification.gold }
    else if (value >= 80) { label = 'GREAT'; color = T.color.semantic.success }
    else if (value >= 70) { label = 'GOOD'; color = T.color.signature.primary }
    return (
        <View style={[styles.badge, { backgroundColor: `${color}14`, borderColor: `${color}28` }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    )
}

// ─── SessionCard ──────────────────────────────────────────────

export const SessionCard = memo(function SessionCard({ session, onPress, delay = 0, style, compact = false }: SessionCardProps) {
    const opacity = useSharedValue(0)
    const translateX = useSharedValue(-12)

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }))
        translateX.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 220 }))
    }, [delay])

    const cardStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateX: translateX.value }],
    }))

    const primaryStat = session.shooting_fg_pct ?? session.mental_score ?? 0
    const date = formatDate(session.created_at)
    const time = formatTime(session.created_at)
    const dur = session.duration_minutes ? `${session.duration_minutes}min` : '—'

    if (compact) {
        return (
            <Animated.View style={[cardStyle, style]}>
                <TouchableOpacity
                    style={styles.compactContainer}
                    onPress={onPress}
                    activeOpacity={0.75}
                >
                    {/* Left accent bar */}
                    <View style={[styles.accentBar, { backgroundColor: T.ratingColor(primaryStat) }]} />

                    <View style={styles.compactContent}>
                        <View style={styles.compactRow}>
                            <Text style={styles.compactDate}>{date} · {time}</Text>
                            <PerformanceBadge value={primaryStat} />
                        </View>
                        <View style={styles.compactStats}>
                            {session.shooting_fg_pct != null && (
                                <Text style={styles.compactStat}>
                                    <Text style={{ color: T.color.signature.primary, fontWeight: '800' }}>
                                        {Math.round(session.shooting_fg_pct)}%
                                    </Text>
                                    {' FG'}
                                </Text>
                            )}
                            {session.mental_score != null && (
                                <Text style={styles.compactStat}>
                                    <Text style={{ color: T.color.semantic.success, fontWeight: '800' }}>
                                        {Math.round(session.mental_score)}
                                    </Text>
                                    {' Mental'}
                                </Text>
                            )}
                            <Text style={styles.compactStat}>{dur}</Text>
                        </View>
                    </View>

                    <Feather name="chevron-right" size={16} color={T.color.text.tertiary} />
                </TouchableOpacity>
            </Animated.View>
        )
    }

    return (
        <Animated.View style={[cardStyle, style]}>
            <TouchableOpacity
                style={styles.container}
                onPress={onPress}
                activeOpacity={0.78}
            >
                {/* Header row */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.dateText}>{date}</Text>
                        <Text style={styles.timeText}>{time} · {dur}</Text>
                    </View>
                    <PerformanceBadge value={primaryStat} />
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {session.shooting_fg_pct != null && (
                        <MiniStat
                            icon="crosshair"
                            label="FG%"
                            value={`${Math.round(session.shooting_fg_pct)}%`}
                            color={T.color.signature.primary}
                        />
                    )}
                    {session.shots_made != null && session.shots_attempted != null && (
                        <MiniStat
                            icon="target"
                            label="Shots"
                            value={`${session.shots_made}/${session.shots_attempted}`}
                        />
                    )}
                    {session.mental_score != null && (
                        <MiniStat
                            icon="activity"
                            label="Mental"
                            value={`${Math.round(session.mental_score)}`}
                            color={T.color.semantic.success}
                        />
                    )}
                    {session.distance_km != null && (
                        <MiniStat
                            icon="map-pin"
                            label="km"
                            value={`${session.distance_km.toFixed(1)}`}
                        />
                    )}
                    {session.highlight_count != null && session.highlight_count > 0 && (
                        <MiniStat
                            icon="play-circle"
                            label="clips"
                            value={`${session.highlight_count}`}
                            color={T.color.gamification.purple}
                        />
                    )}
                </View>

                {/* Footer arrow */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>View full report</Text>
                    <Feather name="arrow-right" size={14} color={T.color.signature.primary} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
})

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        ...T.glass.thin,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    dateText: {
        color: T.color.text.primary,
        fontSize: T.fontSize.base,
        fontWeight: '700',
    },
    timeText: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.xs,
        fontWeight: '500',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: T.color.border.base,
    },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    miniStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    miniStatValue: {
        fontSize: T.fontSize.sm,
        fontWeight: '800',
    },
    miniStatLabel: {
        fontSize: T.fontSize.xs,
        color: T.color.text.secondary,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: T.borderRadius.full,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    footerText: {
        color: T.color.signature.primary,
        fontSize: T.fontSize.sm,
        fontWeight: '600',
    },

    // Compact variant
    compactContainer: {
        ...T.glass.thin,
        borderRadius: T.borderRadius.md,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
    },
    accentBar: {
        width: 3,
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 2,
    },
    compactContent: {
        flex: 1,
        paddingLeft: 8,
        gap: 4,
    },
    compactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    compactDate: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.xs,
        fontWeight: '600',
    },
    compactStats: {
        flexDirection: 'row',
        gap: 12,
    },
    compactStat: {
        color: T.color.text.secondary,
        fontSize: T.fontSize.xs,
        fontWeight: '500',
    },
})

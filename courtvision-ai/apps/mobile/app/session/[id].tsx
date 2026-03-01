/**
 * CourtVision AI — Session Detail Screen
 * Détail complet d'une session d'entraînement passée.
 *
 * Affiche :
 * - Score global et grade
 * - Statistiques de tir détaillées
 * - Métriques biomécaniques moyennes
 * - Shot chart (tirs par zone)
 * - Timeline des tirs (graphique mini)
 * - Meilleur/pire tir de la session
 * - Comparaison avec la moyenne personnelle
 *
 * Design V4 : glass cards, amber accent.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, StatusBar,
    StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    ZoomIn,
} from 'react-native-reanimated'
import { T, typePresets } from '../../lib/theme'
import {
    SessionStorageService,
    type StoredSession,
} from '../../lib/sessionStorage'

const type = typePresets

// ==========================================
// Helpers
// ==========================================

function getGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: 'A+', color: T.color.semantic.success }
    if (score >= 80) return { grade: 'A', color: T.color.semantic.success }
    if (score >= 70) return { grade: 'B+', color: T.color.signature.primary }
    if (score >= 60) return { grade: 'B', color: T.color.semantic.warning }
    if (score >= 50) return { grade: 'C', color: T.color.semantic.warning }
    return { grade: 'D', color: T.color.semantic.error }
}

function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}min ${s}s` : `${s}s`
}

function getMetricStatus(value: number, optimal: number, tolerance: number): string {
    const diff = Math.abs(value - optimal)
    if (diff <= tolerance * 0.5) return 'Excellent'
    if (diff <= tolerance) return 'Bon'
    return 'À améliorer'
}

function getMetricColor(value: number, optimal: number, tolerance: number): string {
    const diff = Math.abs(value - optimal)
    if (diff <= tolerance * 0.5) return T.color.semantic.success
    if (diff <= tolerance) return T.color.semantic.warning
    return T.color.semantic.error
}

// ==========================================
// Sub-components
// ==========================================

function ScoreHeader({ session }: { session: StoredSession }) {
    const score = Math.round(
        session.stats.avgPostureQuality * 0.35 +
        session.stats.mechanicConsistency * 0.25 +
        session.stats.shootingPct * 0.25 +
        session.stats.followThroughPct * 0.15
    )
    const { grade, color } = getGrade(score)
    const date = new Date(session.createdAt)

    return (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.scoreHeader}>
            <View style={[styles.bigGradeCircle, { borderColor: color }]}>
                <Text style={[styles.bigGradeText, { color }]}>{grade}</Text>
                <Text style={[styles.bigScoreNumber, { color }]}>{score}</Text>
            </View>
            <Text style={styles.scoreDate}>
                {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.scoreTime}>
                {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {formatDuration(session.durationSec)}
            </Text>
        </Animated.View>
    )
}

function ShootingStatsCard({ session }: { session: StoredSession }) {
    const fgColor = session.stats.shootingPct >= 50 ? T.color.semantic.success
        : session.stats.shootingPct >= 35 ? T.color.semantic.warning
        : T.color.semantic.error

    return (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
                <Feather name="target" size={14} color={T.color.signature.primary} />
                <Text style={styles.cardTitle}>Statistiques de tir</Text>
            </View>

            <View style={styles.bigFgRow}>
                <Text style={[styles.bigFgValue, { color: fgColor }]}>{session.stats.shootingPct}%</Text>
                <Text style={styles.bigFgLabel}>FG%</Text>
            </View>

            <View style={styles.statGrid}>
                <StatItem label="Tirs tentés" value={String(session.stats.totalShots)} />
                <StatItem label="Réussis" value={String(session.stats.madeShots)} color={T.color.semantic.success} />
                <StatItem label="Ratés" value={String(session.stats.missedShots)} color={T.color.semantic.error} />
                <StatItem label="Follow-Through" value={`${session.stats.followThroughPct.toFixed(0)}%`} />
            </View>
        </Animated.View>
    )
}

function BiomechanicsCard({ session }: { session: StoredSession }) {
    const metrics = [
        {
            label: 'Angle du coude',
            value: `${session.stats.avgElbowAngle.toFixed(1)}°`,
            optimal: 93,
            current: session.stats.avgElbowAngle,
            tolerance: 8,
            icon: 'crosshair',
        },
        {
            label: 'Hauteur de release',
            value: `${session.stats.avgReleaseHeight.toFixed(3)}x`,
            optimal: 1.14,
            current: session.stats.avgReleaseHeight,
            tolerance: 0.08,
            icon: 'arrow-up',
        },
        {
            label: 'Temps de release',
            value: `${(session.stats.avgReleaseTime * 1000).toFixed(0)}ms`,
            optimal: 0.42,
            current: session.stats.avgReleaseTime,
            tolerance: 0.08,
            icon: 'clock',
        },
        {
            label: 'Qualité posture',
            value: `${session.stats.avgPostureQuality.toFixed(0)}/100`,
            optimal: 85,
            current: session.stats.avgPostureQuality,
            tolerance: 15,
            icon: 'user',
        },
        {
            label: 'Consistance',
            value: `${session.stats.mechanicConsistency}/100`,
            optimal: 85,
            current: session.stats.mechanicConsistency,
            tolerance: 20,
            icon: 'repeat',
        },
    ]

    return (
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
                <Feather name="activity" size={14} color={T.color.signature.primary} />
                <Text style={styles.cardTitle}>Biomécanique</Text>
            </View>

            {metrics.map((m, i) => (
                <View key={m.label} style={[styles.bioRow, i === metrics.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.bioLeft}>
                        <Feather name={m.icon as any} size={14} color={T.color.text.tertiary} />
                        <Text style={styles.bioLabel}>{m.label}</Text>
                    </View>
                    <View style={styles.bioRight}>
                        <Text style={[styles.bioValue, { color: getMetricColor(m.current, m.optimal, m.tolerance) }]}>
                            {m.value}
                        </Text>
                        <Text style={[styles.bioStatus, { color: getMetricColor(m.current, m.optimal, m.tolerance) }]}>
                            {getMetricStatus(m.current, m.optimal, m.tolerance)}
                        </Text>
                    </View>
                </View>
            ))}
        </Animated.View>
    )
}

function TrendsCard({ session }: { session: StoredSession }) {
    if (!session.stats.trends || session.stats.trends.length === 0) return null

    return (
        <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
                <Feather name="trending-up" size={14} color={T.color.signature.primary} />
                <Text style={styles.cardTitle}>Tendances de la session</Text>
            </View>

            {session.stats.trends.map((trend, i) => {
                const icon = trend.direction === 'improving' ? 'trending-up'
                    : trend.direction === 'declining' ? 'trending-down' : 'minus'
                const color = trend.direction === 'improving' ? T.color.semantic.success
                    : trend.direction === 'declining' ? T.color.semantic.error
                    : T.color.text.tertiary

                return (
                    <View key={i} style={[styles.trendRow, i === session.stats.trends.length - 1 && { borderBottomWidth: 0 }]}>
                        <Feather name={icon as any} size={16} color={color} />
                        <Text style={[styles.trendText, { color }]}>{trend.description}</Text>
                    </View>
                )
            })}
        </Animated.View>
    )
}

function ShotTimelineCard({ session }: { session: StoredSession }) {
    if (session.shots.length === 0) return null

    const maxQuality = Math.max(...session.shots.map(s => s.postureQuality))
    const minQuality = Math.min(...session.shots.map(s => s.postureQuality))
    const range = maxQuality - minQuality || 1

    return (
        <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.card}>
            <View style={styles.cardHeader}>
                <Feather name="bar-chart" size={14} color={T.color.signature.primary} />
                <Text style={styles.cardTitle}>Timeline des tirs ({session.shots.length})</Text>
            </View>

            <View style={styles.timeline}>
                {session.shots.map((shot, i) => {
                    const height = 8 + ((shot.postureQuality - minQuality) / range) * 28
                    const color = shot.outcome === 'made' ? T.color.semantic.success : T.color.semantic.error

                    return (
                        <View key={i} style={styles.timelineBarWrapper}>
                            <View
                                style={[
                                    styles.timelineBar,
                                    { height, backgroundColor: color },
                                ]}
                            />
                        </View>
                    )
                })}
            </View>

            <View style={styles.timelineLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: T.color.semantic.success }]} />
                    <Text style={styles.legendText}>Made</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: T.color.semantic.error }]} />
                    <Text style={styles.legendText}>Missed</Text>
                </View>
            </View>
        </Animated.View>
    )
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={styles.statItem}>
            <Text style={[styles.statItemValue, color ? { color } : null]}>{value}</Text>
            <Text style={styles.statItemLabel}>{label}</Text>
        </View>
    )
}

// ==========================================
// Main Screen
// ==========================================

export default function SessionDetailScreen() {
    const router = useRouter()
    const { id } = useLocalSearchParams<{ id: string }>()
    const [session, setSession] = useState<StoredSession | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        (async () => {
            if (!id) return
            try {
                const storage = SessionStorageService.getInstance()
                const data = await storage.getSession(id)
                setSession(data)
            } catch (err) {
                console.warn('[SessionDetail] Failed to load:', err)
            } finally {
                setLoading(false)
            }
        })()
    }, [id])

    const handleDelete = useCallback(() => {
        if (!id) return
        Alert.alert(
            'Supprimer la session ?',
            'Cette action est irréversible.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        const storage = SessionStorageService.getInstance()
                        await storage.deleteSession(id)
                        router.back()
                    },
                },
            ],
        )
    }, [id, router])

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Chargement...</Text>
                </View>
            </SafeAreaView>
        )
    }

    if (!session) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Session introuvable</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                        <Text style={styles.backLinkText}>← Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Détail session</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={18} color={T.color.semantic.error} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ScoreHeader session={session} />
                <ShootingStatsCard session={session} />
                <BiomechanicsCard session={session} />
                <TrendsCard session={session} />
                <ShotTimelineCard session={session} />

                {/* Pipeline perf */}
                <Animated.View entering={FadeInDown.delay(400).duration(300)} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="cpu" size={14} color={T.color.text.tertiary} />
                        <Text style={styles.cardTitle}>Performance pipeline</Text>
                    </View>
                    <View style={styles.statGrid}>
                        <StatItem label="Frames" value={String(session.stats.totalFramesProcessed)} />
                        <StatItem label="Temps moyen" value={`${session.stats.avgProcessingTimeMs.toFixed(1)}ms`} />
                    </View>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    deleteBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: T.color.text.secondary,
        fontSize: 14,
        fontFamily: T.fonts.body.regular,
    },
    backLink: {
        marginTop: 16,
    },
    backLinkText: {
        color: T.color.signature.primary,
        fontSize: 14,
        fontFamily: T.fonts.body.semibold,
    },

    // Score header
    scoreHeader: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    bigGradeCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: T.color.background.tertiary,
        marginBottom: 12,
    },
    bigGradeText: {
        fontSize: 22,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    bigScoreNumber: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    scoreDate: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    scoreTime: {
        color: T.color.text.tertiary,
        fontSize: 13,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Cards
    card: {
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Big FG%
    bigFgRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    bigFgValue: {
        fontSize: 42,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    bigFgLabel: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },

    // Stat grid
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statItem: {
        flex: 1,
        minWidth: '40%' as any,
        alignItems: 'center',
        padding: 8,
        backgroundColor: T.color.background.tertiary,
        borderRadius: T.borderRadius.sm,
    },
    statItemValue: {
        color: T.color.text.primary,
        fontSize: 18,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    statItemLabel: {
        color: T.color.text.tertiary,
        fontSize: 11,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Bio rows
    bioRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.base,
    },
    bioLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bioLabel: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
    },
    bioRight: {
        alignItems: 'flex-end',
    },
    bioValue: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    bioStatus: {
        fontSize: 10,
        fontFamily: T.fonts.body.regular,
    },

    // Trends
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.base,
    },
    trendText: {
        fontSize: 13,
        flex: 1,
        fontFamily: T.fonts.body.regular,
    },

    // Timeline
    timeline: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 44,
        gap: 2,
        marginBottom: 8,
    },
    timelineBarWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    timelineBar: {
        width: '80%' as any,
        minWidth: 3,
        borderRadius: 2,
    },
    timelineLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
    },
})

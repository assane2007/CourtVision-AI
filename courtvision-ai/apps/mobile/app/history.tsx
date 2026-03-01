/**
 * CourtVision AI — Session History Screen
 * Historique des sessions d'entraînement avec tendances et stats.
 *
 * Affiche :
 * - Liste des sessions passées (avec score, FG%, durée)
 * - Stats lifetime (total shots, streak, avg score)
 * - Tendances de progression (graphique simplifié)
 *
 * Design V4 : glass cards, amber accent.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, StatusBar,
    StyleSheet, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated'
import { T, typePresets } from '../lib/theme'
import {
    SessionStorageService,
    type SessionHistoryItem,
    type SessionTrend,
} from '../lib/sessionStorage'

const type = typePresets

// ==========================================
// Sub-components
// ==========================================

function LifetimeStatsBar({ stats }: {
    stats: {
        totalSessions: number
        totalShots: number
        overallFgPct: number
        avgScore: number
        currentStreak: number
        totalMinutes: number
    }
}) {
    return (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.lifetimeBar}>
            <View style={styles.lifetimeStat}>
                <Text style={styles.lifetimeValue}>{stats.totalSessions}</Text>
                <Text style={styles.lifetimeLabel}>Sessions</Text>
            </View>
            <View style={styles.lifetimeStat}>
                <Text style={styles.lifetimeValue}>{stats.totalShots}</Text>
                <Text style={styles.lifetimeLabel}>Tirs</Text>
            </View>
            <View style={styles.lifetimeStat}>
                <Text style={[styles.lifetimeValue, { color: T.color.signature.primary }]}>
                    {stats.overallFgPct}%
                </Text>
                <Text style={styles.lifetimeLabel}>FG%</Text>
            </View>
            <View style={styles.lifetimeStat}>
                <Text style={styles.lifetimeValue}>{stats.currentStreak}🔥</Text>
                <Text style={styles.lifetimeLabel}>Streak</Text>
            </View>
        </Animated.View>
    )
}

function TrendCard({ trend, delay = 0 }: { trend: SessionTrend; delay?: number }) {
    const trendLabels: Record<string, string> = {
        shooting_pct: 'FG%',
        posture_quality: 'Posture',
        mechanic_consistency: 'Consistance',
        release_time: 'Release Time',
        follow_through: 'Follow-Through',
    }

    const icon = trend.direction === 'improving' ? 'trending-up'
        : trend.direction === 'declining' ? 'trending-down' : 'minus'
    const color = trend.direction === 'improving' ? T.color.semantic.success
        : trend.direction === 'declining' ? T.color.semantic.error : T.color.text.tertiary

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={styles.trendCard}>
            <View style={styles.trendHeader}>
                <Text style={styles.trendLabel}>{trendLabels[trend.metric] ?? trend.metric}</Text>
                <Feather name={icon as any} size={14} color={color} />
            </View>
            <View style={styles.trendMiniChart}>
                {trend.values.slice(-8).map((v, i, arr) => {
                    const max = Math.max(...arr.map(x => x.value))
                    const min = Math.min(...arr.map(x => x.value))
                    const range = max - min || 1
                    const height = 4 + ((v.value - min) / range) * 20
                    return (
                        <View
                            key={i}
                            style={[
                                styles.trendBar,
                                {
                                    height,
                                    backgroundColor: i === arr.length - 1 ? T.color.signature.primary : T.color.text.tertiary,
                                    opacity: i === arr.length - 1 ? 1 : 0.4,
                                },
                            ]}
                        />
                    )
                })}
            </View>
            <Text style={[styles.trendChange, { color }]}>
                {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
            </Text>
        </Animated.View>
    )
}

function SessionRow({ session, onPress, delay = 0 }: {
    session: SessionHistoryItem
    onPress: () => void
    delay?: number
}) {
    const gradeColor = session.overallScore >= 75 ? T.color.semantic.success
        : session.overallScore >= 50 ? T.color.semantic.warning
        : T.color.semantic.error

    const date = new Date(session.createdAt)
    const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const durationMin = Math.round(session.durationSec / 60)

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)}>
            <TouchableOpacity style={styles.sessionRow} onPress={onPress} activeOpacity={0.7}>
                <View style={[styles.gradeCircle, { borderColor: gradeColor }]}>
                    <Text style={[styles.gradeText, { color: gradeColor }]}>{session.grade}</Text>
                </View>

                <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{dateStr} · {timeStr}</Text>
                    <Text style={styles.sessionMeta}>
                        {session.totalShots} tirs · {session.madeShots}/{session.totalShots} ({session.shootingPct}%) · {durationMin}min
                    </Text>
                </View>

                <View style={styles.sessionScore}>
                    <Text style={[styles.sessionScoreValue, { color: gradeColor }]}>
                        {session.overallScore}
                    </Text>
                    {!session.syncedToCloud ? (
                        <Feather name="cloud-off" size={10} color={T.color.text.tertiary} />
                    ) : (
                        <Feather name="check-circle" size={10} color={T.color.semantic.success} />
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
}

function EmptyState({ onStartWorkout }: { onStartWorkout: () => void }) {
    return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Feather name="target" size={32} color={T.color.signature.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune session</Text>
            <Text style={styles.emptyText}>
                Commence ton premier entraînement pour voir ton historique et tes progrès.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={onStartWorkout} activeOpacity={0.8}>
                <Feather name="play" size={18} color="#FFF" />
                <Text style={styles.emptyBtnText}>Premier workout</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

// ==========================================
// Main Screen
// ==========================================

export default function HistoryScreen() {
    const router = useRouter()
    const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
    const [trends, setTrends] = useState<SessionTrend[]>([])
    const [lifetimeStats, setLifetimeStats] = useState<{
        totalSessions: number
        totalShots: number
        overallFgPct: number
        avgScore: number
        currentStreak: number
        totalMinutes: number
    } | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        try {
            const storage = SessionStorageService.getInstance()
            const [history, trendData, lifetime] = await Promise.all([
                storage.getSessionHistory(50),
                storage.getProgressTrends(10),
                storage.getLifetimeStats(),
            ])
            setSessions(history)
            setTrends(trendData)
            setLifetimeStats(lifetime)
        } catch (err) {
            console.warn('[History] Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()

        // Sync avec le cloud
        try {
            const storage = SessionStorageService.getInstance()
            await storage.syncToCloud()
            await loadData() // Recharger pour mettre à jour les statuts de sync
        } catch {}
        setRefreshing(false)
    }, [loadData])

    const handleSessionPress = useCallback((sessionId: string) => {
        // TODO: naviguer vers l'écran de détail de session
        // router.push(`/session/${sessionId}`)
    }, [router])

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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Historique</Text>
                <View style={{ width: 40 }} />
            </View>

            {sessions.length === 0 ? (
                <EmptyState onStartWorkout={() => router.push('/workout')} />
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={T.color.signature.primary}
                        />
                    }
                >
                    {/* Lifetime stats */}
                    {lifetimeStats && lifetimeStats.totalSessions > 0 ? (
                        <LifetimeStatsBar stats={lifetimeStats} />
                    ) : null}

                    {/* Trends */}
                    {trends.length > 0 ? (
                        <>
                            <Text style={styles.sectionTitle}>📈 Tendances</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.trendsRow}
                            >
                                {trends.map((t, i) => (
                                    <TrendCard key={t.metric} trend={t} delay={i * 50} />
                                ))}
                            </ScrollView>
                        </>
                    ) : null}

                    {/* Sessions list */}
                    <Text style={styles.sectionTitle}>📋 Sessions récentes</Text>
                    {sessions.map((s, i) => (
                        <SessionRow
                            key={s.id}
                            session={s}
                            onPress={() => handleSessionPress(s.id)}
                            delay={i * 30}
                        />
                    ))}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
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

    // Lifetime stats
    lifetimeBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    lifetimeStat: {
        alignItems: 'center',
    },
    lifetimeValue: {
        color: T.color.text.primary,
        fontSize: 20,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    lifetimeLabel: {
        color: T.color.text.tertiary,
        fontSize: 11,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Sections
    sectionTitle: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
        fontFamily: T.fonts.display.bold,
    },

    // Trends
    trendsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 4,
    },
    trendCard: {
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.md,
        padding: 12,
        minWidth: 110,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    trendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    trendLabel: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.semibold,
    },
    trendMiniChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 24,
        marginBottom: 6,
    },
    trendBar: {
        width: 8,
        borderRadius: 2,
    },
    trendChange: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Session row
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.md,
        padding: 12,
        borderWidth: 1,
        borderColor: T.color.border.base,
        gap: 12,
    },
    gradeCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: T.color.background.tertiary,
    },
    gradeText: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionDate: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    sessionMeta: {
        color: T.color.text.tertiary,
        fontSize: 12,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },
    sessionScore: {
        alignItems: 'center',
        gap: 4,
    },
    sessionScoreValue: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: T.color.signature.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        color: T.color.text.primary,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: T.fonts.display.bold,
    },
    emptyText: {
        color: T.color.text.secondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        fontFamily: T.fonts.body.regular,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: T.color.signature.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
    },
    emptyBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
})

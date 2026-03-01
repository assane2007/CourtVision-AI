/**
 * CourtVision AI — Leaderboard / Community Screen
 * Classement des joueurs avec filtres par période et métrique.
 *
 * Sections :
 * 1. Tabs (Weekly / Monthly / All-Time)
 * 2. Leaderboard avec classement
 * 3. Position de l'utilisateur
 * 4. Badges et achievements récents
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
    ZoomIn,
} from 'react-native-reanimated'
import { T, typePresets } from '../lib/theme'

const type = typePresets

// ==========================================
// Types
// ==========================================

interface LeaderboardEntry {
    rank: number
    userId: string
    displayName: string
    avatarInitials: string
    level: number
    value: number
    delta: number // Change from previous period
    isCurrentUser: boolean
}

interface Achievement {
    id: string
    title: string
    description: string
    icon: string
    earnedAt: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

type Period = 'weekly' | 'monthly' | 'alltime'
type Metric = 'score' | 'fgPct' | 'consistency' | 'sessions'

// ==========================================
// Mock Data (à remplacer par l'API)
// ==========================================

function generateMockLeaderboard(metric: Metric, currentUserId: string): LeaderboardEntry[] {
    const names = [
        'Jordan M.', 'LeBron J.', 'Kobe B.', 'Steph C.', 'Kevin D.',
        'Giannis A.', 'Luka D.', 'Jayson T.', 'Shai G.', 'Anthony E.',
        'Ja M.', 'Trae Y.', 'Devin B.', 'Bam A.', 'Domantas S.',
    ]

    const getBaseValue = (m: Metric) => {
        switch (m) {
            case 'score': return { mean: 72, std: 12 }
            case 'fgPct': return { mean: 42, std: 8 }
            case 'consistency': return { mean: 65, std: 15 }
            case 'sessions': return { mean: 18, std: 8 }
        }
    }

    const base = getBaseValue(metric)
    const entries: LeaderboardEntry[] = names.map((name, i) => {
        const value = Math.round(base.mean + (Math.random() - 0.3) * base.std * 2)
        return {
            rank: 0,
            userId: `user_${i}`,
            displayName: name,
            avatarInitials: name.split(' ').map(n => n[0]).join(''),
            level: Math.floor(Math.random() * 20) + 5,
            value: Math.max(0, value),
            delta: Math.round((Math.random() - 0.4) * 10),
            isCurrentUser: false,
        }
    })

    // Insert current user at a random position
    entries.push({
        rank: 0,
        userId: currentUserId,
        displayName: 'Toi',
        avatarInitials: 'ME',
        level: 8,
        value: Math.round(base.mean + (Math.random() - 0.2) * base.std),
        delta: Math.round(Math.random() * 5),
        isCurrentUser: true,
    })

    // Sort and assign ranks
    entries.sort((a, b) => b.value - a.value)
    entries.forEach((e, i) => { e.rank = i + 1 })

    return entries
}

const MOCK_ACHIEVEMENTS: Achievement[] = [
    {
        id: '1',
        title: 'Premier Workout',
        description: 'Complété ton premier entraînement IA',
        icon: 'award',
        earnedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        rarity: 'common',
    },
    {
        id: '2',
        title: 'Sniper',
        description: '3 sessions consécutives avec FG% > 50%',
        icon: 'crosshair',
        earnedAt: new Date(Date.now() - 86400000).toISOString(),
        rarity: 'rare',
    },
    {
        id: '3',
        title: 'Machine',
        description: 'Score de consistance > 80 sur 5 sessions',
        icon: 'cpu',
        earnedAt: new Date().toISOString(),
        rarity: 'epic',
    },
]

// ==========================================
// Sub-components
// ==========================================

function PeriodTabs({ selected, onSelect }: { selected: Period; onSelect: (p: Period) => void }) {
    const tabs: Array<{ key: Period; label: string }> = [
        { key: 'weekly', label: 'Semaine' },
        { key: 'monthly', label: 'Mois' },
        { key: 'alltime', label: 'All-Time' },
    ]

    return (
        <View style={styles.periodRow}>
            {tabs.map(t => (
                <TouchableOpacity
                    key={t.key}
                    style={[styles.periodTab, t.key === selected && styles.periodTabActive]}
                    onPress={() => onSelect(t.key)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.periodText, t.key === selected && styles.periodTextActive]}>
                        {t.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    )
}

function MetricSelector({ selected, onSelect }: { selected: Metric; onSelect: (m: Metric) => void }) {
    const metrics: Array<{ key: Metric; label: string; icon: string }> = [
        { key: 'score', label: 'Score', icon: 'star' },
        { key: 'fgPct', label: 'FG%', icon: 'target' },
        { key: 'consistency', label: 'Consistance', icon: 'repeat' },
        { key: 'sessions', label: 'Sessions', icon: 'calendar' },
    ]

    return (
        <View style={styles.metricRow}>
            {metrics.map(m => (
                <TouchableOpacity
                    key={m.key}
                    style={[styles.metricChip, m.key === selected && styles.metricChipActive]}
                    onPress={() => onSelect(m.key)}
                    activeOpacity={0.7}
                >
                    <Feather
                        name={m.icon as any}
                        size={12}
                        color={m.key === selected ? T.color.signature.primary : T.color.text.tertiary}
                    />
                    <Text style={[styles.metricChipText, m.key === selected && styles.metricChipTextActive]}>
                        {m.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    )
}

function LeaderboardRow({ entry, delay = 0 }: { entry: LeaderboardEntry; delay?: number }) {
    const rankColor = entry.rank === 1 ? '#FFD700'
        : entry.rank === 2 ? '#C0C0C0'
        : entry.rank === 3 ? '#CD7F32'
        : T.color.text.tertiary

    const isTop3 = entry.rank <= 3
    const deltaColor = entry.delta > 0 ? T.color.semantic.success
        : entry.delta < 0 ? T.color.semantic.error
        : T.color.text.tertiary

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)}>
            <View style={[
                styles.leaderRow,
                entry.isCurrentUser && styles.leaderRowCurrent,
            ]}>
                {/* Rank */}
                <View style={[styles.rankCircle, isTop3 && { borderColor: rankColor }]}>
                    {isTop3 ? (
                        <Text style={[styles.rankText, { color: rankColor }]}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </Text>
                    ) : (
                        <Text style={styles.rankText}>{entry.rank}</Text>
                    )}
                </View>

                {/* Avatar */}
                <View style={[styles.avatar, entry.isCurrentUser && styles.avatarCurrent]}>
                    <Text style={[styles.avatarText, entry.isCurrentUser && styles.avatarTextCurrent]}>
                        {entry.avatarInitials}
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.leaderInfo}>
                    <Text style={[styles.leaderName, entry.isCurrentUser && styles.leaderNameCurrent]}>
                        {entry.displayName}
                    </Text>
                    <Text style={styles.leaderLevel}>Niveau {entry.level}</Text>
                </View>

                {/* Value + Delta */}
                <View style={styles.leaderValue}>
                    <Text style={[styles.leaderValueText, entry.isCurrentUser && { color: T.color.signature.primary }]}>
                        {entry.value}
                    </Text>
                    {entry.delta !== 0 ? (
                        <View style={styles.deltaRow}>
                            <Feather
                                name={entry.delta > 0 ? 'arrow-up' : 'arrow-down'}
                                size={10}
                                color={deltaColor}
                            />
                            <Text style={[styles.deltaText, { color: deltaColor }]}>
                                {Math.abs(entry.delta)}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </Animated.View>
    )
}

function AchievementCard({ achievement, delay = 0 }: { achievement: Achievement; delay?: number }) {
    const rarityColors: Record<string, string> = {
        common: T.color.text.tertiary,
        rare: '#3B82F6',
        epic: '#8B5CF6',
        legendary: '#FFD700',
    }
    const color = rarityColors[achievement.rarity] ?? T.color.text.tertiary

    return (
        <Animated.View entering={ZoomIn.delay(delay).duration(300)} style={styles.achievementCard}>
            <View style={[styles.achievementIcon, { borderColor: color }]}>
                <Feather name={achievement.icon as any} size={18} color={color} />
            </View>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementDesc}>{achievement.description}</Text>
            <Text style={[styles.achievementRarity, { color }]}>
                {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
            </Text>
        </Animated.View>
    )
}

// ==========================================
// Main Screen
// ==========================================

export default function LeaderboardScreen() {
    const router = useRouter()
    const [period, setPeriod] = useState<Period>('weekly')
    const [metric, setMetric] = useState<Metric>('score')
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadLeaderboard()
    }, [period, metric])

    const loadLeaderboard = useCallback(() => {
        // En production, appel API
        const data = generateMockLeaderboard(metric, 'current_user')
        setEntries(data)
    }, [metric])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        loadLeaderboard()
        setTimeout(() => setRefreshing(false), 500)
    }, [loadLeaderboard])

    const currentUser = entries.find(e => e.isCurrentUser)

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Classement</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Period Tabs */}
            <PeriodTabs selected={period} onSelect={setPeriod} />

            {/* Metric Selector */}
            <MetricSelector selected={metric} onSelect={setMetric} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={T.color.signature.primary}
                    />
                }
            >
                {/* Current User Position */}
                {currentUser ? (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.currentUserCard}>
                        <Text style={styles.currentUserLabel}>Ta position</Text>
                        <View style={styles.currentUserRow}>
                            <View style={styles.currentUserRank}>
                                <Text style={styles.currentUserRankText}>#{currentUser.rank}</Text>
                            </View>
                            <View style={styles.currentUserStats}>
                                <Text style={styles.currentUserValue}>{currentUser.value}</Text>
                                <Text style={styles.currentUserMetric}>
                                    {metric === 'fgPct' ? 'FG%' : metric === 'sessions' ? 'sessions' : 'pts'}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.currentUserOf}>sur {entries.length}</Text>
                            </View>
                        </View>
                    </Animated.View>
                ) : null}

                {/* Leaderboard */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="award" size={14} color={T.color.signature.primary} />
                        <Text style={styles.cardTitle}>Top joueurs</Text>
                    </View>

                    {entries.slice(0, 20).map((entry, i) => (
                        <LeaderboardRow key={entry.userId} entry={entry} delay={i * 30} />
                    ))}
                </View>

                {/* Achievements */}
                <View style={[styles.card, { marginTop: 12 }]}>
                    <View style={styles.cardHeader}>
                        <Feather name="star" size={14} color={T.color.signature.primary} />
                        <Text style={styles.cardTitle}>Badges récents</Text>
                    </View>
                    <View style={styles.achievementsRow}>
                        {MOCK_ACHIEVEMENTS.map((a, i) => (
                            <AchievementCard key={a.id} achievement={a} delay={i * 100} />
                        ))}
                    </View>
                </View>
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Period tabs
    periodRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        gap: 4,
        marginBottom: 8,
    },
    periodTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: T.color.background.secondary,
    },
    periodTabActive: {
        backgroundColor: `${T.color.signature.primary}15`,
        borderWidth: 1,
        borderColor: `${T.color.signature.primary}30`,
    },
    periodText: {
        color: T.color.text.tertiary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    periodTextActive: {
        color: T.color.signature.primary,
    },

    // Metric chips
    metricRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        gap: 6,
        marginBottom: 8,
    },
    metricChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: T.color.background.secondary,
    },
    metricChipActive: {
        backgroundColor: `${T.color.signature.primary}12`,
        borderWidth: 1,
        borderColor: `${T.color.signature.primary}25`,
    },
    metricChipText: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    metricChipTextActive: {
        color: T.color.signature.primary,
    },

    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        gap: 12,
        paddingBottom: 40,
    },

    // Current user card
    currentUserCard: {
        backgroundColor: `${T.color.signature.primary}10`,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: `${T.color.signature.primary}25`,
    },
    currentUserLabel: {
        color: T.color.text.secondary,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        fontFamily: T.fonts.body.semibold,
    },
    currentUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    currentUserRank: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: T.color.signature.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    currentUserRankText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    currentUserStats: {
        flex: 1,
    },
    currentUserValue: {
        color: T.color.signature.primary,
        fontSize: 28,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    currentUserMetric: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },
    currentUserOf: {
        color: T.color.text.tertiary,
        fontSize: 13,
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
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Leaderboard rows
    leaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.base,
    },
    leaderRowCurrent: {
        backgroundColor: `${T.color.signature.primary}08`,
        borderRadius: 10,
        paddingHorizontal: 8,
        marginHorizontal: -8,
        borderBottomWidth: 0,
    },
    rankCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    rankText: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: T.color.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCurrent: {
        backgroundColor: `${T.color.signature.primary}20`,
    },
    avatarText: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    avatarTextCurrent: {
        color: T.color.signature.primary,
    },
    leaderInfo: {
        flex: 1,
    },
    leaderName: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    leaderNameCurrent: {
        color: T.color.signature.primary,
        fontWeight: '700',
    },
    leaderLevel: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
    },
    leaderValue: {
        alignItems: 'flex-end',
    },
    leaderValueText: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    deltaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    deltaText: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },

    // Achievements
    achievementsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    achievementCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        backgroundColor: T.color.background.tertiary,
        borderRadius: T.borderRadius.md,
    },
    achievementIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 8,
    },
    achievementTitle: {
        color: T.color.text.primary,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: T.fonts.display.bold,
    },
    achievementDesc: {
        color: T.color.text.tertiary,
        fontSize: 9,
        textAlign: 'center',
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },
    achievementRarity: {
        fontSize: 9,
        fontWeight: '600',
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: T.fonts.body.semibold,
    },
})

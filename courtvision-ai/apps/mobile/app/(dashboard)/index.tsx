/**
 * CourtVision AI — Dashboard V5 PERFECTION
 * "Court Night" — gluestack-ui × CourtVision Design System
 *
 * Skills applied: mobile-design (touch-first, 44px targets, FlatList, memo, StyleSheet),
 *                 react-native-architecture (proper imports, memoization),
 *                 performance (zero inline styles, SVG ring, native driver animations)
 *
 * SECTIONS:
 *   1. Hero Header (greeting + SVG avatar XP ring)
 *   2. Hero Stat Card (dominant FG% with progress bar)
 *   3. Mini Stat Cards (3-col)
 *   4. AI Coach (cross-session intelligence insights)
 *   5. Daily Challenge (amber-tinted card)
 *   6. Weekly Quest (multi-step weekly quest card)
 *   7. Weekly Progression Chart
 *   8. Interactive Terrain + Court Hotzones
 *   9. Quick Actions (2 rows × 3)
 *  10. Recent Highlights (horizontal FlatList)
 */

import {
    View, Text, ScrollView, FlatList, TouchableOpacity,
    RefreshControl, Dimensions, Platform, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useCallback, useState, memo } from 'react'
import Animated, {
    FadeInDown, FadeInRight,
    useSharedValue, useAnimatedStyle, withTiming, withSpring,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import {
    useStore,
    selectWeekly,
    selectHighlights,
    selectStreak,
    selectXP,
    xpToLevel,
    xpToNextLevel,
    type HighlightClip,
} from '../../lib/store'
import { SkeletonHighlight, SkeletonStatCard } from '../../components/SkeletonLoader'
import { XPLevelBar } from '../../components/gamification/XPBadge'
import { DailyChallengeCard } from '../../components/gamification/DailyChallengeCard'
import { WeeklyQuestCard } from '../../components/gamification/WeeklyQuestCard'
import { AICoachCard } from '../../components/gamification/AICoachCard'
import { StreakReminderBanner } from '../../components/gamification/StreakReminderBanner'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StatCard } from '../../components/dashboard/StatCard'
import {
    GlassCard, CVText, CVSection, CVStatRow, CVBadge,
    CVActionCard, CVEmptyState, CVProgressBar, CVButton,
    CVAnalyticsChart, CourtHeatmap,
} from '../../components/ui'
import { T, typePresets } from '../../lib/theme'
import { InteractiveTerrainVisualizer } from '../../components/dashboard/InteractiveTerrainVisualizer'
import { HapticFeedback } from '../../lib/haptics'
import { useRevenueCat } from '../../lib/revenuecat'
import { SessionStorageService } from '../../lib/sessionStorage'
import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Greeting ───────────────────────────────────────────────

function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
}

// ─── Avatar with SVG XP Ring (replaces CSS border hack) ─────

const RING_SIZE = 56
const RING_R = 24
const RING_CIRCUM = 2 * Math.PI * RING_R
const RING_STROKE = 2.5

const AvatarXPRing = memo(function AvatarXPRing({ name, xp }: { name: string; xp: number }) {
    const level = xpToLevel(xp)
    const { pct } = xpToNextLevel(xp)
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    const ringOffset = RING_CIRCUM * (1 - pct / 100)

    return (
        <View style={ds.avatarWrap}>
            {/* SVG progress ring — pixel-perfect arc */}
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFillObject}>
                <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_R}
                    stroke={`${T.color.brand.primary}15`}
                    strokeWidth={RING_STROKE}
                    fill="transparent"
                />
                <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_R}
                    stroke={T.color.brand.primary}
                    strokeWidth={RING_STROKE}
                    fill="transparent"
                    strokeDasharray={`${RING_CIRCUM}`}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
            </Svg>
            {/* Inner avatar */}
            <View style={ds.avatarInner}>
                <Text style={ds.avatarInitials}>{initials}</Text>
            </View>
            {/* Level badge */}
            <View style={ds.avatarLevelBadge}>
                <Text style={ds.avatarLevelText}>{level}</Text>
            </View>
        </View>
    )
})

// ─── Hero Stat Card ────────────────────────────────────────

const HeroStatCard = memo(function HeroStatCard({ value, label, delta }: {
    value: number; label: string; delta: string
}) {
    const progress = Math.min(value / 100, 1)

    return (
        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <GlassCard variant="accent" style={ds.heroCard}>
                <View style={ds.heroHeader}>
                    <CVText preset="overline" color="secondary">{label}</CVText>
                    <CVBadge label={delta} variant="success" size="sm" />
                </View>
                <View style={ds.heroValueRow}>
                    <Text style={ds.heroValue}>{value}</Text>
                    <Text style={ds.heroUnit}>%</Text>
                </View>
                <CVProgressBar value={progress} color="brand" height={6} />
            </GlassCard>
        </Animated.View>
    )
})

// ─── Highlight Card ─────────────────────────────────────────

const HighlightCard = memo(function HighlightCard({ clip, onPress }: {
    clip: HighlightClip; onPress: () => void
}) {
    const scale = useSharedValue(1)
    const pressStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Animated.View style={[ds.highlightOuter, pressStyle]}>
            <TouchableOpacity
                style={[ds.highlightCard, T.glass.vivid]}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, T.spring.snappy) }}
                onPressOut={() => { scale.value = withSpring(1, T.spring.snappy) }}
                activeOpacity={1}
                accessibilityLabel={`Highlight: ${clip.label}`}
            >
                <View style={ds.highlightThumb}>
                    <Feather name="play-circle" size={24} color={T.color.text.primary} />
                </View>
                <CVText preset="caption" color="primary" numberOfLines={1} style={ds.highlightLabel}>
                    {clip.label}
                </CVText>
                {clip.pts != null && (
                    <CVText preset="overline" color="brand">{clip.pts} pts</CVText>
                )}
            </TouchableOpacity>
        </Animated.View>
    )
})

// ─── Section Header ─────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({ title, action, onAction }: {
    title: string; action?: string; onAction?: () => void
}) {
    return (
        <View style={ds.sectionHeader}>
            <CVText preset="h2">{title}</CVText>
            {action && onAction && (
                <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <CVText preset="overline" color="brand">{action} →</CVText>
                </TouchableOpacity>
            )}
        </View>
    )
})

// ─── Quick Action ───────────────────────────────────────────

const QuickAction = memo(function QuickAction({ icon, label, color, onPress }: {
    icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void
}) {
    const scale = useSharedValue(1)
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

    return (
        <Animated.View style={[ds.quickActionWrap, animStyle]}>
            <TouchableOpacity
                style={[ds.quickAction, T.glass.thin]}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, T.spring.snappy) }}
                onPressOut={() => { scale.value = withSpring(1, T.spring.snappy) }}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                <View style={[ds.quickActionIcon, { backgroundColor: `${color}15` }]}>
                    <Feather name={icon} size={18} color={color} />
                </View>
                <CVText preset="overline" color="secondary" align="center">{label}</CVText>
            </TouchableOpacity>
        </Animated.View>
    )
})

// ─── Empty State ────────────────────────────────────────────

const EmptyTodayCard = memo(function EmptyTodayCard({ onUpload }: { onUpload: () => void }) {
    return (
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
            <View style={[ds.emptyCard, T.glass.vivid]}>
                <View style={ds.emptyIcon}>
                    <Text style={ds.emptyEmoji}>🏀</Text>
                </View>
                <CVText preset="h2" color="primary" align="center">
                    No session today — yet
                </CVText>
                <CVText preset="body" color="secondary" align="center">
                    {'Film your game and let AI break down\nevery shot, every detail.'}
                </CVText>
                <PrimaryButton
                    label="Start Today's Session"
                    icon="video"
                    onPress={() => {
                        HapticFeedback.light();
                        onUpload();
                    }}
                    size="md"
                />
            </View>
        </Animated.View>
    )
})

// ─── Data Lab Summary Banner ────────────────────────────────

const DataLabBanner = memo(function DataLabBanner({ onPress }: { onPress: () => void }) {
    const { summary, loading } = useAdvancedAnalytics()
    if (loading || !summary || summary.dataQuality === 'insufficient') return null

    const qualityColor = summary.dataQuality === 'excellent' ? T.color.semantic.success
        : summary.dataQuality === 'good' ? T.color.brand.primary
            : T.color.semantic.warning

    return (
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <TouchableOpacity style={[ds.dataLabBanner, T.glass.vivid]} onPress={onPress} activeOpacity={0.8}>
                <View style={ds.dataLabBannerRow}>
                    <View style={[ds.dataLabIcon, { backgroundColor: `${qualityColor}15` }]}>
                        <Text style={ds.dataLabEmoji}>🧬</Text>
                    </View>
                    <View style={ds.dataLabTextCol}>
                        <Text style={ds.dataLabTitle}>Data Lab</Text>
                        <Text style={ds.dataLabHeadline} numberOfLines={2}>{summary.headline}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={T.color.text.tertiary} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
})

// ─── Highlight keyExtractor (stable ref) ────────────────────

const highlightKey = (item: HighlightClip) => item.id

// ═════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════

export default function DashboardIndex() {
    const router = useRouter()
    const { isPro } = useRevenueCat()
    const [refreshing, setRefreshing] = useState(false)

    const weeklyData = useStore(selectWeekly)
    const highlights = useStore(selectHighlights)
    const streak = useStore(selectStreak)
    const xp = useStore(selectXP)
    const user = useStore(s => s.user)
    const weeklyLoading = useStore(s => s.weeklyLoading)
    const highlightsLoading = useStore(s => s.highlightsLoading)
    const userLoading = useStore(s => s.userLoading)
    const loadWeeklyData = useStore(s => s.loadWeeklyData)
    const loadHighlights = useStore(s => s.loadHighlights)
    const refreshProfile = useStore(s => s.refreshProfile)

    useEffect(() => { loadWeeklyData(); loadHighlights() }, [loadWeeklyData, loadHighlights])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await Promise.all([refreshProfile(), loadWeeklyData(), loadHighlights()])
        setRefreshing(false)
    }, [refreshProfile, loadWeeklyData, loadHighlights])

    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Player'
    const greeting = getGreeting()
    const shootingFgPct = user?.shooting_fg_pct ?? 0
    const mentalScore = user?.mental_score ?? 0
    const headlineStat = shootingFgPct > 0 ? shootingFgPct : mentalScore
    const hasSession = !!shootingFgPct || !!mentalScore

    const [shooting3ptPct, setShooting3ptPct] = useState(0)
    const [shootingHeatData, setShootingHeatData] = useState<Array<{ id: string; x: number; y: number; accuracy: number; shots: number }>>([])

    useEffect(() => {
        const storage = SessionStorageService.getInstance()
        storage.getZoneStats(50).then(stats => {
            const threePointZones = ['left_corner_3', 'right_corner_3', 'left_wing', 'right_wing', 'top_key']
            let totalAttempts = 0
            let totalMade = 0
            for (const zone of threePointZones) {
                const s = stats[zone]
                if (s) { totalAttempts += s.attempts; totalMade += s.made }
            }
            setShooting3ptPct(totalAttempts > 0 ? Math.round((totalMade / totalAttempts) * 100) : 0)

            // Build heatmap data from real zone stats
            const zonePositions: Record<string, { x: number; y: number }> = {
                paint:          { x: 50, y: 80 },
                left_corner_3:  { x: 8,  y: 85 },
                right_corner_3: { x: 92, y: 85 },
                left_wing:      { x: 15, y: 45 },
                right_wing:     { x: 85, y: 45 },
                top_key:        { x: 50, y: 20 },
                left_elbow:     { x: 30, y: 55 },
                right_elbow:    { x: 70, y: 55 },
                mid_range:      { x: 50, y: 55 },
                free_throw:     { x: 50, y: 65 },
            }
            const heat: Array<{ id: string; x: number; y: number; accuracy: number; shots: number }> = []
            for (const [zone, pos] of Object.entries(zonePositions)) {
                const s = stats[zone]
                if (s && s.attempts > 0) {
                    heat.push({ id: zone, x: pos.x, y: pos.y, accuracy: s.pct, shots: s.attempts })
                }
            }
            setShootingHeatData(heat)
        }).catch(() => {})
    }, [])

    const chartData = weeklyData.map(d => ({
        label: d.day,
        value: d.hasSession ? Math.max(d.mental || 0, d.shooting || 0) : 0,
    }))

    const goUpload = useCallback(() => router.push('/(dashboard)/upload'), [router])
    const goAnalytics = useCallback(() => {
        if (!isPro) return router.push('/paywall')
        router.push('/analytics')
    }, [router, isPro])

    const goProFeature = useCallback((route: string) => {
        if (isPro) router.push(route as any)
        else router.push('/paywall')
    }, [isPro, router])

    const goHighlight = useCallback(
        (id: string) => router.push(`/highlight/${id}`),
        [router],
    )

    const renderHighlight = useCallback(
        ({ item }: { item: HighlightClip }) => (
            <HighlightCard clip={item} onPress={() => goHighlight(item.id)} />
        ),
        [goHighlight],
    )

    return (
        <SafeAreaView style={ds.screen}>
            {/* Subtle ambient glow */}
            <View style={ds.ambientGlow} />

            <ScrollView
                contentContainerStyle={ds.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={T.color.brand.primary}
                        colors={[T.color.brand.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ═══ HERO HEADER ═══ */}
                <Animated.View entering={FadeInDown.duration(500)} style={ds.heroHeader2}>
                    <View style={ds.heroHeaderLeft}>
                        <CVText preset="overline" color="tertiary" style={ds.greetingText}>
                            {greeting.toUpperCase()}
                        </CVText>
                        <CVText preset="h1" color="primary">{firstName}</CVText>
                    </View>
                    <View style={ds.heroHeaderRight}>
                        {streak > 0 && (
                            <Animated.View
                                entering={FadeInRight.delay(200).duration(400)}
                                style={[ds.streakPill, T.glass.frosted]}
                            >
                                <Text style={ds.streakEmoji}>🔥</Text>
                                <Text style={ds.streakValue}>{streak}</Text>
                            </Animated.View>
                        )}
                        <AvatarXPRing name={user?.full_name ?? 'Player'} xp={xp} />
                        <TouchableOpacity
                            onPress={() => router.push('/settings')}
                            style={ds.settingsButton}
                            accessibilityLabel="Settings"
                        >
                            <Feather name="settings" size={18} color={T.color.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(400)} style={ds.xpBarSection}>
                    <XPLevelBar xp={xp} compact />
                </Animated.View>

                <StreakReminderBanner />

                {/* ═══ HERO STAT ═══ */}
                {userLoading ? (
                    <View style={ds.skeletonRow}>
                        <SkeletonStatCard /><SkeletonStatCard />
                    </View>
                ) : hasSession ? (
                    <View style={ds.heroStatSection}>
                        <HeroStatCard
                            value={headlineStat}
                            label={shootingFgPct > 0 ? 'SHOOTING' : 'MENTAL'}
                            delta="▲ +4.2% vs last week"
                        />
                    </View>
                ) : (
                    <View style={ds.heroStatSection}>
                        <EmptyTodayCard onUpload={goUpload} />
                    </View>
                )}

                {/* ═══ MINI CARDS ═══ */}
                {hasSession && (
                    <Animated.View entering={FadeInDown.delay(160).duration(400)} style={ds.miniCardRow}>
                        <View style={ds.miniCardFlex}>
                            <StatCard label="FG%" value={shootingFgPct > 0 ? Math.round(shootingFgPct) : 0} unit="%" variant="accent" size="sm" />
                        </View>
                        <View style={ds.miniCardFlex}>
                            <StatCard label="XP" value={xp} variant="default" size="sm" />
                        </View>
                        <View style={ds.miniCardFlex}>
                            <StatCard label="3PT%" value={shooting3ptPct ? Math.round(shooting3ptPct) : 0} unit="%" variant="default" size="sm" />
                        </View>
                    </Animated.View>
                )}

                {/* ═══ AI COACH ═══ */}
                <View style={ds.sectionWrap}>
                    <SectionHeader title="AI Coach" />
                    <AICoachCard />
                </View>

                {/* ═══ DATA LAB SUMMARY ═══ */}
                <View style={ds.sectionWrap}>
                    <DataLabBanner onPress={goAnalytics} />
                </View>

                {/* ═══ DAILY CHALLENGE ═══ */}
                <View style={ds.sectionWrap}>
                    <SectionHeader title="Daily Challenge" />
                    <DailyChallengeCard />
                </View>

                {/* ═══ WEEKLY QUEST ═══ */}
                <View style={ds.sectionWrap}>
                    <SectionHeader title="Weekly Quest" />
                    <WeeklyQuestCard />
                </View>

                {/* ═══ WEEKLY PROGRESS ═══ */}
                <View style={ds.sectionWrapLg}>
                    <SectionHeader title="Progression" action="Full Stats" onAction={goAnalytics} />
                    <CVAnalyticsChart data={chartData} />
                </View>

                {/* ═══ INTERACTIVE TERRAIN ═══ */}
                <View style={ds.sectionWrapLg}>
                    <InteractiveTerrainVisualizer />
                </View>

                {/* ═══ COURT HOTZONES ═══ */}
                <View style={ds.sectionWrapLg}>
                    <SectionHeader title="Court Hotzones" />
                    <CourtHeatmap data={shootingHeatData} />
                </View>

                {/* ═══ QUICK ACTIONS ═══ */}
                <Animated.View entering={FadeInDown.delay(240).duration(400)} style={ds.quickActionRow}>
                    <QuickAction icon="cpu" label="PRE-COG 👑" color={T.color.brand.primary} onPress={() => goProFeature('/(app)/precog')} />
                    <QuickAction icon="zap" label="WORKOUT AI" color="#FFBA00" onPress={() => router.push('/workout-setup')} />
                    <QuickAction icon="message-circle" label="COACH CHAT 👑" color={T.color.semantic.error} onPress={() => goProFeature('/(app)/coach')} />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(280).duration(400)} style={ds.quickActionRowBottom}>
                    <QuickAction icon="calendar" label="PROGRAM" color={T.color.semantic.success} onPress={() => router.push('/program')} />
                    <QuickAction icon="bar-chart-2" label="ANALYTICS 👑" color="#8B5CF6" onPress={goAnalytics} />
                    <QuickAction icon="layers" label="V6 CENTER" color="#FFD700" onPress={() => router.push('/(dashboard)/v6' as any)} />
                </Animated.View>

                {/* ═══ HIGHLIGHTS ═══ */}
                <SectionHeader
                    title="Recent Highlights"
                    action={highlights.length > 0 ? 'Upload more' : undefined}
                    onAction={goUpload}
                />

                {highlightsLoading && highlights.length === 0 ? (
                    <View style={ds.skeletonHighlightRow}>
                        {[1, 2, 3].map(i => <SkeletonHighlight key={i} />)}
                    </View>
                ) : highlights.length === 0 ? (
                    <View style={[ds.emptyHighlights, T.glass.thin]}>
                        <Feather name="film" size={22} color={T.color.text.tertiary} />
                        <CVText preset="caption" color="secondary" align="center">
                            {'No highlights yet.\nAnalyze a game to generate AI clips.'}
                        </CVText>
                        <PrimaryButton
                            label="Upload Highlights"
                            variant="primary"
                            icon="upload-cloud"
                            size="sm"
                            fullWidth={false}
                            onPress={goUpload}
                        />
                    </View>
                ) : (
                    <FlatList
                        horizontal
                        data={highlights}
                        keyExtractor={highlightKey}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={ds.highlightList}
                        renderItem={renderHighlight}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ═════════════════════════════════════════════════════════════
// StyleSheet — Zero inline styles
// ═════════════════════════════════════════════════════════════

const ds = StyleSheet.create({
    // Screen
    screen: {
        flex: 1,
        backgroundColor: T.color.bg.primary,
    },
    scrollContent: {
        paddingHorizontal: T.spacing[4],
        paddingTop: T.spacing[4],
        paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    },
    ambientGlow: {
        position: 'absolute',
        top: -120,
        left: '15%',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(255,107,0,0.01)',
    },

    // Hero Header
    heroHeader2: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: T.spacing[2],
    },
    heroHeaderLeft: {
        flex: 1,
        gap: 4,
    },
    greetingText: {
        letterSpacing: 1.5,
    },
    heroHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.spacing[3],
    },
    streakPill: {
        borderRadius: T.radius.md,
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    streakEmoji: {
        fontSize: 16,
    },
    streakValue: {
        color: T.color.brand.primary,
        fontFamily: T.fonts.display.black,
        fontSize: 18,
        fontVariant: ['tabular-nums'],
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.color.bg.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: T.color.border.base,
    },

    // Avatar XP Ring
    avatarWrap: {
        width: RING_SIZE,
        height: RING_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.color.bg.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: T.color.text.primary,
        fontSize: 16,
        fontFamily: T.fonts.display.bold,
    },
    avatarLevelBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: T.color.brand.primary,
        borderRadius: 8,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: T.color.bg.primary,
    },
    avatarLevelText: {
        color: T.color.text.inverse,
        fontSize: 9,
        fontFamily: T.fonts.display.black,
    },

    // XP Bar
    xpBarSection: {
        marginBottom: T.spacing[5],
    },

    // Hero Stat
    heroStatSection: {
        marginBottom: T.spacing[5],
    },
    heroCard: {
        padding: T.spacing[5],
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: T.spacing[2],
    },
    heroValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: T.spacing[3],
    },
    heroValue: {
        ...typePresets.hero,
        color: T.color.text.primary,
    },
    heroUnit: {
        ...typePresets.statLarge,
        color: T.color.text.secondary,
        marginLeft: 2,
    },

    // Skeleton
    skeletonRow: {
        flexDirection: 'row',
        gap: T.spacing[3],
        marginBottom: T.spacing[5],
    },

    // Mini Cards
    miniCardRow: {
        flexDirection: 'row',
        gap: T.spacing[3],
        marginBottom: T.spacing[5],
    },
    miniCardFlex: {
        flex: 1,
    },

    // Section
    sectionWrap: {
        marginBottom: T.spacing[5],
    },
    sectionWrapLg: {
        marginBottom: T.spacing[6],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: T.spacing[3],
    },

    // Quick Actions
    quickActionRow: {
        flexDirection: 'row',
        gap: T.spacing[3],
        marginBottom: T.spacing[3],
    },
    quickActionRowBottom: {
        flexDirection: 'row',
        gap: T.spacing[3],
        marginBottom: T.spacing[6],
    },
    quickActionWrap: {
        flex: 1,
    },
    quickAction: {
        borderRadius: T.radius.lg,
        padding: T.spacing[4],
        alignItems: 'center',
        gap: T.spacing[2],
        minHeight: 44,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Highlight Card
    highlightOuter: {
        marginRight: T.spacing[3],
    },
    highlightCard: {
        width: 140,
        borderRadius: T.radius.lg,
        padding: T.spacing[3],
        gap: T.spacing[2],
    },
    highlightThumb: {
        width: '100%',
        height: 80,
        borderRadius: T.radius.md,
        backgroundColor: T.color.bg.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    highlightLabel: {
        marginTop: 2,
    },
    highlightList: {
        paddingRight: T.spacing[5],
    },

    // Empty states
    emptyCard: {
        borderRadius: T.radius.lg,
        padding: T.spacing[8],
        alignItems: 'center',
        gap: T.spacing[4],
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: T.color.brand.muted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 32,
    },
    emptyHighlights: {
        borderRadius: T.radius.lg,
        padding: T.spacing[8],
        alignItems: 'center',
        gap: T.spacing[3],
    },
    emptyHighlightsCTA: {
        backgroundColor: T.color.brand.muted,
        borderRadius: T.radius.md,
        paddingHorizontal: T.spacing[5],
        paddingVertical: T.spacing[3],
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}15`,
    },
    skeletonHighlightRow: {
        flexDirection: 'row',
        gap: T.spacing[2],
    },
    // Data Lab banner
    dataLabBanner: {
        borderRadius: T.radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: `${T.color.semantic.purple}15`,
    },
    dataLabBannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dataLabIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dataLabTextCol: {
        flex: 1,
    },
    dataLabTitle: {
        color: T.color.semantic.purple,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    dataLabHeadline: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
        lineHeight: 17,
        marginTop: 2,
    },
    dataLabEmoji: {
        fontSize: 16,
    },
})

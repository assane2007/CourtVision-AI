/**
 * CourtVision AI — Dashboard V4 REDESIGN
 * "Court Night" — Apple × HomeCourt × NBA App
 * 
 * SECTIONS:
 *   1. Hero Header (greeting + avatar XP ring)
 *   2. Hero Stat Card (dominant FG% with progress bar)
 *   3. Mini Stat Cards (3-col: FG%, XP, 3PT%)
 *   4. Daily Challenge (amber-tinted card)
 *   5. Weekly Dots (7 day markers)
 *   6. Recent Highlights (horizontal scroll)
 *   7. Quick Actions (Live / Program / Twin)
 */

import {
    View, Text, ScrollView, FlatList, TouchableOpacity,
    RefreshControl, Dimensions, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useCallback, useState, memo } from 'react'
import Animated, {
    FadeInDown, FadeInRight,
    useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from 'react-native-reanimated'
import { useStore, selectWeekly, selectHighlights, selectStreak, selectXP, xpToLevel, xpToNextLevel } from '../../lib/store'
import { SkeletonHighlight, SkeletonStatCard, SkeletonWeeklyChart } from '../../components/SkeletonLoader'
import { XPLevelBar } from '../../components/XPBadge'
import { DailyChallengeCard } from '../../components/DailyChallengeCard'
import { StreakReminderBanner } from '../../components/StreakReminderBanner'
import { ScoreRing } from '../../components/ScoreRing'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StatCard } from '../../components/StatCardV4'
import { WeeklyDots } from '../../components/WeeklyDots'
import { PerformanceBadge } from '../../components/PerformanceBadge'
import { T, typePresets } from '../../lib/theme'
import type { HighlightClip } from '../../lib/store'

const { width: SCREEN_W } = Dimensions.get('window')
const type = typePresets
const spring = (T as any).spring

// ─── Greeting ───────────────────────────────────────────────

function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
}

// ─── Avatar with XP Ring ────────────────────────────────────

function AvatarXPRing({ name, xp }: { name: string; xp: number }) {
    const level = xpToLevel(xp)
    const { pct } = xpToNextLevel(xp)
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    return (
        <View style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
                position: 'absolute', width: 56, height: 56,
                borderRadius: 28, borderWidth: 2.5,
                borderColor: `${T.color.signature.primary}30`,
            }} />
            <View style={{
                position: 'absolute', width: 56, height: 56,
                borderRadius: 28, borderWidth: 2.5,
                borderColor: T.color.signature.primary,
                borderTopColor: pct > 25 ? T.color.signature.primary : 'transparent',
                borderRightColor: pct > 50 ? T.color.signature.primary : 'transparent',
                borderBottomColor: pct > 75 ? T.color.signature.primary : 'transparent',
                borderLeftColor: 'transparent',
                transform: [{ rotate: '-90deg' }],
            }} />
            <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: T.color.background.tertiary,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Text style={{ color: T.color.text.primary, fontSize: 16, fontFamily: T.fonts.display.bold }}>{initials}</Text>
            </View>
            <View style={{
                position: 'absolute', bottom: -4, right: -4,
                backgroundColor: T.color.signature.primary, borderRadius: 8,
                width: 20, height: 20,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.color.background.primary,
            }}>
                <Text style={{ color: '#fff', fontSize: 9, fontFamily: T.fonts.display.black }}>{level}</Text>
            </View>
        </View>
    )
}

// ─── Hero Stat Card ─────────────────────────────────────────

function HeroStatCard({ value, label, delta }: {
    value: number; label: string; delta?: string
}) {
    const animValue = useSharedValue(0)

    useEffect(() => {
        animValue.value = withTiming(value, { duration: 800, easing: Easing.out(Easing.cubic) })
    }, [value])

    const progressWidth = useAnimatedStyle(() => ({
        width: `${animValue.value}%`,
    }))

    return (
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <View style={{
                ...(T as any).glass?.regular ?? T.glass.light,
                borderRadius: T.borderRadius.lg,
                padding: T.spacing[6],
            }}>
                <Text style={{
                    ...type.overline,
                    color: T.color.text.secondary,
                    marginBottom: T.spacing[2],
                }}>
                    {label}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{
                        ...type.heroStat,
                        color: T.color.signature.primary,
                    }}>
                        {Math.round(value)}
                    </Text>
                    <Text style={{
                        ...type.mediumStat,
                        color: T.color.text.tertiary,
                        marginLeft: 4,
                    }}>
                        %
                    </Text>
                </View>

                {delta && (
                    <Text style={{
                        fontSize: 14,
                        fontFamily: T.fonts.body.semibold,
                        color: delta.includes('+') || delta.includes('▲') ? T.color.semantic.success : T.color.semantic.error,
                        marginTop: T.spacing[1],
                    }}>
                        {delta}
                    </Text>
                )}

                <View style={{
                    height: 6, borderRadius: 3, overflow: 'hidden',
                    backgroundColor: T.color.background.tertiary,
                    marginTop: T.spacing[4],
                }}>
                    <Animated.View style={[progressWidth, {
                        height: 6, borderRadius: 3,
                        backgroundColor: T.color.signature.primary,
                    }]} />
                </View>
            </View>
        </Animated.View>
    )
}

// ─── Highlight Card ─────────────────────────────────────────

const HighlightCard = memo(function HighlightCard({ clip, onPress }: { clip: HighlightClip; onPress: () => void }) {
    const scale = useSharedValue(1)
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

    return (
        <Animated.View style={animStyle}>
            <TouchableOpacity
                style={{
                    width: 140, height: 96,
                    borderRadius: T.borderRadius.md,
                    marginRight: T.spacing[3],
                    overflow: 'hidden',
                    ...(T as any).glass?.regular ?? T.glass.light,
                }}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, spring?.snappy) }}
                onPressOut={() => { scale.value = withSpring(1, spring?.snappy) }}
                activeOpacity={1}
                accessibilityLabel={`View highlight ${clip.label}`}
                accessibilityRole="button"
            >
                <View style={{
                    flex: 1, backgroundColor: T.color.signature.dim,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Feather name="play" size={18} color={T.color.signature.primary} />
                </View>
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: T.spacing[2],
                    paddingVertical: T.spacing[1],
                }}>
                    <Text style={{ color: T.color.text.primary, fontSize: 11, fontFamily: T.fonts.body.semibold }} numberOfLines={1}>
                        {clip.label}
                    </Text>
                    <Text style={{ color: T.color.semantic.success, fontSize: 10, fontFamily: T.fonts.display.bold }}>
                        {clip.pts}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
})

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
    return (
        <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: T.spacing[3], marginTop: T.spacing[1],
        }}>
            <Text style={{ ...type.sectionTitle, color: T.color.text.primary }}>{title}</Text>
            {action && onAction && (
                <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: T.color.signature.primary, fontSize: 13, fontFamily: T.fonts.body.semibold }}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

// ─── Quick Action ───────────────────────────────────────────

function QuickAction({ icon, label, color, onPress }: {
    icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void
}) {
    const scale = useSharedValue(1)
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

    return (
        <Animated.View style={[{ flex: 1 }, animStyle]}>
            <TouchableOpacity
                style={{
                    ...(T as any).glass?.regular ?? T.glass.light,
                    borderRadius: T.borderRadius.lg,
                    padding: T.spacing[4], alignItems: 'center', gap: T.spacing[2],
                    minHeight: 44,
                }}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, spring?.snappy) }}
                onPressOut={() => { scale.value = withSpring(1, spring?.snappy) }}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: `${color}10`,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Feather name={icon} size={18} color={color} />
                </View>
                <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 10 }}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

// ─── Empty State ────────────────────────────────────────────

function EmptyTodayCard({ onUpload }: { onUpload: () => void }) {
    return (
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
            <View style={{
                ...T.glass.accent, borderRadius: T.borderRadius.lg,
                padding: T.spacing[8], alignItems: 'center', gap: T.spacing[4],
            }}>
                <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: T.color.signature.dim,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Text style={{ fontSize: 32 }}>🏀</Text>
                </View>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, textAlign: 'center' }}>
                    No session today — yet
                </Text>
                <Text style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center' }}>
                    {'Film your game and let AI break down\nevery shot, every detail.'}
                </Text>
                <PrimaryButton label="Start Today's Session" icon="video" onPress={onUpload} size="md" />
            </View>
        </Animated.View>
    )
}

// ═════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════

export default function DashboardIndex() {
    const router = useRouter()
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

    useEffect(() => { loadWeeklyData(); loadHighlights() }, [])

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

    const today = new Date().getDay()
    const weeklyDots = weeklyData.map((d: any, i: number) => ({
        day: d.day,
        hasSession: d.hasSession,
        isToday: i === (today === 0 ? 6 : today - 1),
        score: d.hasSession ? Math.max(d.mental || 0, d.shooting || 0) : undefined,
    }))

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <View style={{
                position: 'absolute', top: -120, left: '15%', width: 280, height: 280,
                borderRadius: 140, backgroundColor: 'rgba(255,107,0,0.025)',
            }} />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: T.spacing[4],
                    paddingTop: T.spacing[4],
                    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        tintColor={T.color.signature.primary} colors={[T.color.signature.primary]} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ═══ HERO HEADER ═══ */}
                <Animated.View entering={FadeInDown.duration(500)} style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: T.spacing[2],
                }}>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ ...type.caption, color: T.color.text.secondary }}>{greeting}</Text>
                        <Text style={{ ...type.screenTitle, color: T.color.text.primary }}>{firstName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[3] }}>
                        {streak > 0 && (
                            <Animated.View entering={FadeInRight.delay(200).duration(400)} style={{
                                ...(T as any).glass?.regular ?? T.glass.light,
                                borderRadius: T.borderRadius.md,
                                paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[2],
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}>
                                <Text style={{ fontSize: 16 }}>🔥</Text>
                                <Text style={{ color: T.color.signature.primary, fontFamily: T.fonts.display.black, fontSize: 16, fontVariant: ['tabular-nums'] }}>
                                    {streak}
                                </Text>
                            </Animated.View>
                        )}
                        <AvatarXPRing name={user?.full_name ?? 'Player'} xp={xp} />
                        <TouchableOpacity
                            onPress={() => router.push('/settings')}
                            style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: T.color.background.secondary,
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: 1, borderColor: T.color.border.default,
                            }}
                            accessibilityLabel="Settings"
                        >
                            <Feather name="settings" size={16} color={T.color.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ marginBottom: T.spacing[5] }}>
                    <XPLevelBar xp={xp} compact />
                </Animated.View>

                <StreakReminderBanner />

                {/* ═══ HERO STAT ═══ */}
                {userLoading ? (
                    <View style={{ flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[5] }}>
                        <SkeletonStatCard /><SkeletonStatCard />
                    </View>
                ) : hasSession ? (
                    <View style={{ marginBottom: T.spacing[5] }}>
                        <HeroStatCard
                            value={headlineStat}
                            label={shootingFgPct > 0 ? 'SHOOTING' : 'MENTAL'}
                            delta="▲ +4.2% vs last week"
                        />
                    </View>
                ) : (
                    <View style={{ marginBottom: T.spacing[5] }}>
                        <EmptyTodayCard onUpload={() => router.push('/(dashboard)/upload')} />
                    </View>
                )}

                {/* ═══ MINI CARDS ═══ */}
                {hasSession && (
                    <Animated.View entering={FadeInDown.delay(160).duration(400)} style={{
                        flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[5],
                    }}>
                        <View style={{ flex: 1 }}>
                            <StatCard label="FG%" value={shootingFgPct > 0 ? Math.round(shootingFgPct) : '--'} unit="%" variant="accent" size="small" index={0} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <StatCard label="XP" value={xp} variant="glass" size="small" index={1} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <StatCard label="3PT%" value={(user as any)?.shooting_3pt_pct ? Math.round((user as any).shooting_3pt_pct) : '--'} unit="%" variant="glass" size="small" index={2} />
                        </View>
                    </Animated.View>
                )}

                {/* ═══ DAILY CHALLENGE ═══ */}
                <View style={{ marginBottom: T.spacing[5] }}>
                    <SectionHeader title="Daily Challenge" />
                    <DailyChallengeCard />
                </View>

                {/* ═══ WEEKLY DOTS ═══ */}
                <View style={{ marginBottom: T.spacing[5] }}>
                    <SectionHeader title="Weekly Progress" />
                    {weeklyLoading && weeklyData.every((d: any) => !d.hasSession) ? (
                        <SkeletonWeeklyChart />
                    ) : (
                        <WeeklyDots data={weeklyDots} />
                    )}
                </View>

                {/* ═══ QUICK ACTIONS ═══ */}
                <Animated.View entering={FadeInDown.delay(240).duration(400)} style={{
                    flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[3],
                }}>
                    <QuickAction icon="zap" label="WORKOUT AI" color={T.color.signature.primary} onPress={() => router.push('/workout-setup')} />
                    <QuickAction icon="radio" label="LIVE COACH" color={T.color.semantic.error} onPress={() => router.push('/live')} />
                    <QuickAction icon="calendar" label="PROGRAM" color={T.color.semantic.success} onPress={() => router.push('/program')} />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(280).duration(400)} style={{
                    flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[6],
                }}>
                    <QuickAction icon="bar-chart-2" label="ANALYTICS" color="#8B5CF6" onPress={() => router.push('/analytics')} />
                    <QuickAction icon="award" label="CLASSEMENT" color="#FFD700" onPress={() => router.push('/leaderboard')} />
                    <QuickAction icon="clock" label="HISTORIQUE" color="#06B6D4" onPress={() => router.push('/history')} />
                </Animated.View>

                {/* ═══ HIGHLIGHTS ═══ */}
                <SectionHeader
                    title="Recent Highlights"
                    action={highlights.length > 0 ? 'See all' : undefined}
                    onAction={() => router.push('/(dashboard)/upload')}
                />

                {highlightsLoading && highlights.length === 0 ? (
                    <View style={{ flexDirection: 'row', gap: T.spacing[2] }}>
                        {[1, 2, 3].map(i => <SkeletonHighlight key={i} />)}
                    </View>
                ) : highlights.length === 0 ? (
                    <View style={{
                        ...(T as any).glass?.regular ?? T.glass.light,
                        borderRadius: T.borderRadius.lg, padding: T.spacing[8],
                        alignItems: 'center', gap: T.spacing[3],
                    }}>
                        <Feather name="film" size={22} color={T.color.text.tertiary} />
                        <Text style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center' }}>
                            {'No highlights yet.\nAnalyze a game to generate AI clips.'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(dashboard)/upload')}
                            style={{
                                backgroundColor: T.color.signature.dim, borderRadius: T.borderRadius.md,
                                paddingHorizontal: T.spacing[5], paddingVertical: T.spacing[3],
                                borderWidth: 1, borderColor: `${T.color.signature.primary}30`,
                            }}
                        >
                            <Text style={{ color: T.color.signature.primary, fontFamily: T.fonts.body.bold, fontSize: 13 }}>Upload a video</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        horizontal data={highlights}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: T.spacing[5] }}
                        renderItem={({ item }) => (
                            <HighlightCard clip={item} onPress={() => router.push(`/highlight/${item.id}`)} />
                        )}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

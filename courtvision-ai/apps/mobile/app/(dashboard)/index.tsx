/**
 * CourtVision AI  Dashboard V3
 * 
 * "Court" tab  the WOW screen.
 *
 * SECTIONS :
 *   1. Hero (greeting + streak + avatar with XP ring)
 *   2. Today's Stats (headline stat or elegant empty state)
 *   3. Daily Challenge (timer + progress + CTA)
 *   4. Weekly Progress (7 dots with session markers)
 *   5. Quick Highlights feed (horizontal scroll)
 * 
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
} from 'react-native-reanimated'
import { useStore, selectWeekly, selectHighlights, selectStreak, selectXP, xpToLevel, xpToNextLevel } from '../../lib/store'
import { SkeletonHighlight, SkeletonStatCard, SkeletonWeeklyChart } from '../../components/SkeletonLoader'
import { XPLevelBar } from '../../components/XPBadge'
import { DailyChallengeCard } from '../../components/DailyChallengeCard'
import { StreakReminderBanner } from '../../components/StreakReminderBanner'
import { ScoreRing } from '../../components/ScoreRing'
import { PrimaryButton } from '../../components/PrimaryButton'
import { T } from '../../lib/theme'
import type { HighlightClip } from '../../lib/store'

const { width: SCREEN_W } = Dimensions.get('window')

//  Greeting logic 

function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
}

function getStreakMessage(streak: number): string {
    if (streak === 0) return 'Ready to start your streak?'
    if (streak < 7) return `Day ${streak}  Keep the momentum`
    const weeks = Math.floor(streak / 7)
    return `Week ${weeks} streak  You're locked in`
}

//  Glass Card 

function GlassCard({ children, style, accent = false }: any) {
    return (
        <View style={[{
            borderRadius: T.radius.lg,
            padding: 16,
            ...(accent ? T.glass.accent : T.glass.light),
        }, style]}>
            {children}
        </View>
    )
}

//  Avatar with XP Ring 

function AvatarXPRing({ name, xp }: { name: string; xp: number }) {
    const level = xpToLevel(xp)
    const { pct } = xpToNextLevel(xp)
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    return (
        <View style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center' }}>
            {/* Outer ring bg */}
            <View style={{
                position: 'absolute', width: 56, height: 56,
                borderRadius: 28, borderWidth: 2.5,
                borderColor: `${T.colors.accent}30`,
            }} />
            {/* Progress ring */}
            <View style={{
                position: 'absolute', width: 56, height: 56,
                borderRadius: 28, borderWidth: 2.5,
                borderColor: T.colors.accent,
                borderTopColor: pct > 25 ? T.colors.accent : 'transparent',
                borderRightColor: pct > 50 ? T.colors.accent : 'transparent',
                borderBottomColor: pct > 75 ? T.colors.accent : 'transparent',
                borderLeftColor: 'transparent',
                transform: [{ rotate: '-90deg' }],
            }} />
            {/* Avatar center */}
            <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: T.color.background.tertiary,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Text style={{ color: T.colors.white, fontSize: 16, fontWeight: '800', fontFamily: T.fonts.display.bold }}>{initials}</Text>
            </View>
            {/* Level badge */}
            <View style={{
                position: 'absolute', bottom: -4, right: -4,
                backgroundColor: T.colors.accent, borderRadius: 8,
                width: 20, height: 20,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.color.background.primary,
            }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', fontFamily: T.fonts.display.black }}>{level}</Text>
            </View>
        </View>
    )
}

//  Streak Badge (compact) 

function StreakBadge({ streak }: { streak: number }) {
    if (streak === 0) return null

    const borderCol = streak >= 7 ? `${T.colors.accent}50` : T.glass.light.borderColor

    return (
        <Animated.View
            entering={FadeInRight.delay(200).duration(400)}
            style={{
                ...T.glass.light, borderRadius: T.radius.md,
                paddingHorizontal: 12, paddingVertical: 8,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                borderColor: borderCol, borderWidth: 1,
            }}
        >
            <Text style={{ fontSize: 16 }}></Text>
            <Text style={{ color: T.colors.accent, fontWeight: '900', fontFamily: T.fonts.display.black, fontSize: 16, fontVariant: ['tabular-nums'] }}>
                {streak}
            </Text>
        </Animated.View>
    )
}

//  Weekly dots 

function WeeklyProgress({ data }: { data: Array<{ day: string; mental: number; shooting: number; hasSession: boolean }> }) {
    const today = new Date().getDay() // 0=Sun, 1=Mon...

    return (
        <GlassCard style={{ paddingVertical: 20, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '700', fontFamily: T.fonts.display.bold }}>This Week</Text>
                <Text style={{ color: T.colors.muted, fontSize: 11, fontWeight: '500', fontFamily: T.fonts.body.medium }}>
                    {data.filter(d => d.hasSession).length}/7 sessions
                </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 70 }}>
                {data.map((d, i) => {
                    const isToday = i === (today === 0 ? 6 : today - 1)
                    const barH = d.hasSession ? Math.max(d.mental, d.shooting, 20) : 8

                    return (
                        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                            <Animated.View
                                entering={FadeInDown.delay(i * 60).duration(300)}
                                style={{
                                    width: d.hasSession ? 6 : 4,
                                    height: (barH / 100) * 55 + 4,
                                    borderRadius: 4,
                                    backgroundColor: d.hasSession
                                        ? T.colors.accent
                                        : `${T.colors.dim}40`,
                                }}
                            />
                            <Text style={{
                                fontSize: 10, fontWeight: isToday ? '800' : '500',
                                color: isToday ? T.colors.accent : d.hasSession ? T.colors.textSecondary : T.colors.dim,
                            }}>
                                {d.day}
                            </Text>
                            {isToday && (
                                <View style={{
                                    width: 4, height: 4, borderRadius: 2,
                                    backgroundColor: T.colors.accent,
                                    marginTop: -2,
                                }} />
                            )}
                        </View>
                    )
                })}
            </View>
        </GlassCard>
    )
}

//  Today's Stats (session today or empty state) 

function TodayStats({ user, onUpload, onViewDetails }: {
    user: any; onUpload: () => void; onViewDetails: () => void
}) {
    const hasSession = !!user?.shooting_fg_pct || !!user?.mental_score

    if (!hasSession) {
        return (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                <GlassCard accent style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 16 }}>
                    <View style={{
                        width: 72, height: 72, borderRadius: 36,
                        backgroundColor: T.color.signature.dim,
                        justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Text style={{ fontSize: 32 }}></Text>
                    </View>

                    <View style={{ alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: T.colors.white, fontSize: 18, fontWeight: '800', fontFamily: T.fonts.display.black }}>
                            No session today  yet
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 13, fontFamily: T.fonts.body.regular, textAlign: 'center', lineHeight: 20 }}>
                            {'Film your game and let AI break down\nevery shot, every detail.'}
                        </Text>
                    </View>

                    <PrimaryButton
                        label="Start Today's Session"
                        icon="video"
                        onPress={onUpload}
                        size="md"
                    />
                </GlassCard>
            </Animated.View>
        )
    }

    const mentalScore = user?.mental_score ?? 0
    const shootingFgPct = user?.shooting_fg_pct ?? 0
    const headlineStat = shootingFgPct > 0 ? shootingFgPct : mentalScore
    const headlineLabel = shootingFgPct > 0 ? 'FG%' : 'Mental'

    return (
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <GlassCard accent style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <ScoreRing value={headlineStat} size={90} strokeWidth={7} label={headlineLabel} />

                    <View style={{ flex: 1, gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {shootingFgPct > 0 && (
                                <View style={{ flex: 1, ...T.glass.light, borderRadius: T.radius.sm, padding: 10 }}>
                                    <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Shooting</Text>
                                    <Text style={{ color: T.colors.accent, fontSize: 18, fontWeight: '900', fontFamily: T.fonts.display.black }}>
                                        {Math.round(shootingFgPct)}%
                                    </Text>
                                </View>
                            )}
                            {mentalScore > 0 && (
                                <View style={{ flex: 1, ...T.glass.light, borderRadius: T.radius.sm, padding: 10 }}>
                                    <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Mental</Text>
                                    <Text style={{ color: T.colors.green, fontSize: 18, fontWeight: '900', fontFamily: T.fonts.display.black }}>
                                        {Math.round(mentalScore)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={onViewDetails}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                            <Text style={{ color: T.colors.accent, fontSize: 12, fontWeight: '700', fontFamily: T.fonts.body.bold }}>View Details</Text>
                            <Feather name="arrow-right" size={12} color={T.colors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>
            </GlassCard>
        </Animated.View>
    )
}

//  Highlight Card (horizontal scroll) 

const HighlightCard = memo(function HighlightCard({ clip, onPress }: { clip: HighlightClip; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={{
                width: 140, height: 190,
                borderRadius: T.radius.lg,
                marginRight: 10,
                overflow: 'hidden',
                ...T.glass.light,
                justifyContent: 'space-between',
                padding: 14,
            }}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityLabel={`View highlight ${clip.label}`}
            accessibilityRole="button"
        >
            <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 110,
                backgroundColor: T.color.signature.dim,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: `${T.colors.accent}20`,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Feather name="play" size={18} color={T.colors.accent} />
                </View>
            </View>

            <View style={{
                alignSelf: 'flex-end',
                ...T.glass.accent,
                borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
            }}>
                <Text style={{ color: T.colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, fontFamily: T.fonts.display.bold }}>AI</Text>
            </View>

            <View>
                <Text style={{ color: T.colors.white, fontSize: 13, fontWeight: '700', fontFamily: T.fonts.display.bold }} numberOfLines={1}>{clip.label}</Text>
                <Text style={{ color: T.colors.green, fontSize: 12, fontWeight: '700', marginTop: 2, fontFamily: T.fonts.display.bold }}>{clip.pts}</Text>
                <Text style={{ color: T.colors.dim, fontSize: 10, marginTop: 2 }}>{clip.daysAgo}d ago</Text>
            </View>
        </TouchableOpacity>
    )
})

//  Section Header 

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
    return (
        <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, marginTop: 4,
        }}>
            <Text style={{ color: T.colors.white, fontSize: 17, fontWeight: '800', fontFamily: T.fonts.display.black, letterSpacing: -0.3 }}>{title}</Text>
            {action && onAction && (
                <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: T.colors.accent, fontSize: 12, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

//  Quick Action row 

function QuickAction({ icon, label, color, onPress }: {
    icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void
}) {
    return (
        <TouchableOpacity
            style={{
                flex: 1, ...T.glass.light, borderRadius: T.radius.md,
                padding: 14, alignItems: 'center', gap: 8,
                borderColor: `${color}18`, borderWidth: 1,
            }}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: `${color}10`,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Feather name={icon} size={18} color={color} />
            </View>
            <Text style={{ color: T.colors.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>{label}</Text>
        </TouchableOpacity>
    )
}

// 
// MAIN DASHBOARD
// 

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

    useEffect(() => {
        loadWeeklyData()
        loadHighlights()
    }, [])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await Promise.all([refreshProfile(), loadWeeklyData(), loadHighlights()])
        setRefreshing(false)
    }, [refreshProfile, loadWeeklyData, loadHighlights])

    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Player'
    const greeting = getGreeting()
    const streakMsg = getStreakMessage(streak)

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Ambient glow */}
            <View style={{
                position: 'absolute', top: -120, left: '15%', width: 280, height: 280,
                borderRadius: 140, backgroundColor: 'rgba(255,107,0,0.025)',
            }} />
            <View style={{
                position: 'absolute', top: -60, right: '-12%', width: 200, height: 200,
                borderRadius: 100, backgroundColor: 'rgba(10,132,255,0.02)',
            }} />

            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={T.colors.accent}
                        colors={[T.colors.accent]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >

                {/* 
                    SECTION 1  HERO HEADER
                     */}

                <Animated.View
                    entering={FadeInDown.duration(500)}
                    style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'flex-start', marginBottom: 6,
                    }}
                >
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: T.colors.muted, fontSize: 13, fontWeight: '500', fontFamily: T.fonts.body.medium }}>
                            {greeting}
                        </Text>
                        <Text style={{
                            color: T.colors.white, fontSize: 28, fontWeight: '900',
                            fontFamily: T.fonts.display.black, letterSpacing: -0.5,
                        }}>
                            {firstName}
                        </Text>
                        <Text style={{ color: T.colors.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: T.fonts.body.medium, marginTop: 2 }}>
                            {streakMsg}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <StreakBadge streak={streak} />
                        <AvatarXPRing name={user?.full_name ?? 'Player'} xp={xp} />
                    </View>
                </Animated.View>

                {/* XP Level Bar */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginBottom: 20 }}>
                    <XPLevelBar xp={xp} compact />
                </Animated.View>

                {/* Streak Reminder */}
                <StreakReminderBanner />

                {/* 
                    SECTION 2  TODAY'S STATS
                     */}

                <SectionHeader title="Today" />

                {userLoading ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                    </View>
                ) : (
                    <View style={{ marginBottom: 20 }}>
                        <TodayStats
                            user={user}
                            onUpload={() => router.push('/(dashboard)/upload')}
                            onViewDetails={() => router.push('/analysis/123')}
                        />
                    </View>
                )}

                {/* 
                    SECTION 3  DAILY CHALLENGE
                     */}

                <DailyChallengeCard />

                {/* 
                    SECTION 4  WEEKLY PROGRESS
                     */}

                <SectionHeader title="Weekly Progress" />

                {weeklyLoading && weeklyData.every(d => !d.hasSession) ? (
                    <View style={{ marginBottom: 20 }}><SkeletonWeeklyChart /></View>
                ) : (
                    <View style={{ marginBottom: 20 }}>
                        <WeeklyProgress data={weeklyData} />
                    </View>
                )}

                {/* Quick Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    <QuickAction
                        icon="radio"
                        label="Live Coach"
                        color={T.colors.red}
                        onPress={() => router.push('/live')}
                    />
                    <QuickAction
                        icon="calendar"
                        label="Program"
                        color={T.colors.green}
                        onPress={() => router.push('/program')}
                    />
                    <QuickAction
                        icon="cpu"
                        label="Digital Twin"
                        color={T.colors.accent}
                        onPress={() => router.push('/(dashboard)/twin')}
                    />
                </View>

                {/* 
                    SECTION 5  HIGHLIGHTS FEED
                     */}

                <SectionHeader
                    title="Recent Highlights"
                    action={highlights.length > 0 ? 'See all' : undefined}
                    onAction={() => router.push('/(dashboard)/upload')}
                />

                {highlightsLoading && highlights.length === 0 ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[1, 2, 3].map(i => <SkeletonHighlight key={i} />)}
                    </View>
                ) : highlights.length === 0 ? (
                    <GlassCard style={{ padding: 28, alignItems: 'center', gap: 12 }}>
                        <View style={{
                            width: 56, height: 56, borderRadius: 28,
                            backgroundColor: T.color.signature.dim,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Feather name="film" size={22} color={T.colors.dim} />
                        </View>
                        <Text style={{ color: T.colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                            {'No highlights yet.\nAnalyze a game to generate AI clips.'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(dashboard)/upload')}
                            style={{
                                backgroundColor: T.color.signature.dim,
                                borderRadius: T.radius.md, paddingHorizontal: 20, paddingVertical: 10,
                                borderWidth: 1, borderColor: `${T.colors.accent}30`,
                            }}
                        >
                            <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: 13, fontFamily: T.fonts.body.bold }}>Upload a video</Text>
                        </TouchableOpacity>
                    </GlassCard>
                ) : (
                    <FlatList
                        horizontal
                        data={highlights}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 20 }}
                        renderItem={({ item }) => (
                            <HighlightCard clip={item} onPress={() => router.push(`/highlight/${item.id}`)} />
                        )}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

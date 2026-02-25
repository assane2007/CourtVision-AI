import {
    View, Text, ScrollView, FlatList, TouchableOpacity,
    Animated, RefreshControl, Dimensions, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useCallback, useState, memo } from 'react'
import { useStore, selectWeekly, selectHighlights, selectStreak, selectXP } from '../../lib/store'
import { SkeletonHighlight, SkeletonStatCard, SkeletonWeeklyChart } from '../../components/SkeletonLoader'
import { XPLevelBar } from '../../components/XPBadge'
import { DailyChallengeCard } from '../../components/DailyChallengeCard'
import { StreakReminderBanner } from '../../components/StreakReminderBanner'
import { T } from '../../lib/theme'
import type { HighlightClip } from '../../lib/store'

const { width: SCREEN_W } = Dimensions.get('window')

// ── Glass Card wrapper ───────────────────────────────────────
function GlassCard({ children, style, accent = false }: any) {
    return (
        <View style={[
            {
                borderRadius: T.radius.lg,
                padding: 16,
                ...(accent ? T.glass.accent : T.glass.light),
            },
            style,
        ]}>
            {children}
        </View>
    )
}

// ── Animated weekly bar ──────────────────────────────────────
function WeekBar({ value, color, delay }: { value: number; color: string; delay: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, {
            toValue: value / 100,
            duration: 700,
            delay,
            useNativeDriver: false,
        }).start()
    }, [value])
    return (
        <View style={{ flex: 1, height: 60, justifyContent: 'flex-end' }}>
            <Animated.View style={{
                borderRadius: 6,
                backgroundColor: color,
                height: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }} />
        </View>
    )
}

// ── Highlight card (premium) ─────────────────────────────────
const HighlightCard = memo(function HighlightCard({ clip, onPress }: { clip: HighlightClip; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={{
                width: 140, height: 200,
                borderRadius: T.radius.lg,
                marginHorizontal: 5,
                overflow: 'hidden',
                ...T.glass.light,
                justifyContent: 'space-between',
                padding: 14,
            }}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityLabel={`Voir le highlight ${clip.label}`}
            accessibilityRole="button"
        >
            {/* Thumbnail gradient bg */}
            <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 120,
                backgroundColor: 'rgba(0,229,255,0.04)',
                justifyContent: 'center', alignItems: 'center',
            }}>
                <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: 'rgba(0,229,255,0.12)',
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Ionicons name="play" size={20} color={T.colors.accent} />
                </View>
            </View>

            {/* AI badge */}
            <View style={{
                alignSelf: 'flex-end',
                ...T.glass.accent,
                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
            }}>
                <Text style={{ color: T.colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>AI</Text>
            </View>

            <View>
                <Text style={{ color: T.colors.white, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{clip.label}</Text>
                <Text style={{ color: T.colors.green, fontSize: 12, fontWeight: '700', marginTop: 3 }}>{clip.pts}</Text>
                <Text style={{ color: T.colors.dim, fontSize: 10, marginTop: 2 }}>Il y a {clip.daysAgo}j</Text>
            </View>
        </TouchableOpacity>
    )
})

// ── Animated Streak badge ─────────────────────────────────────
function StreakBadge({ streak }: { streak: number }) {
    const pulseAnim = useRef(new Animated.Value(1)).current
    useEffect(() => {
        if (streak >= 3) {
            Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])).start()
        }
    }, [streak])

    return (
        <Animated.View style={{
            ...T.glass.light,
            borderRadius: T.radius.md,
            paddingHorizontal: 14, paddingVertical: 10,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            borderColor: streak >= 7 ? 'rgba(255,145,0,0.4)' : T.glass.light.borderColor,
            transform: [{ scale: streak >= 3 ? pulseAnim : 1 as any }],
            ...streak >= 7 ? T.glow(T.colors.orange, 0.2) : {},
        }}>
            <Text style={{ fontSize: 18 }}>🔥</Text>
            <View>
                <Text style={{ color: T.colors.orange, fontWeight: '900', fontSize: 16 }}>{streak}</Text>
                <Text style={{ color: T.colors.muted, fontSize: 9, fontWeight: '600' }}>jours</Text>
            </View>
        </Animated.View>
    )
}

// ── Score Ring (mini) ─────────────────────────────────────────
function ScoreRing({ value, label, color, icon }: { value: string | number; label: string; color: string; icon?: string }) {
    const enterAnim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8, delay: 100 }).start()
    }, [])
    return (
        <Animated.View style={{
            flex: 1,
            ...T.glass.light,
            borderRadius: T.radius.lg,
            padding: 16,
            alignItems: 'center',
            borderColor: `${color}20`,
            opacity: enterAnim,
            transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }}>
            <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: `${color}12`,
                borderWidth: 2.5, borderColor: `${color}40`,
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 10,
                ...T.glow(color, 0.15),
            }}>
                <Text style={{ color, fontSize: 18, fontWeight: '900' }}>{value}</Text>
            </View>
            <Text style={{ color: T.colors.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Text>
        </Animated.View>
    )
}

// ── Quick Action Button ───────────────────────────────────────
function QuickAction({ icon, iconLib: IconLib, label, sub, color, borderColor, onPress }: any) {
    const scaleAnim = useRef(new Animated.Value(1)).current
    return (
        <TouchableOpacity
            style={{
                flex: 1,
                ...T.glass.light,
                borderRadius: T.radius.lg,
                padding: 18,
                alignItems: 'center',
                borderColor: borderColor || T.glass.light.borderColor,
                borderWidth: 1,
            }}
            onPress={onPress}
            activeOpacity={0.75}
            onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: `${color}12`,
                    justifyContent: 'center', alignItems: 'center',
                    marginBottom: 10,
                    ...T.glow(color, 0.15),
                }}>
                    <IconLib name={icon} size={22} color={color} />
                </View>
                <Text style={{ color: T.colors.white, fontSize: 12, fontWeight: '700' }}>{label}</Text>
                <Text style={{ color: T.colors.muted, fontSize: 10, marginTop: 2 }}>{sub}</Text>
            </Animated.View>
        </TouchableOpacity>
    )
}

// ── Section Header ────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 }}>
            <Text style={{ color: T.colors.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Text>
            {action && onAction && (
                <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: T.colors.primary, fontSize: 12, fontWeight: '700' }}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════

export default function DashboardIndex() {
    const router = useRouter()
    const [refreshing, setRefreshing] = useState(false)

    const weeklyData        = useStore(selectWeekly)
    const highlights        = useStore(selectHighlights)
    const streak            = useStore(selectStreak)
    const xp                = useStore(selectXP)
    const user              = useStore(s => s.user)
    const weeklyLoading     = useStore(s => s.weeklyLoading)
    const highlightsLoading = useStore(s => s.highlightsLoading)
    const userLoading       = useStore(s => s.userLoading)
    const loadWeeklyData    = useStore(s => s.loadWeeklyData)
    const loadHighlights    = useStore(s => s.loadHighlights)
    const refreshProfile    = useStore(s => s.refreshProfile)

    const today    = new Date()
    const hour     = today.getHours()
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonne séance' : 'Bonsoir'

    const fadeIn = useRef(new Animated.Value(0)).current
    useEffect(() => {
        loadWeeklyData()
        loadHighlights()
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    }, [])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await Promise.all([refreshProfile(), loadWeeklyData(), loadHighlights()])
        setRefreshing(false)
    }, [refreshProfile, loadWeeklyData, loadHighlights])

    const mentalScore   = user?.mental_score    ?? 85
    const shootingGrade = user?.shooting_grade  ?? 'B-'
    const shootingFgPct = user?.shooting_fg_pct ?? 63.6

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Ambient glow at top */}
            <View style={{
                position: 'absolute', top: -100, left: '20%', width: 250, height: 250,
                borderRadius: 125, backgroundColor: 'rgba(0,229,255,0.03)',
            }} />
            <View style={{
                position: 'absolute', top: -50, right: '-10%', width: 200, height: 200,
                borderRadius: 100, backgroundColor: 'rgba(0,122,255,0.03)',
            }} />

            <Animated.ScrollView
                style={{ opacity: fadeIn }}
                contentContainerStyle={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 110 : 90 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.colors.accent} colors={[T.colors.accent]} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <View>
                        <Text style={{ color: T.colors.muted, fontSize: 13, fontWeight: '500' }}>{greeting} 👋</Text>
                        <Text style={{ color: T.colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 }}>
                            {user?.full_name ? user.full_name.split(' ')[0] : 'Dashboard'}
                        </Text>
                    </View>
                    <StreakBadge streak={streak} />
                </View>

                {/* ── Streak reminder ── */}
                <StreakReminderBanner />

                {/* ── XP Level Bar ── */}
                <View style={{ marginBottom: 18 }}>
                    <XPLevelBar xp={xp} compact />
                </View>

                {/* ── Daily Challenge ── */}
                <DailyChallengeCard />

                {/* ── Hero CTA — Analyze a game ── */}
                <TouchableOpacity
                    style={{
                        borderRadius: T.radius.xl,
                        padding: 28,
                        alignItems: 'center',
                        marginBottom: 14,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 14,
                        backgroundColor: T.colors.primary,
                        ...T.glow(T.colors.primary, 0.35),
                    }}
                    onPress={() => router.push('/(dashboard)/upload')}
                    activeOpacity={0.85}
                    accessibilityLabel="Analyser un match — importer une vidéo"
                    accessibilityRole="button"
                >
                    <View style={{
                        width: 52, height: 52, borderRadius: 26,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Ionicons name="scan" size={28} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '900', letterSpacing: -0.3 }}>Analyser un match</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 }}>
                            Importer une vidéo ou filmer
                        </Text>
                    </View>
                    <Feather name="arrow-right" size={22} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                {/* ── Quick Actions ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    <QuickAction
                        icon="radar" iconLib={MaterialCommunityIcons}
                        label="Coach Live" sub="Temps réel"
                        color={T.colors.red} borderColor="rgba(255,59,92,0.2)"
                        onPress={() => router.push('/live')}
                    />
                    <QuickAction
                        icon="fitness" iconLib={Ionicons}
                        label="Programme" sub="7 jours"
                        color={T.colors.green} borderColor="rgba(0,230,118,0.2)"
                        onPress={() => router.push('/program')}
                    />
                    <QuickAction
                        icon="body" iconLib={Ionicons}
                        label="Twin" sub="Digital"
                        color={T.colors.accent} borderColor="rgba(0,229,255,0.15)"
                        onPress={() => router.push('/(dashboard)/twin')}
                    />
                </View>

                {/* ── Weekly Progress ── */}
                <SectionHeader title="Progression Hebdo" />

                {weeklyLoading && weeklyData.every(d => !d.hasSession) ? (
                    <View style={{ marginBottom: 24 }}><SkeletonWeeklyChart /></View>
                ) : (
                    <GlassCard style={{ marginBottom: 24 }}>
                        {/* Legend */}
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.colors.accent }} />
                                <Text style={{ color: T.colors.muted, fontSize: 11 }}>Mental</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.colors.primary }} />
                                <Text style={{ color: T.colors.muted, fontSize: 11 }}>Tir</Text>
                            </View>
                        </View>

                        {/* Bars */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 }}>
                            {weeklyData.map((d, i) => (
                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                    {d.hasSession ? (
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' }}>
                                            <WeekBar value={d.mental} color={T.colors.accent} delay={i * 60} />
                                            <WeekBar value={d.shooting} color={T.colors.primary} delay={i * 60 + 80} />
                                        </View>
                                    ) : (
                                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                                            <View style={{ height: 4, backgroundColor: T.colors.dimmer, borderRadius: 2 }} />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Day labels */}
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                            {weeklyData.map((d, i) => (
                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ color: d.hasSession ? T.colors.muted : T.colors.dimmer, fontSize: 10, fontWeight: '600' }}>
                                        {d.day}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </GlassCard>
                )}

                {/* ── Quick Stats ── */}
                {userLoading ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                        <ScoreRing
                            value={mentalScore}
                            label="Mental Score"
                            color={T.colors.green}
                        />
                        <ScoreRing
                            value={shootingGrade}
                            label="Shooting Form"
                            color={T.colors.orange}
                        />
                    </View>
                )}

                {/* ── Highlights ── */}
                <SectionHeader
                    title="Derniers Highlights"
                    action={highlights.length > 0 ? 'Voir tout →' : undefined}
                    onAction={() => router.push('/(dashboard)/upload')}
                />

                {highlightsLoading && highlights.length === 0 ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[1, 2, 3].map(i => <SkeletonHighlight key={i} />)}
                    </View>
                ) : highlights.length === 0 ? (
                    <GlassCard style={{ padding: 32, alignItems: 'center' }}>
                        <View style={{
                            width: 64, height: 64, borderRadius: 32,
                            backgroundColor: 'rgba(0,229,255,0.06)',
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: 16,
                        }}>
                            <Ionicons name="film-outline" size={28} color={T.colors.dim} />
                        </View>
                        <Text style={{ color: T.colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                            Aucun highlight pour l'instant.{'\n'}Analyse un match pour commencer !
                        </Text>
                        <TouchableOpacity
                            style={{
                                marginTop: 18, backgroundColor: T.colors.primary,
                                borderRadius: T.radius.md, paddingHorizontal: 24, paddingVertical: 12,
                                ...T.glow(T.colors.primary, 0.2),
                            }}
                            onPress={() => router.push('/(dashboard)/upload')}
                            accessibilityRole="button"
                        >
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Importer une vidéo</Text>
                        </TouchableOpacity>
                    </GlassCard>
                ) : (
                    <FlatList
                        horizontal
                        data={highlights}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 2 }}
                        renderItem={({ item }) => (
                            <HighlightCard clip={item} onPress={() => router.push(`/highlight/${item.id}`)} />
                        )}
                    />
                )}
            </Animated.ScrollView>
        </SafeAreaView>
    )
}

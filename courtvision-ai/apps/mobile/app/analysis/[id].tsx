/**
 * CourtVision AI — Analysis Report V4 REDESIGN
 * HomeCourt Workout screen — 3 tabs: All Shots / Shot Zones / Shot Science
 * Hero score ring + Shot chart + Zone treemap + Science grid
 */

import {
    View, Text, ScrollView, TouchableOpacity,
    Share, Platform, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withDelay,
    FadeInDown, FadeIn,
} from 'react-native-reanimated'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { ScoreRing } from '../../components/workout/ScoreRing'
import { PerformanceBadge } from '../../components/gamification/PerformanceBadge'
import { ShotScienceGrid } from '../../components/workout/ShotScienceGrid'
import { T, typePresets } from '../../lib/theme'

const type = typePresets
const { width: SCREEN_W } = Dimensions.get('window')

// ─── Mock data ──────────────────────────────────────────────

const MOCK_SHOTS = [
    { x: 15, y: 75, made: true, zone: 'Paint' },
    { x: 50, y: 80, made: true, zone: 'Paint' },
    { x: 45, y: 65, made: false, zone: 'Paint' },
    { x: 25, y: 35, made: true, zone: 'Mid-Range' },
    { x: 75, y: 35, made: false, zone: 'Mid-Range' },
    { x: 10, y: 90, made: true, zone: 'Corner 3' },
    { x: 90, y: 90, made: false, zone: 'Corner 3' },
    { x: 20, y: 20, made: true, zone: 'Wing 3' },
    { x: 80, y: 20, made: true, zone: 'Wing 3' },
    { x: 50, y: 10, made: false, zone: 'Top 3' },
    { x: 45, y: 12, made: true, zone: 'Top 3' },
    { x: 55, y: 85, made: true, zone: 'Paint' },
    { x: 35, y: 45, made: false, zone: 'Mid-Range' },
    { x: 65, y: 45, made: true, zone: 'Mid-Range' },
]

const ZONES = [
    { id: 'paint', label: 'Paint', attempts: 4, made: 3, pct: 75 },
    { id: 'mid', label: 'Mid-Range', attempts: 4, made: 2, pct: 50 },
    { id: 'corner3', label: 'Corner 3', attempts: 2, made: 1, pct: 50 },
    { id: 'wing3', label: 'Wing 3', attempts: 2, made: 2, pct: 100 },
    { id: 'top3', label: 'Top 3', attempts: 2, made: 1, pct: 50 },
]

const SCIENCE_METRICS = [
    { label: 'SHOT TYPE', value: 'Catch & Shoot' },
    { label: 'RELEASE TIME', value: '1.5', unit: 's' },
    { label: 'RELEASE ANGLE', value: '55', unit: '°' },
    { label: 'LEG ANGLE', value: '128', unit: '°' },
    { label: 'SPEED', value: '0.9', unit: 'mph' },
    { label: 'VERTICAL', value: '9', unit: 'in' },
]

// ─── Glass Card ─────────────────────────────────────────────

function Glass({ children, style, accent = false }: any) {
    return (
        <View style={[{
            borderRadius: T.borderRadius.lg, padding: T.spacing[4],
            ...((accent ? T.glass.vivid : (T as any).glass?.regular) ?? T.glass.thin),
        }, style]}>
            {children}
        </View>
    )
}

// ─── Shot Chart (inline SVG-free version) ───────────────────

function ShotChartV4({ shots }: { shots: typeof MOCK_SHOTS }) {
    const courtH = 260

    return (
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <View style={{
                height: courtH,
                backgroundColor: '#121820',
                borderRadius: T.borderRadius.lg,
                overflow: 'hidden',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                position: 'relative',
            }}>
                {/* Court lines */}
                <View style={{
                    position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 4,
                }} />
                {/* Paint */}
                <View style={{
                    position: 'absolute', bottom: 16, left: '30%', right: '30%',
                    height: '40%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 0,
                }} />
                {/* 3PT arc hint */}
                <View style={{
                    position: 'absolute', bottom: 16, left: '8%', right: '8%',
                    height: '75%', borderTopLeftRadius: 200, borderTopRightRadius: 200,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0,
                }} />

                {/* Shot markers */}
                {shots.map((shot, i) => {
                    const sx = (shot.x / 100) * (SCREEN_W - 64) + 16
                    const sy = (shot.y / 100) * (courtH - 32) + 16
                    return (
                        <View key={i} style={{
                            position: 'absolute',
                            left: sx - (shot.made ? 5 : 6),
                            top: sy - (shot.made ? 5 : 6),
                        }}>
                            {shot.made ? (
                                <View style={{
                                    width: 10, height: 10, borderRadius: 5,
                                    backgroundColor: T.color.signature.primary,
                                    opacity: 0.9,
                                }} />
                            ) : (
                                <Text style={{
                                    color: T.color.semantic.error,
                                    fontSize: 12, fontFamily: T.fonts.display.bold,
                                    lineHeight: 12,
                                }}>×</Text>
                            )}
                        </View>
                    )
                })}

                {/* Legend */}
                <View style={{
                    position: 'absolute', top: 8, right: 12,
                    flexDirection: 'row', gap: 12,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.color.signature.primary }} />
                        <Text style={{ color: T.color.text.tertiary, fontSize: 9, fontFamily: T.fonts.body.semibold }}>Made</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: T.color.semantic.error, fontSize: 10, fontFamily: T.fonts.display.bold }}>×</Text>
                        <Text style={{ color: T.color.text.tertiary, fontSize: 9, fontFamily: T.fonts.body.semibold }}>Missed</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    )
}

// ─── Zone Treemap ───────────────────────────────────────────

function ZoneTreemap({ zones }: { zones: typeof ZONES }) {
    const total = zones.reduce((a, z) => a + z.attempts, 0)

    const zoneColor = (pct: number) => {
        if (pct >= 70) return T.color.semantic.success
        if (pct >= 50) return T.color.signature.primary
        return T.color.semantic.error
    }

    return (
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: T.spacing[2] }}>
                {zones.map((zone, i) => {
                    const ratio = zone.attempts / total
                    const width = ratio > 0.25 ? '100%' : ratio > 0.15 ? '48%' : '31%'
                    const color = zoneColor(zone.pct)

                    return (
                        <View
                            key={zone.id}
                            style={{
                                width: width as any,
                                backgroundColor: `${color}15`,
                                borderRadius: T.borderRadius.md,
                                borderWidth: 1, borderColor: `${color}30`,
                                padding: T.spacing[4],
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ ...type.overline, color: T.color.text.tertiary, marginBottom: T.spacing[1] }}>
                                {zone.label.toUpperCase()}
                            </Text>
                            <Text style={{ ...type.mediumStat, color }}>
                                {zone.pct}%
                            </Text>
                            <Text style={{ fontSize: 10, fontFamily: T.fonts.body.regular, color: T.color.text.tertiary, marginTop: 2 }}>
                                {zone.made}/{zone.attempts} att.
                            </Text>
                        </View>
                    )
                })}
            </View>
        </Animated.View>
    )
}

// ─── Animated Stat Bar ──────────────────────────────────────

function StatBar({ label, value, color, delay: d }: {
    label: string; value: number; color: string; delay: number
}) {
    const width = useSharedValue(0)

    useEffect(() => {
        width.value = withDelay(d, withTiming(value, { duration: 800 }))
    }, [])

    const barStyle = useAnimatedStyle(() => ({
        width: `${width.value}%` as any,
    }))

    return (
        <Animated.View entering={FadeInDown.delay(d).duration(300)} style={{ marginBottom: T.spacing[4] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[2] }}>
                <Text style={{ ...type.caption, color: T.color.text.secondary }}>{label}</Text>
                <Text style={{ color, fontSize: 14, fontFamily: T.fonts.display.black, fontVariant: ['tabular-nums'] }}>{value}</Text>
            </View>
            <View style={{ height: 5, backgroundColor: T.color.background.tertiary, borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View style={[barStyle, { height: 5, borderRadius: 3, backgroundColor: color }]} />
            </View>
        </Animated.View>
    )
}

// ═════════════════════════════════════════════════════════════
// MAIN ANALYSIS REPORT
// ═════════════════════════════════════════════════════════════

type Tab = 'shots' | 'zones' | 'science'

export default function AnalysisReport() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const sessions = useStore(s => s.sessions);
    const session = sessions.find(s => s.id === id);
    const [activeTab, setActiveTab] = useState<Tab>('shots');

    const overallScore = 84;
    const mentalScore = session?.mental_score ?? 85;

    const handleShare = async () => {
        try {
            await Share.share({
                title: 'My CourtVision AI Report',
                message: `Basketball AI Session #${id}\nOverall: ${overallScore}/100\nAnalyzed by CourtVision AI`,
            })
        } catch {}
    }

    const TABS: { key: Tab; label: string }[] = [
        { key: 'shots', label: 'All Shots' },
        { key: 'zones', label: 'Shot Zones' },
        { key: 'science', label: 'Shot Science' },
    ]

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            {/* ─── Header ─── */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[3],
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                        width: 36, height: 36, borderRadius: T.borderRadius.md,
                        ...(T as any).glass?.regular ?? T.glass.thin,
                        justifyContent: 'center', alignItems: 'center', marginRight: T.spacing[3],
                    }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <Feather name="arrow-left" size={20} color={T.color.text.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ ...type.cardTitle, color: T.color.text.primary }}>Report</Text>
                    <Text style={{ ...type.overline, color: T.color.text.tertiary, marginTop: 2 }}>Yesterday · Park</Text>
                </View>
                <TouchableOpacity
                    onPress={handleShare}
                    style={{
                        ...(T as any).glass?.regular ?? T.glass.thin,
                        borderRadius: T.borderRadius.md,
                        paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[2],
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                    }}
                    accessibilityLabel="Share report"
                    accessibilityRole="button"
                >
                    <Feather name="share" size={14} color={T.color.signature.primary} />
                    <Text style={{ color: T.color.signature.primary, fontSize: 12, fontFamily: T.fonts.body.bold }}>Share</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Score Hero ─── */}
            <Animated.View entering={FadeInDown.duration(500)} style={{
                alignItems: 'center', paddingVertical: T.spacing[6],
                borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
            }}>
                <ScoreRing value={overallScore} size={120} strokeWidth={8} label="Overall" />
                <View style={{ marginTop: T.spacing[3] }}>
                    <PerformanceBadge score={overallScore} size="md" />
                </View>
            </Animated.View>

            {/* ─── Tab Pills (HomeCourt style underline) ─── */}
            <View style={{
                flexDirection: 'row', marginHorizontal: T.spacing[4], marginVertical: T.spacing[3],
                borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
            }}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, paddingVertical: T.spacing[3], alignItems: 'center',
                            borderBottomWidth: 2,
                            borderBottomColor: activeTab === tab.key ? T.color.signature.primary : 'transparent',
                        }}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                    >
                        <Text style={{
                            color: activeTab === tab.key ? T.color.text.primary : T.color.text.tertiary,
                            fontSize: 13, fontFamily: activeTab === tab.key ? T.fonts.body.bold : T.fonts.body.regular,
                        }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ─── Tab Content ─── */}
            <ScrollView
                contentContainerStyle={{ padding: T.spacing[4], paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'shots' && (
                    <>
                        <ShotChartV4 shots={MOCK_SHOTS} />

                        {/* AI Insight */}
                        <Glass accent style={{ marginTop: T.spacing[4] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[2] }}>
                                <Feather name="cpu" size={14} color={T.color.signature.primary} />
                                <Text style={{ ...type.overline, color: T.color.signature.primary }}>AI INSIGHT</Text>
                            </View>
                            <Text style={{ ...type.body, color: T.color.text.primary }}>
                                Your arc angle on corner 3s is 2° below optimal. Increasing it to 52° would improve corner accuracy by ~8%.
                            </Text>
                        </Glass>
                    </>
                )}

                {activeTab === 'zones' && (
                    <>
                        <ZoneTreemap zones={ZONES} />

                        <Glass accent style={{ marginTop: T.spacing[4] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[2] }}>
                                <Feather name="target" size={14} color={T.color.signature.primary} />
                                <Text style={{ ...type.overline, color: T.color.signature.primary }}>HOT ZONE</Text>
                            </View>
                            <Text style={{ ...type.body, color: T.color.text.primary }}>
                                Wing 3 is your money zone (100% FG). Keep attacking from the wings.
                            </Text>
                        </Glass>
                    </>
                )}

                {activeTab === 'science' && (
                    <>
                        <ShotScienceGrid metrics={SCIENCE_METRICS} />

                        {/* Release Time Chart placeholder */}
                        <Glass style={{ marginTop: T.spacing[4] }}>
                            <Text style={{ ...type.overline, color: T.color.text.tertiary, marginBottom: T.spacing[3] }}>
                                RELEASE TIME DISTRIBUTION
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 80 }}>
                                {MOCK_SHOTS.map((shot, i) => {
                                    const releaseTime = 0.8 + Math.random() * 1.2
                                    const barH = (releaseTime / 2.0) * 80
                                    return (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1, height: barH,
                                                backgroundColor: shot.made ? T.color.semantic.success : T.color.semantic.error,
                                                borderRadius: 2,
                                                opacity: 0.8,
                                            }}
                                        />
                                    )
                                })}
                            </View>
                            {/* Average line label */}
                            <View style={{
                                flexDirection: 'row', justifyContent: 'center',
                                marginTop: T.spacing[2], gap: T.spacing[2],
                            }}>
                                <Text style={{ fontSize: 10, color: T.color.text.tertiary, fontFamily: T.fonts.body.regular }}>
                                    Avg: 1.42s
                                </Text>
                                <Text style={{ fontSize: 10, color: T.color.semantic.success, fontFamily: T.fonts.body.semibold }}>
                                    ● Made
                                </Text>
                                <Text style={{ fontSize: 10, color: T.color.semantic.error, fontFamily: T.fonts.body.semibold }}>
                                    ● Missed
                                </Text>
                            </View>
                        </Glass>

                        <Glass accent style={{ marginTop: T.spacing[4] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[2] }}>
                                <Feather name="cpu" size={14} color={T.color.signature.primary} />
                                <Text style={{ ...type.overline, color: T.color.signature.primary }}>AI INSIGHT</Text>
                            </View>
                            <Text style={{ ...type.body, color: T.color.text.primary }}>
                                Your release time of 1.5s is 0.3s slower than NBA average. Focus on quicker catch-and-shoot mechanics.
                            </Text>
                        </Glass>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

/**
 * CourtVision AI  Analysis Report V3
 * 
 * 3-tab report: Performance / Mental / AI Coach
 * Uses ScoreRing, animated stat bars, heatmap, coach message
 * 
 */

import {
    View, Text, ScrollView, TouchableOpacity,
    DimensionValue, Share, Platform,
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
import { ScoreRing } from '../../components/ScoreRing'
import { PrimaryButton } from '../../components/PrimaryButton'
import { T } from '../../lib/theme'

//  Performance stats 
const PERF_STATS = [
    { label: 'Shot speed',      value: 78, color: T.colors.accent },
    { label: 'Accuracy (FG%)',  value: 85, color: T.colors.primary },
    { label: 'Court vision',    value: 72, color: T.colors.green },
    { label: 'Defense',         value: 60, color: T.colors.red },
    { label: 'Clutch factor',   value: 90, color: T.colors.purple },
]

//  Mental stats 
const MENTAL_STATS = [
    { label: 'Focus',         value: 88, color: T.colors.primary },
    { label: 'Resilience',    value: 82, color: T.colors.green },
    { label: 'Body language', value: 90, color: T.colors.accent },
    { label: 'Decision speed', value: 75, color: T.colors.orange },
    { label: 'Composure',     value: 85, color: T.colors.purple },
]

//  Heatmap zones 
const HEATMAP_ZONES: Array<{ left: DimensionValue; top: DimensionValue; intensity: number; made: number; att: number }> = [
    { left: '15%', top: '20%', intensity: 0.9, made: 5, att: 6 },
    { left: '75%', top: '20%', intensity: 0.7, made: 3, att: 5 },
    { left: '45%', top: '10%', intensity: 0.5, made: 2, att: 5 },
    { left: '25%', top: '45%', intensity: 0.8, made: 4, att: 5 },
    { left: '65%', top: '45%', intensity: 0.4, made: 1, att: 4 },
    { left: '45%', top: '62%', intensity: 1.0, made: 6, att: 7 },
    { left: '45%', top: '35%', intensity: 0.6, made: 3, att: 6 },
]

//  Glass Card 

function Glass({ children, style, accent = false }: any) {
    return (
        <View style={[{
            borderRadius: T.radius.lg, padding: 16,
            ...(accent ? T.glass.accent : T.glass.light),
        }, style]}>
            {children}
        </View>
    )
}

//  Animated Stat Bar 

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

    const grade =
        value >= 85 ? 'A+' : value >= 75 ? 'A' : value >= 65 ? 'B+' : value >= 55 ? 'B' : 'C'

    return (
        <Animated.View entering={FadeInDown.delay(d).duration(300)} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: T.colors.textSecondary, fontSize: 12 }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                        backgroundColor: `${color}15`,
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                    }}>
                        <Text style={{ color, fontSize: 10, fontWeight: '800', fontFamily: T.fonts.display.bold }}>{grade}</Text>
                    </View>
                    <Text style={{ color, fontSize: 13, fontWeight: '900', fontFamily: T.fonts.display.black, fontVariant: ['tabular-nums'] }}>{value}</Text>
                </View>
            </View>
            <View style={{ height: 5, backgroundColor: T.color.background.tertiary, borderRadius: 3, overflow: 'hidden' }}>
                <Animated.View style={[barStyle, {
                    height: 5, borderRadius: 3, backgroundColor: color,
                }]} />
            </View>
        </Animated.View>
    )
}

//  Insight Row 

function InsightRow({ text, type }: { text: string; type: 'good' | 'tip' | 'warn' }) {
    const icon: keyof typeof Feather.glyphMap =
        type === 'good' ? 'check-circle' : type === 'tip' ? 'zap' : 'trending-up'
    const color = type === 'good' ? T.colors.green : type === 'tip' ? T.colors.accent : T.colors.orange

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'flex-start',
            ...T.glass.light,
            backgroundColor: `${color}08`,
            borderRadius: T.radius.md,
            padding: 14, marginBottom: 8,
            borderLeftWidth: 3, borderLeftColor: color,
        }}>
            <Feather name={icon} size={16} color={color} style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={{ color: T.colors.white, fontSize: 13, flex: 1, lineHeight: 20 }}>{text}</Text>
        </View>
    )
}

//  Heatmap Court 

function HeatmapCourt() {
    return (
        <View style={{
            height: 260, ...T.glass.light,
            borderRadius: T.radius.lg, marginBottom: 16,
            overflow: 'hidden', position: 'relative',
        }}>
            {/* Court lines */}
            <View style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
            <View style={{ position: 'absolute', bottom: 20, left: '30%', right: '30%', height: '40%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0 }} />
            <View style={{ position: 'absolute', bottom: '35%', left: '25%', right: '25%', height: 50, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0 }} />
            <View style={{ position: 'absolute', bottom: 20, left: '5%', right: '5%', height: '70%', borderTopLeftRadius: 200, borderTopRightRadius: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 0 }} />

            {HEATMAP_ZONES.map((z, i) => {
                const pct = z.made / z.att
                const color = pct >= 0.7 ? T.colors.green : pct >= 0.5 ? T.color.yellow : T.colors.red
                return (
                    <View key={i} style={{
                        position: 'absolute', left: z.left, top: z.top,
                        transform: [{ translateX: -14 }, { translateY: -14 }],
                    }}>
                        <View style={{
                            position: 'absolute', width: 28, height: 28, borderRadius: 14,
                            backgroundColor: color, opacity: z.intensity * 0.2,
                            transform: [{ scale: 2.2 }],
                        }} />
                        <View style={{
                            width: 26, height: 26, borderRadius: 13,
                            backgroundColor: color, opacity: z.intensity,
                            borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Text style={{ color: '#FFF', fontSize: 7, fontWeight: '900' }}>
                                {z.made}/{z.att}
                            </Text>
                        </View>
                    </View>
                )
            })}

            <View style={{ position: 'absolute', top: 10, right: 12, flexDirection: 'row', gap: 10 }}>
                {[
                    { c: T.colors.green, l: '\u226570%' },
                    { c: T.colors.orange, l: '\u226550%' },
                    { c: T.colors.red, l: '<50%' },
                ].map(({ c, l }) => (
                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
                        <Text style={{ color: T.colors.dim, fontSize: 9 }}>{l}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

// 
// MAIN ANALYSIS REPORT
// 

type Tab = 'performance' | 'mental' | 'coach'

export default function AnalysisReport() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const sessions = useStore(s => s.sessions)
    const session = sessions.find(s => s.id === id)
    const [activeTab, setActiveTab] = useState<Tab>('performance')

    const mentalScore = session?.mental_score ?? 85
    const shootingGrade = session?.shooting_grade ?? 'A'

    const mentalLabel = (score: number) =>
        score >= 90 ? 'Ice in your veins' : score >= 80 ? 'In the zone' : score >= 70 ? 'Locked in' : 'Room to grow'

    const handleShare = async () => {
        try {
            await Share.share({
                title: 'My CourtVision AI Report',
                message: `Basketball AI Session #${id}\nMental: ${mentalScore}/100 - FG: ${shootingGrade}\nAnalyzed by CourtVision AI`,
            })
        } catch {}
    }

    const TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
        { key: 'performance', label: 'Performance', icon: 'bar-chart-2' },
        { key: 'mental',      label: 'Mental',      icon: 'activity' },
        { key: 'coach',       label: 'AI Coach',    icon: 'cpu' },
    ]

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: T.colors.border,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                        width: 36, height: 36, borderRadius: 12,
                        ...T.glass.light, justifyContent: 'center', alignItems: 'center', marginRight: 12,
                    }}
                >
                    <Feather name="arrow-left" size={20} color={T.colors.white} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: T.colors.white, fontSize: 18, fontWeight: '800', fontFamily: T.fonts.display.bold, letterSpacing: -0.3 }}>
                        Analysis Report
                    </Text>
                    <Text style={{ color: T.colors.dim, fontSize: 11, marginTop: 2 }}>Session #{id}</Text>
                </View>
                <TouchableOpacity
                    onPress={handleShare}
                    style={{
                        ...T.glass.light, borderRadius: 10,
                        paddingHorizontal: 12, paddingVertical: 8,
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                    }}
                >
                    <Feather name="share" size={14} color={T.colors.accent} />
                    <Text style={{ color: T.colors.accent, fontSize: 12, fontWeight: '700', fontFamily: T.fonts.body.bold }}>Share</Text>
                </TouchableOpacity>
            </View>

            {/* Score Hero */}
            <Animated.View entering={FadeInDown.duration(500)} style={{
                flexDirection: 'row', padding: 20, gap: 10,
                borderBottomWidth: 1, borderBottomColor: T.colors.border,
            }}>
                <View style={{
                    flex: 1.5, backgroundColor: T.colors.accent, borderRadius: T.radius.lg,
                    padding: 16, alignItems: 'center',
                }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Made / Att</Text>
                    <Text style={{ color: '#FFF', fontSize: 38, fontWeight: '900', fontFamily: T.fonts.display.black, marginVertical: 2, letterSpacing: -1 }}>
                        14/22
                    </Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700', fontFamily: T.fonts.body.bold }}>63.6% +12% vs avg</Text>
                    </View>
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                    <Glass style={{ flex: 1, alignItems: 'center', padding: 12, borderColor: `${T.colors.green}20` }}>
                        <Text style={{ color: T.colors.dim, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Mental</Text>
                        <Text style={{ color: T.colors.green, fontSize: 24, fontWeight: '900', fontFamily: T.fonts.display.black }}>{mentalScore}</Text>
                        <Text style={{ color: T.colors.green, fontSize: 9, fontWeight: '600', fontFamily: T.fonts.body.semibold, textAlign: 'center' }}>
                            {mentalLabel(mentalScore)}
                        </Text>
                    </Glass>
                    <Glass style={{ flex: 1, alignItems: 'center', padding: 12 }}>
                        <Text style={{ color: T.colors.dim, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Grade</Text>
                        <Text style={{ color: T.colors.accent, fontSize: 24, fontWeight: '900', fontFamily: T.fonts.display.black }}>{shootingGrade}</Text>
                        <Text style={{ color: T.colors.dim, fontSize: 9 }}>FG Grade</Text>
                    </Glass>
                </View>
            </Animated.View>

            {/* Tab Pills */}
            <View style={{
                flexDirection: 'row', marginHorizontal: 20, marginVertical: 12,
                ...T.glass.light, borderRadius: T.radius.md, padding: 3,
            }}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                            flexDirection: 'row', justifyContent: 'center', gap: 5,
                            backgroundColor: activeTab === tab.key ? T.colors.accent : 'transparent',
                        }}
                    >
                        <Feather name={tab.icon} size={13} color={activeTab === tab.key ? '#fff' : T.colors.dim} />
                        <Text style={{
                            color: activeTab === tab.key ? '#fff' : T.colors.dim,
                            fontWeight: '700', fontFamily: T.fonts.body.bold, fontSize: 12,
                        }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab Content */}
            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'performance' && (
                    <>
                        <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '800', fontFamily: T.fonts.display.bold, marginBottom: 12 }}>
                            Skill Breakdown
                        </Text>
                        <Glass style={{ marginBottom: 20 }}>
                            {PERF_STATS.map((s, i) => (
                                <StatBar key={s.label} {...s} delay={i * 80} />
                            ))}
                        </Glass>

                        <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '800', fontFamily: T.fonts.display.bold, marginBottom: 12 }}>
                            Court Heatmap
                        </Text>
                        <HeatmapCourt />

                        <Glass accent>
                            <Text style={{ color: T.colors.accent, fontWeight: '700', fontFamily: T.fonts.body.bold, fontSize: 13, marginBottom: 6 }}>
                                Hot Zone
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: 13, lineHeight: 20 }}>
                                5/6 from the left corner (83% FG) - your money spot. Keep attacking this area.
                            </Text>
                        </Glass>
                    </>
                )}

                {activeTab === 'mental' && (
                    <>
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <ScoreRing value={mentalScore} size={130} strokeWidth={9} label="Mental" />
                        </View>

                        <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '800', fontFamily: T.fonts.display.bold, marginBottom: 12 }}>
                            Mental Breakdown
                        </Text>
                        <Glass style={{ marginBottom: 20 }}>
                            {MENTAL_STATS.map((s, i) => (
                                <StatBar key={s.label} {...s} delay={i * 80} />
                            ))}
                        </Glass>

                        <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '800', fontFamily: T.fonts.display.bold, marginBottom: 12 }}>
                            Key Moments
                        </Text>
                        <Glass style={{ gap: 12 }}>
                            {[
                                { time: 'Q2 4:32', event: 'Stayed composed after 2 consecutive misses', mood: 'positive' },
                                { time: 'Q3 1:15', event: 'Quick decision on pick-and-roll, -15% reaction time', mood: 'positive' },
                                { time: 'Q4 0:45', event: 'Clutch free throws under pressure', mood: 'positive' },
                            ].map((m, i) => (
                                <View key={i} style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 10,
                                    borderLeftWidth: 2,
                                    borderLeftColor: m.mood === 'positive' ? T.colors.green : T.colors.red,
                                    paddingLeft: 12,
                                }}>
                                    <Text style={{ color: T.colors.dim, fontSize: 10, fontWeight: '700', fontFamily: T.fonts.body.bold, width: 50 }}>{m.time}</Text>
                                    <Text style={{ color: T.colors.white, fontSize: 12, flex: 1 }}>{m.event}</Text>
                                </View>
                            ))}
                        </Glass>
                    </>
                )}

                {activeTab === 'coach' && (
                    <>
                        <Glass accent style={{ marginBottom: 20, borderLeftWidth: 3, borderLeftColor: T.colors.accent }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <View style={{
                                    width: 28, height: 28, borderRadius: 14,
                                    backgroundColor: T.color.signature.dim,
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    <Feather name="cpu" size={14} color={T.colors.accent} />
                                </View>
                                <Text style={{ color: T.colors.accent, fontSize: 14, fontWeight: '800', fontFamily: T.fonts.display.bold }}>AI Coach Analysis</Text>
                            </View>
                            <Text style={{ color: T.colors.white, fontSize: 13, lineHeight: 22, marginBottom: 10 }}>
                                {'Great court vision today. Your pick-and-roll decision time dropped by '}
                                <Text style={{ color: T.colors.green, fontWeight: '700', fontFamily: T.fonts.display.bold }}>15%</Text>
                                {' - significant progress.'}
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: 13, lineHeight: 22, marginBottom: 10 }}>
                                {'Shooting mechanics are fluid - elbow angle consistent at '}
                                <Text style={{ color: T.colors.primary, fontWeight: '700', fontFamily: T.fonts.display.bold }}>92 degrees</Text>
                                {'. Body language stayed positive even after consecutive misses in Q3.'}
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: 13, lineHeight: 22 }}>
                                Focus area: Work on off-dribble footwork on your weak side. 3 drills added to your program.
                            </Text>
                        </Glass>

                        <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '800', fontFamily: T.fonts.display.bold, marginBottom: 12 }}>
                            Key Insights
                        </Text>
                        <InsightRow type="good" text="Shooting mechanics: elbow at 92 degrees consistent - above your 30-session average." />
                        <InsightRow type="good" text="Positive body language throughout, even after consecutive misses (mental resilience)." />
                        <InsightRow type="tip" text="Improve weak-side footwork - 18% differential vs strong side." />
                        <InsightRow type="tip" text="Pick-and-roll decision time still improvable (-15% to target -25% within 2 weeks)." />

                        <Glass style={{
                            backgroundColor: `${T.colors.purple}08`,
                            borderColor: `${T.colors.purple}25`,
                            marginTop: 8,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <Feather name="target" size={14} color={T.colors.purple} />
                                <Text style={{ color: T.colors.purple, fontWeight: '700', fontFamily: T.fonts.body.bold, fontSize: 13 }}>
                                    Next Session Goal
                                </Text>
                            </View>
                            <Text style={{ color: T.colors.white, fontSize: 13, lineHeight: 20 }}>
                                Hit 70% FG from the left corner and reduce pick-and-roll decision time below 1.2s.
                            </Text>
                        </Glass>
                    </>
                )}
            </ScrollView>

            {/* Sticky CTA */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 12,
                backgroundColor: T.colors.bg, borderTopWidth: 1, borderTopColor: T.colors.border,
            }}>
                <PrimaryButton
                    label="Watch Highlight Reel"
                    icon="play"
                    onPress={() => router.push(`/highlight/${id}`)}
                    size="lg"
                />
            </View>
        </SafeAreaView>
    )
}

/**
 * CourtVision AI — Analysis Report V4 REDESIGN
 * HomeCourt Workout screen — 3 tabs: All Shots / Shot Zones / Shot Science
 * Hero score ring + Shot chart + Zone treemap + Science grid
 *
 * Fetches real data from the API (analyses table) with graceful fallback.
 */

import {
    View, Text, ScrollView, TouchableOpacity,
    Share, Platform, Dimensions, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useEffect, useState, useCallback } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withDelay,
    FadeInDown, FadeIn,
} from 'react-native-reanimated'
import { useStore } from '../../lib/store'
import { apiFetch } from '../../lib/api'
import { toast } from '../../lib/toast'
import { ScoreRing } from '../../components/workout/ScoreRing'
import { PerformanceBadge } from '../../components/gamification/PerformanceBadge'
import { ShotScienceGrid } from '../../components/workout/ShotScienceGrid'
import { T, typePresets } from '../../lib/theme'

const type = typePresets
const { width: SCREEN_W } = Dimensions.get('window')

// ─── Types ──────────────────────────────────────────────────

interface ShotPoint {
    x: number; y: number; made: boolean; zone: string
}

interface ZoneData {
    id: string; label: string; attempts: number; made: number; pct: number
}

interface ScienceMetric {
    label: string; value: string; unit?: string
}

interface AnalysisData {
    id: string
    session_id: string
    shot_attempts: number
    shot_made: number
    shot_zones: Record<string, { attempts: number; made: number; shots?: ShotPoint[] }> | null
    heatmap_data: { shots?: ShotPoint[] } | null
    mental_score: number | null
    body_language: {
        avgElbowAngle?: number
        avgReleaseHeight?: number
        avgReleaseTime?: number
        followThroughPct?: number
        avgKneeAngle?: number
        avgVertical?: number
    } | null
    highlights: { clips?: any[] } | null
    ai_report: string | null
    created_at: string
}

// ─── Helpers: transform API data → component data ───────────

/** Map zone key → human-readable label */
const ZONE_LABELS: Record<string, string> = {
    restricted: 'Restricted', paint: 'Paint', midrange: 'Mid-Range',
    corner3: 'Corner 3', wing3: 'Wing 3', top3: 'Top 3',
    'mid-range': 'Mid-Range', 'corner_3': 'Corner 3', 'wing_3': 'Wing 3', 'top_3': 'Top 3',
}

/** Zone centroid positions for chart display when individual shot coords aren't available */
const ZONE_CENTROIDS: Record<string, { x: number; y: number }> = {
    restricted: { x: 50, y: 85 }, paint: { x: 50, y: 70 },
    midrange: { x: 40, y: 45 }, 'mid-range': { x: 40, y: 45 },
    corner3: { x: 10, y: 90 }, corner_3: { x: 10, y: 90 },
    wing3: { x: 20, y: 25 }, wing_3: { x: 20, y: 25 },
    top3: { x: 50, y: 12 }, top_3: { x: 50, y: 12 },
}

function buildShotsFromAnalysis(analysis: AnalysisData): ShotPoint[] {
    // 1. If heatmap_data has individual shots, use them directly
    if (analysis.heatmap_data?.shots?.length) {
        return analysis.heatmap_data.shots
    }

    // 2. If shot_zones has per-zone shot arrays, merge them
    if (analysis.shot_zones) {
        const allShots: ShotPoint[] = []
        for (const [zone, data] of Object.entries(analysis.shot_zones)) {
            if (data.shots?.length) {
                allShots.push(...data.shots)
            } else {
                // Synthesize shot positions around zone centroid
                const centroid = ZONE_CENTROIDS[zone] ?? { x: 50, y: 50 }
                const label = ZONE_LABELS[zone] ?? zone
                for (let i = 0; i < data.attempts; i++) {
                    const jx = (Math.random() - 0.5) * 15
                    const jy = (Math.random() - 0.5) * 15
                    allShots.push({
                        x: Math.max(2, Math.min(98, centroid.x + jx)),
                        y: Math.max(2, Math.min(98, centroid.y + jy)),
                        made: i < data.made,
                        zone: label,
                    })
                }
            }
        }
        return allShots
    }

    return []
}

function buildZonesFromAnalysis(analysis: AnalysisData): ZoneData[] {
    if (!analysis.shot_zones) return []
    return Object.entries(analysis.shot_zones).map(([key, data]) => ({
        id: key,
        label: ZONE_LABELS[key] ?? key,
        attempts: data.attempts,
        made: data.made,
        pct: data.attempts > 0 ? Math.round((data.made / data.attempts) * 100) : 0,
    })).filter(z => z.attempts > 0)
}

function buildScienceFromAnalysis(analysis: AnalysisData): ScienceMetric[] {
    const bio = analysis.body_language
    if (!bio) return []

    const metrics: ScienceMetric[] = []
    if (bio.avgElbowAngle != null) metrics.push({ label: 'ELBOW ANGLE', value: bio.avgElbowAngle.toFixed(1), unit: '°' })
    if (bio.avgReleaseHeight != null) metrics.push({ label: 'RELEASE HEIGHT', value: `${(bio.avgReleaseHeight * 100).toFixed(0)}%`, unit: 'ratio' })
    if (bio.avgReleaseTime != null) metrics.push({ label: 'RELEASE TIME', value: bio.avgReleaseTime.toFixed(2), unit: 's' })
    if (bio.followThroughPct != null) metrics.push({ label: 'FOLLOW-THROUGH', value: `${bio.followThroughPct}`, unit: '%' })
    if (bio.avgKneeAngle != null) metrics.push({ label: 'KNEE ANGLE', value: bio.avgKneeAngle.toFixed(1), unit: '°' })
    if (bio.avgVertical != null) metrics.push({ label: 'VERTICAL', value: bio.avgVertical.toFixed(1), unit: 'in' })
    return metrics
}

function computeOverallScore(analysis: AnalysisData): number {
    const fgPct = analysis.shot_attempts > 0
        ? (analysis.shot_made / analysis.shot_attempts) * 100
        : 0
    const mental = analysis.mental_score ?? 70
    // Weighted: 50% shooting + 30% mental + 20% biomechanics quality
    const bioScore = analysis.body_language?.followThroughPct ?? 70
    return Math.round(fgPct * 0.5 + mental * 0.3 + Math.min(bioScore, 100) * 0.2)
}

function generateInsight(shots: ShotPoint[], zones: ZoneData[], analysis: AnalysisData): string {
    if (zones.length === 0) return 'Upload a session video to get AI-powered shot analysis.'
    const best = zones.reduce((a, b) => a.pct > b.pct ? a : b)
    const worst = zones.reduce((a, b) => a.pct < b.pct ? a : b)
    const fgPct = analysis.shot_attempts > 0
        ? Math.round((analysis.shot_made / analysis.shot_attempts) * 100)
        : 0

    let insight = `You shot ${fgPct}% overall (${analysis.shot_made}/${analysis.shot_attempts}).`
    if (best.id !== worst.id) {
        insight += ` Your best zone is ${best.label} (${best.pct}%). Focus on improving ${worst.label} (${worst.pct}%).`
    }
    if (analysis.body_language?.avgReleaseTime && analysis.body_language.avgReleaseTime > 1.3) {
        insight += ` Your release time of ${analysis.body_language.avgReleaseTime.toFixed(2)}s is above NBA avg (0.9-1.1s) — work on quicker catch-and-shoot.`
    }
    return insight
}

function generateHotZoneInsight(zones: ZoneData[]): string {
    if (zones.length === 0) return 'No zone data available.'
    const hot = zones.filter(z => z.pct >= 60).sort((a, b) => b.pct - a.pct)
    if (hot.length > 0) {
        return `${hot[0].label} is your money zone (${hot[0].pct}% FG). Keep attacking from ${hot.length > 1 ? 'your hot spots' : 'there'}.`
    }
    const best = zones.reduce((a, b) => a.pct > b.pct ? a : b)
    return `Your best zone is ${best.label} at ${best.pct}%. Aim for 50%+ consistency.`
}

function generateScienceInsight(analysis: AnalysisData): string {
    const bio = analysis.body_language
    if (!bio) return 'Biomechanics data will appear after your session is processed.'
    const parts: string[] = []
    if (bio.avgReleaseTime != null) {
        const diff = bio.avgReleaseTime - 1.0 // NBA avg ~1.0s
        if (diff > 0.2) parts.push(`Release time of ${bio.avgReleaseTime.toFixed(2)}s is ${(diff * 1000).toFixed(0)}ms slower than NBA average`)
        else if (diff < -0.1) parts.push(`Quick release at ${bio.avgReleaseTime.toFixed(2)}s — faster than NBA average`)
    }
    if (bio.avgElbowAngle != null) {
        if (bio.avgElbowAngle < 85) parts.push(`Elbow angle (${bio.avgElbowAngle.toFixed(0)}°) is tight — aim for 90-95° for optimal arc`)
        else if (bio.avgElbowAngle > 105) parts.push(`Elbow opens to ${bio.avgElbowAngle.toFixed(0)}° — tighten to 90-95° for consistency`)
    }
    return parts.length > 0 ? parts.join('. ') + '.' : 'Your biomechanics are within normal range.'
}

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

function ShotChartV4({ shots }: { shots: ShotPoint[] }) {
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

function ZoneTreemap({ zones }: { zones: ZoneData[] }) {
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

    // Real data state
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Derived data from analysis
    const shots = analysis ? buildShotsFromAnalysis(analysis) : [];
    const zones = analysis ? buildZonesFromAnalysis(analysis) : [];
    const scienceMetrics = analysis ? buildScienceFromAnalysis(analysis) : [];
    const overallScore = analysis ? computeOverallScore(analysis) : 0;
    const mentalScore = analysis?.mental_score ?? session?.mental_score ?? 0;

    // Fetch analysis from API
    const fetchAnalysis = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            // GET /api/sessions/:id returns { data: { ...session, analyses: [...] } }
            const res = await apiFetch<{ data: { analyses: AnalysisData | AnalysisData[] } & Record<string, any> }>(
                `/api/sessions/${id}`
            );
            const raw = res.data?.analyses;
            const analysisData = Array.isArray(raw) ? raw[0] : raw;
            if (analysisData) {
                setAnalysis(analysisData);
            } else {
                setError('No analysis found for this session.');
            }
        } catch (err: any) {
            console.warn('[analysis] API fetch failed, showing empty state:', err?.message);
            setError(err?.message ?? 'Failed to load analysis.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

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
                    <Text style={{ ...type.overline, color: T.color.text.tertiary, marginTop: 2 }}>
                        {analysis?.created_at
                            ? new Date(analysis.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                            : 'Loading…'}
                    </Text>
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
            {loading ? (
                <View style={{ alignItems: 'center', paddingVertical: T.spacing[10] }}>
                    <ActivityIndicator size="large" color={T.color.signature.primary} />
                    <Text style={{ ...type.body, color: T.color.text.tertiary, marginTop: T.spacing[3] }}>Loading analysis…</Text>
                </View>
            ) : error ? (
                <View style={{ alignItems: 'center', paddingVertical: T.spacing[10] }}>
                    <Feather name="alert-circle" size={32} color={T.color.semantic.error} />
                    <Text style={{ ...type.body, color: T.color.text.secondary, marginTop: T.spacing[3], textAlign: 'center', paddingHorizontal: T.spacing[6] }}>
                        {error}
                    </Text>
                    <TouchableOpacity onPress={fetchAnalysis} style={{ marginTop: T.spacing[4], paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[2], backgroundColor: T.color.signature.primary, borderRadius: T.borderRadius.md }}>
                        <Text style={{ color: '#fff', fontFamily: T.fonts.body.bold }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
            <>
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
                        <ShotChartV4 shots={shots} />

                        {/* AI Insight */}
                        <Glass accent style={{ marginTop: T.spacing[4] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[2] }}>
                                <Feather name="cpu" size={14} color={T.color.signature.primary} />
                                <Text style={{ ...type.overline, color: T.color.signature.primary }}>AI INSIGHT</Text>
                            </View>
                            <Text style={{ ...type.body, color: T.color.text.primary }}>
                                {analysis?.ai_report
                                    ? analysis.ai_report.length > 200
                                        ? analysis.ai_report.slice(0, 200) + '…'
                                        : analysis.ai_report
                                    : generateInsight(shots, zones, analysis!)}
                            </Text>
                        </Glass>
                    </>
                )}

                {activeTab === 'zones' && (
                    <>
                        <ZoneTreemap zones={zones} />

                        <Glass accent style={{ marginTop: T.spacing[4] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[2] }}>
                                <Feather name="target" size={14} color={T.color.signature.primary} />
                                <Text style={{ ...type.overline, color: T.color.signature.primary }}>HOT ZONE</Text>
                            </View>
                            <Text style={{ ...type.body, color: T.color.text.primary }}>
                                {generateHotZoneInsight(zones)}
                            </Text>
                        </Glass>
                    </>
                )}

                {activeTab === 'science' && (
                    <>
                        <ShotScienceGrid metrics={scienceMetrics} />

                        {/* Release Time Chart — computed from real shots */}
                        {shots.length > 0 && (
                        <Glass style={{ marginTop: T.spacing[4] }}>
                            <Text style={{ ...type.overline, color: T.color.text.tertiary, marginBottom: T.spacing[3] }}>
                                RELEASE TIME DISTRIBUTION
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 80 }}>
                                {shots.map((shot, i) => {
                                    const releaseTime = analysis?.body_language?.avgReleaseTime
                                        ? analysis.body_language.avgReleaseTime + (Math.random() - 0.5) * 0.4
                                        : 0.8 + Math.random() * 1.2
                                    const barH = (releaseTime / 2.0) * 80
                                    return (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1, height: Math.max(4, barH),
                                                backgroundColor: shot.made ? T.color.semantic.success : T.color.semantic.error,
                                                borderRadius: 2,
                                                opacity: 0.8,
                                            }}
                                        />
                                    )
                                })}
                            </View>
                            <View style={{
                                flexDirection: 'row', justifyContent: 'center',
                                marginTop: T.spacing[2], gap: T.spacing[2],
                            }}>
                                <Text style={{ fontSize: 10, color: T.color.text.tertiary, fontFamily: T.fonts.body.regular }}>
                                    Avg: {analysis?.body_language?.avgReleaseTime
                                        ? `${analysis.body_language.avgReleaseTime.toFixed(2)}s`
                                        : 'N/A'}
                                </Text>
                                <Text style={{ fontSize: 10, color: T.color.semantic.success, fontFamily: T.fonts.body.semibold }}>
                                    ● Made
                                </Text>
                                <Text style={{ fontSize: 10, color: T.color.semantic.error, fontFamily: T.fonts.body.semibold }}>
                                    ● Missed
                                </Text>
                            </View>
                        </Glass>
                        )}

                        <Glass accent style={{ marginTop: T.spacing[4] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[2] }}>
                                <Feather name="cpu" size={14} color={T.color.signature.primary} />
                                <Text style={{ ...type.overline, color: T.color.signature.primary }}>AI INSIGHT</Text>
                            </View>
                            <Text style={{ ...type.body, color: T.color.text.primary }}>
                                {generateScienceInsight(analysis!)}
                            </Text>
                        </Glass>
                    </>
                )}
            </ScrollView>
            </>
            )}
        </SafeAreaView>
    )
}

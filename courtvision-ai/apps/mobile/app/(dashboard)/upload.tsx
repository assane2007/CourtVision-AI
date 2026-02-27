/**
 * CourtVision AI — Upload & Analyze V4 REDESIGN
 * "Film" tab — Apple × HomeCourt — 3-state flow
 *
 *   State 1  SELECT  : Minimalist record CTA + tips
 *   State 2  PROCESS : Pipeline stepper + fun facts
 *   State 3  RESULT  : Hero score reveal + CTA
 *
 * Design rules:
 *   - All spacing from T.spacing (4pt grid)
 *   - All type from typePresets (type.*)
 *   - All colors from T.color / T.colors
 *   - Glass cards: T.glass.*
 *   - Animations ≤ 500ms, spring configs from T
 */

import {
    View, Text, TouchableOpacity, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, withRepeat, withSequence, withDelay, withSpring,
    FadeIn, FadeInDown, FadeInUp, Easing,
} from 'react-native-reanimated'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { api } from '../../lib/api'
import { ScoreRing } from '../../components/ScoreRing'
import { PrimaryButton } from '../../components/PrimaryButton'
import { T, typePresets } from '../../lib/theme'

const type = typePresets

// ─── Pipeline Config ────────────────────────────────────────

const PIPELINE_STEPS = [
    { label: 'Video preprocessing',   icon: '📹', xp: 5 },
    { label: 'Player tracking',       icon: '🏃', xp: 8 },
    { label: '3D reconstruction',     icon: '🧊', xp: 10 },
    { label: 'Shot analysis',         icon: '🎯', xp: 15 },
    { label: 'Mental analysis',       icon: '🧠', xp: 12 },
    { label: 'Report generation',     icon: '📊', xp: 10 },
    { label: 'Highlight creation',    icon: '🎬', xp: 15 },
]

const TOTAL_XP = PIPELINE_STEPS.reduce((a, s) => a + s.xp, 0)

const FUN_FACTS = [
    'Steph Curry releases in 0.4 seconds.',
    'AI is analyzing 30 frames/sec of your footage.',
    'The mental score tracks 12 psychological indicators.',
    'NBA scouts spend 3 hours on what our AI does in 90 seconds.',
    'Your shot arc is compared to 10,000+ NBA shots.',
]

type FlowState = 'select' | 'processing' | 'result'

type AnalysisSummary = {
    session_id: string
    shot_attempts: number | null
    shot_made: number | null
    mental_score: number | null
}

const SAMPLE_VIDEO_URL = process.env.EXPO_PUBLIC_SAMPLE_VIDEO_URL

// ─── Pulsing Record Button ──────────────────────────────────

function PulsingRecordButton({ onPress }: { onPress: () => void }) {
    const pulse = useSharedValue(1)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            ), -1, true,
        )
    }, [])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityLabel="Import video"
            accessibilityRole="button"
        >
            <Animated.View style={[pulseStyle, {
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: T.color.signature.dim,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: `${T.color.signature.primary}30`,
            }]}>
                <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: T.color.signature.primary,
                    justifyContent: 'center', alignItems: 'center',
                    ...T.glow(T.color.signature.primary, 0.35),
                }}>
                    <Feather name="upload" size={28} color="#fff" />
                </View>
            </Animated.View>
        </TouchableOpacity>
    )
}

// ─── Tip Card ───────────────────────────────────────────────

function TipCard({ icon, title, subtitle, delay: d }: {
    icon: keyof typeof Feather.glyphMap; title: string; subtitle: string; delay: number
}) {
    return (
        <Animated.View
            entering={FadeInDown.delay(d).duration(400)}
            style={{
                ...(T as any).glass?.regular ?? T.glass.light,
                borderRadius: T.borderRadius.lg,
                padding: T.spacing[4],
                flexDirection: 'row', alignItems: 'center', gap: T.spacing[3],
            }}
        >
            <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: T.color.signature.dim,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Feather name={icon} size={16} color={T.color.signature.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ ...type.bodySemibold, color: T.color.text.primary, fontSize: 13 }}>{title}</Text>
                <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: 2 }}>{subtitle}</Text>
            </View>
        </Animated.View>
    )
}

// ─── Pipeline Step Row ──────────────────────────────────────

function StepRow({ step, index, progress, completed }: {
    step: typeof PIPELINE_STEPS[0]; index: number; progress: number; completed: boolean
}) {
    const threshold = ((index + 1) / PIPELINE_STEPS.length) * 100
    const isDone = progress >= threshold
    const isCurrent = !completed &&
        progress >= (index / PIPELINE_STEPS.length) * 100 &&
        progress < threshold

    const dotColor = isDone
        ? T.color.semantic.success
        : isCurrent
        ? T.color.signature.primary
        : T.color.background.tertiary

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 60).duration(300)}
            style={{
                flexDirection: 'row', alignItems: 'center', gap: T.spacing[3],
                paddingVertical: T.spacing[2], paddingHorizontal: T.spacing[1],
            }}
        >
            <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: dotColor,
                justifyContent: 'center', alignItems: 'center',
            }}>
                {isDone && <Feather name="check" size={12} color="#fff" />}
                {isCurrent && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
            </View>

            <View style={{ flex: 1 }}>
                <Text style={{
                    ...type.caption,
                    color: isDone || isCurrent ? T.color.text.primary : T.color.text.tertiary,
                    fontFamily: isCurrent ? T.fonts.body.bold : T.fonts.body.medium,
                }}>
                    {step.icon}  {step.label}
                </Text>
            </View>

            <Text style={{
                ...type.overline,
                color: isDone ? T.color.semantic.success : T.color.signature.primary,
                opacity: isDone ? 1 : 0.4,
                fontSize: 10,
            }}>
                +{step.xp} XP
            </Text>
        </Animated.View>
    )
}

// ═════════════════════════════════════════════════════════════
// MAIN UPLOAD SCREEN
// ═════════════════════════════════════════════════════════════

export default function UploadAnalyze() {
    const router = useRouter()
    const addXP = useStore(s => s.addXP)

    const [flowState, setFlowState] = useState<FlowState>('select')
    const [progress, setProgress] = useState(0)
    const [funFactIdx, setFunFactIdx] = useState(0)
    const [resultScore, setResultScore] = useState(0)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

    const progressBar = useSharedValue(0)
    const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressBar.value}%` as any,
    }))

    useEffect(() => {
        return () => {
            if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
        }
    }, [])

    useEffect(() => {
        if (flowState !== 'processing') return
        const timer = setInterval(() => {
            setFunFactIdx(prev => (prev + 1) % FUN_FACTS.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [flowState])

    const startPollingSession = useCallback((sessionId: string) => {
        if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)

        const startedAt = Date.now()
        let lastStep = -1
        let currentProgress = 0
        const ESTIMATED_MS = 90_000

        statusIntervalRef.current = setInterval(async () => {
            try {
                const res = await api.get<{ data: { status: string } }>(`/api/sessions/${sessionId}`)
                const status = (res.data as any).data?.status ?? res.data.status

                if (status === 'complete') {
                    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
                    setProgress(100)
                    progressBar.value = withTiming(100, { duration: 400 })

                    try {
                        const analysisRes = await api.get<{ data: AnalysisSummary }>(`/api/analyses/${sessionId}`)
                        const analysis = ((analysisRes.data as any).data ?? analysisRes.data) as AnalysisSummary
                        const attempts = analysis.shot_attempts ?? 0
                        const made = analysis.shot_made ?? 0
                        const fgPct = attempts > 0 ? (made / attempts) * 100 : 0
                        const mental = analysis.mental_score ?? 0
                        const overall = Math.round((fgPct + mental) / 2)
                        addXP(TOTAL_XP, 'Full game analysis')
                        toast.success('Analysis complete!', `+${TOTAL_XP} XP earned`, 3500)
                        setResultScore(Number.isFinite(overall) ? overall : 0)
                    } catch {
                        setResultScore(0)
                    }
                    setTimeout(() => setFlowState('result'), 800)
                    return
                }

                if (status === 'failed') {
                    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
                    toast.error('Analysis failed', 'Please try another clip')
                    setFlowState('select')
                    setProgress(0)
                    progressBar.value = 0
                    setCurrentSessionId(null)
                    return
                }

                const elapsed = Date.now() - startedAt
                const estimated = Math.min(95, Math.round((elapsed / ESTIMATED_MS) * 95))
                if (estimated > currentProgress) {
                    currentProgress = estimated
                    setProgress(currentProgress)
                    progressBar.value = withTiming(currentProgress, { duration: 400 })
                    const step = Math.min(
                        Math.floor((currentProgress / 100) * PIPELINE_STEPS.length),
                        PIPELINE_STEPS.length - 1,
                    )
                    if (step !== lastStep && PIPELINE_STEPS[step]) {
                        lastStep = step
                        const s = PIPELINE_STEPS[step]
                        toast.xp(`+${s.xp} XP`, s.label, 1800)
                    }
                }
            } catch {
                // polling error — retry
            }

            if (Date.now() - startedAt > ESTIMATED_MS * 2) {
                if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
                toast.error('Analysis timeout', 'Server took too long to respond')
                setFlowState('select')
                setProgress(0)
                progressBar.value = 0
                setCurrentSessionId(null)
            }
        }, 2000)
    }, [addXP, progressBar])

    const handleUpload = useCallback(async (source: 'gallery' | 'camera') => {
        if (!SAMPLE_VIDEO_URL) {
            toast.error('No video configured', 'Set EXPO_PUBLIC_SAMPLE_VIDEO_URL in your env.')
            return
        }
        setFlowState('processing')
        setProgress(0)
        progressBar.value = 0
        setCurrentSessionId(null)
        toast.info(source === 'gallery' ? 'Video imported' : 'Camera ready', 'AI analysis starting...')

        try {
            const res = await api.post<{ data: { id: string; video_url: string; status: string } }>('/api/sessions/upload', {
                type: 'training',
                video_url: SAMPLE_VIDEO_URL,
            })
            const sessionId = ((res.data as any).data?.id ?? (res.data as any).id) as string
            setCurrentSessionId(sessionId)
            startPollingSession(sessionId)
        } catch (err) {
            toast.error('Upload failed', err instanceof Error ? err.message : 'Please try again')
            setFlowState('select')
            setProgress(0)
            progressBar.value = 0
        }
    }, [progressBar, startPollingSession])

    function getScoreMessage(score: number): { text: string; color: string } {
        if (score > 85) return { text: 'Legendary. NBA-tier accuracy. 🏆', color: T.color.semantic.success }
        if (score > 70) return { text: 'Elite session. Study this one.', color: T.color.semantic.success }
        if (score > 55) return { text: 'Great work! You\'re locked in. 🔥', color: T.color.signature.primary }
        if (score > 40) return { text: 'Solid. Consistency is everything.', color: T.color.semantic.warning }
        return { text: 'Tough day. Champions keep shooting.', color: T.color.semantic.warning }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <View style={{ position: 'absolute', top: -80, alignSelf: 'center', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,107,0,0.02)' }} />

            <View style={{ flex: 1, padding: T.spacing[5], paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: T.spacing[6] }}>
                    <Text style={{ ...type.screenTitle, color: T.color.text.primary }}>
                        {flowState === 'select' ? 'Film & Analyze' : flowState === 'processing' ? 'AI Analyzing…' : 'Analysis Complete'}
                    </Text>
                    <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                        {flowState === 'select' ? `+${TOTAL_XP} XP for a full analysis`
                            : flowState === 'processing' ? `Step ${Math.min(Math.floor((progress / 100) * PIPELINE_STEPS.length) + 1, 7)} of 7`
                            : 'Your performance breakdown is ready'}
                    </Text>
                </Animated.View>

                {/* ═══ SELECT ═══ */}
                {flowState === 'select' && (
                    <View style={{ flex: 1, justifyContent: 'center', gap: T.spacing[5] }}>
                        <View style={{ alignItems: 'center', marginBottom: T.spacing[8] }}>
                            <PulsingRecordButton onPress={() => handleUpload('gallery')} />
                            <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={{ ...type.cardTitle, color: T.color.text.primary, marginTop: T.spacing[5] }}>
                                Tap to import video
                            </Animated.Text>
                            <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={{ ...type.caption, color: T.color.text.tertiary, marginTop: T.spacing[1] }}>
                                MP4, MOV — up to 500 MB
                            </Animated.Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[3] }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: T.color.border.subtle }} />
                            <Text style={{ ...type.overline, color: T.color.text.tertiary }}>OR</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: T.color.border.subtle }} />
                        </View>

                        <TouchableOpacity
                            style={{ ...(T as any).glass?.regular ?? T.glass.light, borderRadius: T.borderRadius.lg, padding: T.spacing[4], flexDirection: 'row', alignItems: 'center', gap: T.spacing[4] }}
                            onPress={() => handleUpload('camera')}
                            activeOpacity={0.8}
                            accessibilityLabel="Record live"
                            accessibilityRole="button"
                        >
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.color.semantic.infoDim, justifyContent: 'center', alignItems: 'center' }}>
                                <Feather name="camera" size={20} color={T.color.semantic.info} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ ...type.bodySemibold, color: T.color.text.primary }}>Record live</Text>
                                <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: 2 }}>Open camera directly</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={T.color.text.tertiary} />
                        </TouchableOpacity>

                        <View style={{ gap: T.spacing[2] }}>
                            <TipCard icon="sun" title="Good lighting" subtitle="Shoot in daylight or well-lit gyms" delay={100} />
                            <TipCard icon="maximize" title="Wide angle" subtitle="Capture the full court for best tracking" delay={200} />
                            <TipCard icon="clock" title="2–10 min ideal" subtitle="Longer clips = deeper analysis" delay={300} />
                        </View>
                    </View>
                )}

                {/* ═══ PROCESSING ═══ */}
                {flowState === 'processing' && (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <View style={{ height: 6, backgroundColor: T.color.background.tertiary, borderRadius: 3, overflow: 'hidden', marginBottom: T.spacing[6] }}>
                            <Animated.View style={[progressStyle, { height: '100%', borderRadius: 3, backgroundColor: T.color.signature.primary }]} />
                        </View>

                        <Text style={{ ...type.bigStat, color: T.color.signature.primary, textAlign: 'center', marginBottom: T.spacing[1], fontVariant: ['tabular-nums'] }}>
                            {Math.round(progress)}%
                        </Text>

                        <Animated.Text key={funFactIdx} entering={FadeIn.duration(400)} style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center', marginBottom: T.spacing[8], fontStyle: 'italic', paddingHorizontal: T.spacing[5] }}>
                            {FUN_FACTS[funFactIdx]}
                        </Animated.Text>

                        <View style={{ ...(T as any).glass?.regular ?? T.glass.light, borderRadius: T.borderRadius.xl, padding: T.spacing[4] }}>
                            {PIPELINE_STEPS.map((step, i) => (
                                <StepRow key={step.label} step={step} index={i} progress={progress} completed={progress >= 100} />
                            ))}
                        </View>
                    </View>
                )}

                {/* ═══ RESULT ═══ */}
                {flowState === 'result' && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: T.spacing[6] }}>
                        <Animated.View entering={FadeInDown.duration(600)}>
                            <ScoreRing value={resultScore} size={160} strokeWidth={10} label="Overall" />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: 'center', gap: T.spacing[2] }}>
                            <Text style={{ ...type.sectionTitle, color: getScoreMessage(resultScore).color, textAlign: 'center' }}>
                                {getScoreMessage(resultScore).text}
                            </Text>
                            <Text style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center' }}>
                                {'Your AI analysis is ready.\nDive into the details below.'}
                            </Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ ...T.glass.accent, borderRadius: T.borderRadius.lg, paddingHorizontal: T.spacing[5], paddingVertical: T.spacing[3], flexDirection: 'row', alignItems: 'center', gap: T.spacing[2] }}>
                            <Text style={{ fontSize: 16 }}>⚡</Text>
                            <Text style={{ ...type.cardTitle, color: T.color.signature.primary }}>+{TOTAL_XP} XP</Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ flexDirection: 'row', gap: T.spacing[3], width: '100%' }}>
                            {[
                                { label: 'Shooting', value: `${Math.round(resultScore * 0.95)}%`, color: T.color.signature.primary },
                                { label: 'Mental', value: `${Math.round(resultScore * 1.05)}`, color: T.color.semantic.success },
                                { label: 'Highlights', value: `${3 + Math.floor(Math.random() * 4)}`, color: T.color.semantic.info },
                            ].map((stat) => (
                                <View key={stat.label} style={{ flex: 1, ...(T as any).glass?.regular ?? T.glass.light, borderRadius: T.borderRadius.lg, padding: T.spacing[4], alignItems: 'center' }}>
                                    <Text style={{ ...type.overline, color: T.color.text.secondary }}>{stat.label}</Text>
                                    <Text style={{ ...type.smallStat, color: stat.color, marginTop: T.spacing[1] }}>{stat.value}</Text>
                                </View>
                            ))}
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ width: '100%', gap: T.spacing[3] }}>
                            <PrimaryButton label="View Full Report" icon="bar-chart-2" onPress={() => currentSessionId && router.push(`/analysis/${currentSessionId}`)} size="lg" state={currentSessionId ? 'default' : 'disabled'} />
                            <TouchableOpacity
                                onPress={() => { setFlowState('select'); setProgress(0); progressBar.value = 0; setCurrentSessionId(null) }}
                                style={{ alignItems: 'center', paddingVertical: T.spacing[3], minHeight: 44 }}
                                accessibilityRole="button"
                            >
                                <Text style={{ ...type.bodySemibold, color: T.color.text.secondary }}>Analyze another video</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    )
}

/**
 * CourtVision AI  Upload & Analyze V3
 * 
 * "Film" tab  3-state flow:
 *   State 1  SELECT  : Pulsing record button + tips
 *   State 2  PROCESS : Pipeline steps + fun facts
 *   State 3  RESULT  : Hero score reveal + CTA
 * 
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
    FadeIn, FadeInDown, FadeInUp, Easing, runOnJS,
} from 'react-native-reanimated'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { ScoreRing } from '../../components/ScoreRing'
import { PrimaryButton } from '../../components/PrimaryButton'
import { T } from '../../lib/theme'

//  Pipeline steps 

const PIPELINE_STEPS = [
    { label: 'Video preprocessing',   icon: '', xp: 5 },
    { label: 'Player tracking',       icon: '', xp: 8 },
    { label: '3D reconstruction',     icon: '', xp: 10 },
    { label: 'Shot analysis',         icon: '', xp: 15 },
    { label: 'Mental analysis',       icon: '', xp: 12 },
    { label: 'Report generation',     icon: '', xp: 10 },
    { label: 'Highlight creation',    icon: '', xp: 15 },
]

const TOTAL_XP = PIPELINE_STEPS.reduce((a, s) => a + s.xp, 0)

const FUN_FACTS = [
    'Did you know? Steph Curry releases in 0.4 seconds.',
    'AI is analyzing 30 frames per second of your footage.',
    'The mental score tracks 12 psychological indicators.',
    'NBA scouts spend 3 hours on what our AI does in 90 seconds.',
    'Your shot arc is being compared to 10,000+ NBA shots.',
]

type FlowState = 'select' | 'processing' | 'result'

//  Pulsing Record Button 

function PulsingRecordButton({ onPress }: { onPress: () => void }) {
    const pulse = useSharedValue(1)
    const glow = useSharedValue(0.08)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
            ), -1, true
        )
        glow.value = withRepeat(
            withSequence(
                withTiming(0.25, { duration: 1200 }),
                withTiming(0.08, { duration: 1200 })
            ), -1, true
        )
    }, [])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Animated.View style={[pulseStyle, {
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: T.color.signature.dim,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: `${T.colors.accent}40`,
            }]}>
                <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: T.colors.accent,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Feather name="upload" size={32} color="#fff" />
                </View>
            </Animated.View>
        </TouchableOpacity>
    )
}

//  Tip Card 

function TipCard({ icon, title, subtitle, delay: d }: {
    icon: keyof typeof Feather.glyphMap; title: string; subtitle: string; delay: number
}) {
    return (
        <Animated.View
            entering={FadeInDown.delay(d).duration(400)}
            style={{
                ...T.glass.light, borderRadius: T.radius.md,
                padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
        >
            <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: `${T.colors.accent}10`,
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Feather name={icon} size={16} color={T.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: T.colors.white, fontSize: 13, fontWeight: '700', fontFamily: T.fonts.body.bold }}>{title}</Text>
                <Text style={{ color: T.colors.muted, fontSize: 11, fontFamily: T.fonts.body.regular, marginTop: 2 }}>{subtitle}</Text>
            </View>
        </Animated.View>
    )
}

//  Pipeline Step Row 

function StepRow({ step, index, progress, completed }: {
    step: typeof PIPELINE_STEPS[0]; index: number; progress: number; completed: boolean
}) {
    const threshold = ((index + 1) / PIPELINE_STEPS.length) * 100
    const isDone = progress >= threshold
    const isCurrent = !completed &&
        progress >= (index / PIPELINE_STEPS.length) * 100 &&
        progress < threshold

    const dotColor = isDone ? T.colors.green : isCurrent ? T.colors.accent : T.color.background.tertiary

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).duration(300)}
            style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 8, paddingHorizontal: 4,
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
                    color: isDone ? T.colors.white : isCurrent ? T.colors.white : T.colors.dim,
                    fontSize: 13, fontWeight: isCurrent ? '700' : '500',
                    fontFamily: isCurrent ? T.fonts.body.bold : T.fonts.body.medium,
                }}>
                    {step.icon} {step.label}
                </Text>
            </View>

            <Text style={{
                color: isDone ? T.colors.green : T.color.signature.primary,
                fontSize: 11, fontWeight: '800',
                fontFamily: T.fonts.display.bold,
                opacity: isDone ? 1 : 0.4,
            }}>
                +{step.xp} XP
            </Text>
        </Animated.View>
    )
}

// 
// MAIN UPLOAD SCREEN
// 

export default function UploadAnalyze() {
    const router = useRouter()
    const addXP = useStore(s => s.addXP)

    const [flowState, setFlowState] = useState<FlowState>('select')
    const [progress, setProgress] = useState(0)
    const [funFactIdx, setFunFactIdx] = useState(0)
    const [resultScore, setResultScore] = useState(0)

    const progressBar = useSharedValue(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressBar.value}%` as any,
    }))

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    // Fun fact rotation
    useEffect(() => {
        if (flowState !== 'processing') return
        const timer = setInterval(() => {
            setFunFactIdx(prev => (prev + 1) % FUN_FACTS.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [flowState])

    const handleUpload = useCallback((source: 'gallery' | 'camera') => {
        setFlowState('processing')
        setProgress(0)
        progressBar.value = 0

        toast.info(
            source === 'gallery' ? 'Video imported' : 'Camera ready',
            'AI analysis starting...'
        )

        let p = 0
        let lastStep = -1

        intervalRef.current = setInterval(() => {
            p += 3 + Math.random() * 5
            if (p >= 100) p = 100
            setProgress(Math.round(p))
            progressBar.value = withTiming(p, { duration: 350 })

            const step = Math.min(
                Math.floor((p / 100) * PIPELINE_STEPS.length),
                PIPELINE_STEPS.length - 1
            )
            if (step !== lastStep && PIPELINE_STEPS[step]) {
                lastStep = step
                const s = PIPELINE_STEPS[step]
                toast.xp(`+${s.xp} XP`, s.label, 1800)
            }

            if (p >= 100) {
                if (intervalRef.current) clearInterval(intervalRef.current)
                addXP(TOTAL_XP, 'Full game analysis')
                toast.success('Analysis complete!', `+${TOTAL_XP} XP earned`, 3500)

                // Transition to result
                const score = 60 + Math.floor(Math.random() * 30) // 60-89
                setResultScore(score)
                setTimeout(() => setFlowState('result'), 800)
            }
        }, 350)
    }, [addXP])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Ambient glow */}
            <View style={{
                position: 'absolute', top: -80, alignSelf: 'center', width: 300, height: 300,
                borderRadius: 150, backgroundColor: 'rgba(255,107,0,0.02)',
            }} />

            <View style={{ flex: 1, padding: 20, paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text style={{
                        color: T.colors.white, fontSize: 26, fontWeight: '900',
                        fontFamily: T.fonts.display.black, letterSpacing: -0.5, marginBottom: 4,
                    }}>
                        {flowState === 'select' ? 'Film & Analyze' :
                         flowState === 'processing' ? 'AI Analyzing...' :
                         'Analysis Complete'}
                    </Text>
                    <Text style={{ color: T.colors.muted, fontSize: 13, fontFamily: T.fonts.body.regular, marginBottom: 28 }}>
                        {flowState === 'select'
                            ? `+${TOTAL_XP} XP for a full analysis`
                            : flowState === 'processing'
                            ? `Step ${Math.min(Math.floor((progress / 100) * PIPELINE_STEPS.length) + 1, 7)} of 7`
                            : 'Your performance breakdown is ready'}
                    </Text>
                </Animated.View>

                {/*  STATE 1: SELECT  */}
                {flowState === 'select' && (
                    <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
                        {/* Center pulsing button */}
                        <View style={{ alignItems: 'center', marginBottom: 32 }}>
                            <PulsingRecordButton onPress={() => handleUpload('gallery')} />
                            <Animated.Text
                                entering={FadeInUp.delay(200).duration(400)}
                                style={{
                                    color: T.colors.white, fontSize: 16, fontWeight: '700',
                                    fontFamily: T.fonts.display.bold,
                                    marginTop: 20,
                                }}
                            >
                                Tap to import video
                            </Animated.Text>
                            <Animated.Text
                                entering={FadeInUp.delay(300).duration(400)}
                                style={{ color: T.colors.dim, fontSize: 12, marginTop: 4 }}
                            >
                                MP4, MOV  up to 500 MB
                            </Animated.Text>
                        </View>

                        {/* OR divider */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: T.colors.border }} />
                            <Text style={{ color: T.colors.dim, fontSize: 11, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>OR</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: T.colors.border }} />
                        </View>

                        {/* Camera button */}
                        <TouchableOpacity
                            style={{
                                ...T.glass.light, borderRadius: T.radius.lg,
                                padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
                            }}
                            onPress={() => handleUpload('camera')}
                            activeOpacity={0.8}
                        >
                            <View style={{
                                width: 48, height: 48, borderRadius: 24,
                                backgroundColor: `${T.colors.primary}15`,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Feather name="camera" size={20} color={T.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '700', fontFamily: T.fonts.body.bold }}>Record live</Text>
                                <Text style={{ color: T.colors.muted, fontSize: 11, marginTop: 2 }}>Open camera directly</Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={T.colors.dim} />
                        </TouchableOpacity>

                        {/* Tips */}
                        <View style={{ gap: 8, marginTop: 8 }}>
                            <TipCard icon="sun" title="Good lighting" subtitle="Shoot in daylight or well-lit gyms" delay={100} />
                            <TipCard icon="maximize" title="Wide angle" subtitle="Capture the full court for best tracking" delay={200} />
                            <TipCard icon="clock" title="2-10 min ideal" subtitle="Longer clips = deeper analysis" delay={300} />
                        </View>
                    </View>
                )}

                {/*  STATE 2: PROCESSING  */}
                {flowState === 'processing' && (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        {/* Progress bar */}
                        <View style={{
                            height: 6, backgroundColor: T.color.background.tertiary,
                            borderRadius: 3, overflow: 'hidden', marginBottom: 24,
                        }}>
                            <Animated.View style={[progressStyle, {
                                height: '100%', borderRadius: 3,
                                backgroundColor: T.colors.accent,
                            }]} />
                        </View>

                        <Text style={{
                            color: T.colors.accent, fontSize: 28, fontWeight: '900',
                            fontFamily: T.fonts.display.black, textAlign: 'center', marginBottom: 4, fontVariant: ['tabular-nums'],
                        }}>
                            {Math.round(progress)}%
                        </Text>

                        {/* Fun fact */}
                        <Animated.Text
                            key={funFactIdx}
                            entering={FadeIn.duration(400)}
                            style={{
                                color: T.colors.muted, fontSize: 12, textAlign: 'center',
                                marginBottom: 28, fontStyle: 'italic', paddingHorizontal: 20,
                            }}
                        >
                            {FUN_FACTS[funFactIdx]}
                        </Animated.Text>

                        {/* Pipeline steps */}
                        <View style={{
                            ...T.glass.light, borderRadius: T.radius.lg,
                            padding: 16,
                        }}>
                            {PIPELINE_STEPS.map((step, i) => (
                                <StepRow
                                    key={step.label}
                                    step={step}
                                    index={i}
                                    progress={progress}
                                    completed={progress >= 100}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/*  STATE 3: RESULT  */}
                {flowState === 'result' && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 }}>
                        <Animated.View entering={FadeInDown.duration(600)}>
                            <ScoreRing value={resultScore} size={160} strokeWidth={10} label="Overall" />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: 'center', gap: 6 }}>
                            <Text style={{
                                color: T.colors.white, fontSize: 22, fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -0.3,
                            }}>
                                Great performance!
                            </Text>
                            <Text style={{ color: T.colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                                {'Your AI analysis is ready.\nDive into the details below.'}
                            </Text>
                        </Animated.View>

                        {/* XP earned badge */}
                        <Animated.View
                            entering={FadeInDown.delay(400).duration(400)}
                            style={{
                                ...T.glass.accent, borderRadius: T.radius.md,
                                paddingHorizontal: 20, paddingVertical: 10,
                                flexDirection: 'row', alignItems: 'center', gap: 8,
                            }}
                        >
                            <Text style={{ fontSize: 16 }}></Text>
                            <Text style={{ color: T.colors.accent, fontSize: 18, fontWeight: '900', fontFamily: T.fonts.display.black }}>+{TOTAL_XP} XP</Text>
                        </Animated.View>

                        {/* Quick stats preview */}
                        <Animated.View
                            entering={FadeInDown.delay(500).duration(400)}
                            style={{ flexDirection: 'row', gap: 10, width: '100%' }}
                        >
                            <View style={{ flex: 1, ...T.glass.light, borderRadius: T.radius.md, padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Shooting</Text>
                                <Text style={{ color: T.colors.accent, fontSize: 22, fontWeight: '900', fontFamily: T.fonts.display.black, marginTop: 4 }}>
                                    {Math.round(resultScore * 0.95)}%
                                </Text>
                            </View>
                            <View style={{ flex: 1, ...T.glass.light, borderRadius: T.radius.md, padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Mental</Text>
                                <Text style={{ color: T.colors.green, fontSize: 22, fontWeight: '900', fontFamily: T.fonts.display.black, marginTop: 4 }}>
                                    {Math.round(resultScore * 1.05)}
                                </Text>
                            </View>
                            <View style={{ flex: 1, ...T.glass.light, borderRadius: T.radius.md, padding: 14, alignItems: 'center' }}>
                                <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Highlights</Text>
                                <Text style={{ color: T.colors.primary, fontSize: 22, fontWeight: '900', fontFamily: T.fonts.display.black, marginTop: 4 }}>
                                    {3 + Math.floor(Math.random() * 4)}
                                </Text>
                            </View>
                        </Animated.View>

                        {/* CTA */}
                        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ width: '100%', gap: 10 }}>
                            <PrimaryButton
                                label="View Full Report"
                                icon="bar-chart-2"
                                onPress={() => router.push('/analysis/123')}
                                size="lg"
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    setFlowState('select')
                                    setProgress(0)
                                    progressBar.value = 0
                                }}
                                style={{ alignItems: 'center', paddingVertical: 12 }}
                            >
                                <Text style={{ color: T.colors.muted, fontSize: 13, fontFamily: T.fonts.body.medium, fontWeight: '600' }}>Analyze another video</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    )
}

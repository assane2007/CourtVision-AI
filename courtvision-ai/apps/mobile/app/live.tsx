/**
 * CourtVision AI — Live Coach V4 REDESIGN
 * Real-time AI coaching during a game. Camera feed → frame analysis → alerts.
 *
 * Design rules: T.color.*, T.spacing, T.borderRadius, typePresets, glass V4, 4pt grid, 44px touch
 */
import {
    View, Text, TouchableOpacity,
    ScrollView, StatusBar, Vibration, Modal, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    SlideInDown,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    Easing,
} from 'react-native-reanimated'
import { useLiveCoach } from '../hooks/useLiveCoach'
import { LiveCamera } from '../components/workout/LiveCamera'
import { useStore } from '../lib/store'
import { XPBadge } from '../components/gamification/XPBadge'
import { T, typePresets, impact } from '../lib/theme'
import { CVHUDStat, CVHUDTimer, CVHUDFeedback } from '../components/ui'

const type = typePresets
const glass = T.glass

// ==========================================
// Constants
// ==========================================
const SHOT_ZONES = ['Paint', 'Mid-Range', '3-Pt', 'Floater']

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ==========================================
// MiniBar — animated thin bar (Reanimated v3)
// ==========================================
function MiniBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
    const width = useSharedValue(0)
    useEffect(() => {
        width.value = withTiming((value / max) * 100, { duration: 500 })
    }, [value])
    const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }))
    return (
        <View style={{ height: 4, backgroundColor: T.color.border.base, borderRadius: 2, overflow: 'hidden', flex: 1 }}>
            <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: color }, barStyle]} />
        </View>
    )
}

// ==========================================
// StatChip — glass stat card V4
// ==========================================
function StatChip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
    return (
        <View style={{
            flex: 1, borderRadius: T.borderRadius.lg,
            paddingVertical: T.spacing[3], paddingHorizontal: T.spacing[3], alignItems: 'center',
            ...(T.glass.thin),
        }}>
            <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 9, marginBottom: T.spacing[1] }}>
                {label}
            </Text>
            <Text style={{ ...type.mediumStat, color, fontSize: 24 }}>{value}</Text>
            {sub ? <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 10, marginTop: T.spacing[1] }}>{sub}</Text> : null}
        </View>
    )
}

// ==========================================
// AlertBanner — glass style V4
// ==========================================
function AlertBanner({ alert }: { alert: any }) {
    const sevColors: Record<string, string> = {
        info: T.color.semantic.info,
        warning: T.color.semantic.warning,
        critical: T.color.semantic.error,
    }
    const color = sevColors[alert.severity] ?? T.color.signature.primary

    return (
        <Animated.View
            entering={FadeInDown.duration(300).springify().damping(15)}
            style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: T.borderRadius.lg,
                padding: T.spacing[3], marginBottom: T.spacing[2],
                backgroundColor: `${color}10`,
                borderLeftWidth: 3, borderLeftColor: color,
                borderWidth: 1, borderRightColor: 'transparent',
                borderTopColor: 'transparent', borderBottomColor: 'transparent',
            }}
        >
            <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: color, marginRight: T.spacing[3],
                ...T.glow(color, 0.5),
            }} />
            <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13, flex: 1, lineHeight: 19 }}>
                {alert.message}
            </Text>
            <View style={{
                backgroundColor: `${color}20`, borderRadius: T.borderRadius.sm,
                paddingHorizontal: T.spacing[2], paddingVertical: T.spacing[1], marginLeft: T.spacing[2],
            }}>
                <Text style={{ ...type.overline, color, fontSize: 9 }}>
                    {alert.severity?.toUpperCase()}
                </Text>
            </View>
        </Animated.View>
    )
}

// ==========================================
// Mental Pulse Ring V4
// ==========================================
function MentalRing({ score }: { score: number }) {
    const color = T.ratingColor(score)
    const pulse = useSharedValue(1)
    const rotation = useSharedValue(0)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
            ), -1, true,
        )
        rotation.value = withRepeat(
            withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false,
        )
    }, [])

    const rotateStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }))
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[{
                position: 'absolute',
                width: 100, height: 100, borderRadius: 50,
                borderWidth: 1, borderColor: `${color}20`,
                borderTopColor: `${color}60`,
            }, rotateStyle]} />
            <Animated.View style={[{
                width: 90, height: 90, borderRadius: 45,
                backgroundColor: `${color}10`,
                borderWidth: 2.5, borderColor: `${color}50`,
                justifyContent: 'center', alignItems: 'center',
                ...T.glow(color, 0.3),
            }, pulseStyle]}>
                <Text style={{ ...type.mediumStat, color, fontSize: 28 }}>{score}</Text>
                <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 8, letterSpacing: 1 }}>MENTAL</Text>
            </Animated.View>
        </View>
    )
}

// ==========================================
// End Report Modal V4
// ==========================================
function EndReportModal({ visible, report, onClose }: { visible: boolean; report: any; onClose: () => void }) {
    if (!report) return null
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
                <ScrollView contentContainerStyle={{ padding: T.spacing[6] }}>
                    {/* Ambient glow */}
                    <View style={{
                        position: 'absolute', top: -80, alignSelf: 'center',
                        width: 200, height: 200, borderRadius: 100,
                        backgroundColor: T.color.signature.glow, opacity: 0.08,
                    }} />

                    {/* Header */}
                    <Animated.View entering={ZoomIn.duration(400)} style={{ alignItems: 'center', marginBottom: T.spacing[8] }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: T.color.signature.muted,
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: T.spacing[4], ...T.glow(T.color.signature.primary, 0.2),
                        }}>
                            <Feather name="award" size={38} color={T.color.signature.primary} />
                        </View>
                        <Text style={{ ...type.screenTitle, color: T.color.text.primary, textAlign: 'center' }}>
                            Session Complete
                        </Text>
                        <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[2] }}>
                            End of session report
                        </Text>
                    </Animated.View>

                    {/* Main stats */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={{ flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[5] }}>
                        <StatChip label="Mental" value={report.mentalScore ?? '--'} color={T.ratingColor(report.mentalScore ?? 0)} sub="/ 100" />
                        <StatChip label="Shooting" value={`${report.shootingPct ?? 0}%`} color={T.color.signature.primary} sub={`${report.makes ?? 0}/${report.attempts ?? 0}`} />
                        <StatChip label="Quarter" value={`Q${report.quarter ?? 1}`} color={T.color.semantic.warning} />
                    </Animated.View>

                    {/* Recommendations */}
                    {report.recommendations?.length > 0 && (
                        <View style={{ marginBottom: T.spacing[6] }}>
                            <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[3], fontSize: 18 }}>
                                AI Recommendations
                            </Text>
                            {report.recommendations.map((rec: string, i: number) => (
                                <Animated.View
                                    key={i}
                                    entering={FadeInDown.duration(300).delay(200 + i * 80)}
                                    style={{
                                        backgroundColor: 'rgba(255, 107, 0, 0.15)',
                                        borderWidth: 1, borderColor: 'rgba(255, 107, 0, 0.3)',
                                        borderRadius: T.borderRadius.lg, padding: T.spacing[4],
                                        marginBottom: T.spacing[2], flexDirection: 'row', alignItems: 'flex-start',
                                    }}
                                >
                                    <View style={{
                                        width: 20, height: 20, borderRadius: 10,
                                        backgroundColor: T.color.signature.muted,
                                        justifyContent: 'center', alignItems: 'center',
                                        marginRight: T.spacing[3], marginTop: 1,
                                    }}>
                                        <Text style={{ ...type.overline, color: T.color.signature.primary, fontSize: 11 }}>
                                            {i + 1}
                                        </Text>
                                    </View>
                                    <Text style={{ ...type.body, color: T.color.text.primary, flex: 1 }}>
                                        {rec}
                                    </Text>
                                </Animated.View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={{
                            backgroundColor: T.color.signature.primary,
                            paddingVertical: T.spacing[4], borderRadius: T.borderRadius.full,
                            alignItems: 'center', ...T.glow(T.color.signature.primary, 0.3),
                            minHeight: 52,
                        }}
                        onPress={() => { impact.light(); onClose(); }}
                        activeOpacity={0.85}
                    >
                        <Text style={{ ...type.cardTitle, color: T.color.background.primary }}>
                            Back to Dashboard
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}

// ==========================================
// Main Screen V4
// ==========================================
export default function LiveCoachScreen() {
    const router = useRouter()
    const addXP = useStore(s => s.addXP)
    const sessionId = useRef(`session_${Date.now()}`).current
    const live = useLiveCoach(sessionId)
    const [showZonePicker, setShowZonePicker] = useState(false)
    const [pendingOutcome, setPendingOutcome] = useState<'made' | 'missed' | null>(null)
    const [showEndReport, setShowEndReport] = useState(false)
    const [cameraVisible, setCameraVisible] = useState(true)
    const [xpPopup, setXpPopup] = useState<{ amount: number; label: string } | null>(null)

    // XP award on session end
    const xpAwarded = useRef(false)
    useEffect(() => {
        if (live.phase === 'ended' && live.endReport && !xpAwarded.current) {
            xpAwarded.current = true
            const totalShots = live.makeCount + live.missCount
            const baseXP = 30
            const shotXP = Math.min(totalShots * 2, 60)
            const mentalXP = live.mentalScore >= 75 ? 20 : live.mentalScore >= 50 ? 10 : 0
            const totalXP = baseXP + shotXP + mentalXP

            addXP(totalXP, 'Live Coach session')
            setXpPopup({ amount: totalXP, label: 'Session complete!' })
            setShowEndReport(true)
        }
    }, [live.phase, live.endReport])

    const handleShotPress = useCallback((outcome: 'made' | 'missed') => {
        impact.light()
        setPendingOutcome(outcome)
        setShowZonePicker(true)
    }, [])

    const handleZoneSelect = useCallback(async (zone: string) => {
        setShowZonePicker(false)
        if (pendingOutcome) {
            if (pendingOutcome === 'made') impact.success()
            else impact.heavy()
            try {
                await live.recordShot(pendingOutcome, zone as any)
            } catch (err) {
                console.warn('[LiveCoach] Shot recording failed:', err)
            }
        }
        setPendingOutcome(null)
    }, [pendingOutcome, live.recordShot])

    const handleClose = useCallback(async () => {
        impact.light()
        if (live.phase === 'active' || live.phase === 'break') {
            try { await live.end() } catch { router.back() }
        } else {
            router.back()
        }
    }, [live.phase, live.end, router])

    const handleEndReport = useCallback(() => {
        setShowEndReport(false)
        live.reset()
        xpAwarded.current = false
        router.back()
    }, [live.reset, router])

    const isActive = live.phase === 'active'
    const isIdle = live.phase === 'idle'

    return (
        <View style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <StatusBar barStyle="light-content" />

            {/* XP Popup */}
            {xpPopup && (
                <View style={{ position: 'absolute', zIndex: 9999, left: 0, right: 0, top: '30%', alignItems: 'center' }}>
                    <XPBadge amount={xpPopup.amount} label={xpPopup.label} onDone={() => setXpPopup(null)} />
                </View>
            )}

            {/* ======= Camera Zone ======= */}
            <View style={{ height: '38%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                <View style={{
                    position: 'absolute', bottom: -50, left: '25%',
                    width: 200, height: 100, borderRadius: 100,
                    backgroundColor: isActive ? `${T.color.semantic.error}08` : `${T.color.signature.primary}08`,
                    zIndex: 0,
                }} />

                {cameraVisible && (isActive || live.phase === 'break') ? (
                    <LiveCamera active={isActive} quarter={live.quarter} onFrame={live.sendFrame} compact={false} />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {isIdle ? (
                            <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                                <View style={{
                                    width: 80, height: 80, borderRadius: 40,
                                    backgroundColor: T.color.signature.muted,
                                    justifyContent: 'center', alignItems: 'center',
                                    ...T.glow(T.color.signature.primary, 0.15),
                                }}>
                                    <Feather name="radio" size={38} color={`${T.color.signature.primary}60`} />
                                </View>
                                <Text style={{
                                    ...type.cardTitle, color: `${T.color.signature.primary}80`, marginTop: T.spacing[3],
                                    fontSize: 13,
                                }}>
                                    Ready to analyze
                                </Text>
                            </Animated.View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Feather name="radio" size={38} color={T.color.signature.primary} />
                                <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[3] }}>
                                    {live.phase === 'connecting' ? 'Connecting...' : 'Session paused'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Header Overlay — HUD */}
                <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
                    <Animated.View
                        entering={FadeInDown.duration(400)}
                        style={{
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            paddingHorizontal: T.spacing[4], paddingTop: T.spacing[3],
                        }}
                    >
                        {/* Close */}
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.5)', padding: T.spacing[3], borderRadius: T.borderRadius.full,
                                borderWidth: 1, borderColor: T.color.border.base,
                                width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
                            }}
                            accessibilityLabel="Close Live Coach"
                        >
                            <Feather name="x" size={22} color="#FFF" />
                        </TouchableOpacity>

                        {/* Timer + Quarter */}
                        <CVHUDTimer
                            seconds={live.elapsedTime}
                            active={isActive}
                        />

                        {/* SSE Status */}
                        <CVHUDStat
                            label="Stream"
                            value={live.sseConnected ? 'LIVE' : 'OFF'}
                            color={live.sseConnected ? T.color.semantic.success : T.color.text.tertiary}
                        />
                    </Animated.View>
                </SafeAreaView>
            </View>

            {/* ======= Main Panel ======= */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: T.spacing[4], paddingBottom: Platform.OS === 'ios' ? T.spacing[10] : T.spacing[8] }}
                showsVerticalScrollIndicator={false}
            >
                {/* ======= Idle State ======= */}
                {isIdle && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingVertical: T.spacing[6] }}>
                        <Text style={{ ...type.screenTitle, color: T.color.text.primary, marginBottom: T.spacing[2] }}>
                            Live Coach
                        </Text>
                        <Text style={{
                            ...type.body, color: T.color.text.secondary, textAlign: 'center', marginBottom: T.spacing[8],
                        }}>
                            Start a session to receive{'\n'}real-time AI feedback.
                        </Text>

                        {/* Start button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.color.semantic.error,
                                paddingVertical: T.spacing[4], paddingHorizontal: T.spacing[12],
                                borderRadius: T.borderRadius.full,
                                flexDirection: 'row', alignItems: 'center', gap: T.spacing[3],
                                ...T.glow(T.color.semantic.error, 0.4),
                                minHeight: 56,
                            }}
                            onPress={() => { impact.medium(); live.start(); }}
                            activeOpacity={0.85}
                            accessibilityLabel="Start Live Coach"
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Feather name="radio" size={20} color="#FFF" />
                            </View>
                            <Text style={{ ...type.cardTitle, color: '#FFF', fontSize: 18 }}>
                                Start Session
                            </Text>
                        </TouchableOpacity>

                        {/* Features */}
                        <View style={{ marginTop: T.spacing[8], width: '100%', gap: T.spacing[3] }}>
                            {([
                                { icon: 'activity' as const, text: 'Real-time mental analysis' },
                                { icon: 'target' as const, text: 'Shot tracking & stats' },
                                { icon: 'zap' as const, text: 'Instant AI alerts & feedback' },
                            ]).map((feat, i) => (
                                <Animated.View
                                    key={i}
                                    entering={FadeInDown.duration(300).delay(200 + i * 80)}
                                    style={{
                                        ...(T.glass.thin),
                                        borderRadius: T.borderRadius.lg,
                                        padding: T.spacing[3], flexDirection: 'row', alignItems: 'center', gap: T.spacing[3],
                                    }}
                                >
                                    <Feather name={feat.icon} size={18} color={T.color.signature.primary} />
                                    <Text style={{ ...type.cardTitle, color: T.color.text.secondary, fontSize: 13 }}>
                                        {feat.text}
                                    </Text>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* ======= Connecting ======= */}
                {live.phase === 'connecting' && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingVertical: T.spacing[8] }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: T.color.signature.muted,
                            justifyContent: 'center', alignItems: 'center',
                            ...T.glow(T.color.signature.primary, 0.2),
                        }}>
                            <Feather name="radio" size={38} color={T.color.signature.primary} />
                        </View>
                        <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginTop: T.spacing[4] }}>
                            Connecting to AI server...
                        </Text>
                        <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[2] }}>
                            Initializing session
                        </Text>
                    </Animated.View>
                )}

                {/* ======= Active / Break ======= */}
                {(isActive || live.phase === 'break') && (
                    <>
                        {/* Stats Row */}
                        <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', gap: T.spacing[3], marginBottom: T.spacing[3] }}>
                            <MentalRing score={live.mentalScore} />
                            <View style={{ flex: 1, gap: T.spacing[2] }}>
                                <View style={{ flexDirection: 'row', gap: T.spacing[2] }}>
                                    <CVHUDStat
                                        label="Shots"
                                        value={`${live.makeCount}/${live.makeCount + live.missCount}`}
                                        subValue={`${live.shootingPct}%`}
                                        color={T.color.signature.primary}
                                    />
                                    <CVHUDStat
                                        label="Posture"
                                        value={`${Math.round(live.postureScore * 100)}`}
                                        subValue="/ 100"
                                        color={T.ratingColor(live.postureScore * 100)}
                                    />
                                </View>
                                {/* Fatigue */}
                                <View style={{
                                    ...(T.glass.thin),
                                    borderRadius: T.borderRadius.lg, padding: T.spacing[3],
                                    flexDirection: 'row', alignItems: 'center', gap: T.spacing[3],
                                }}>
                                    <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 10 }}>
                                        FATIGUE
                                    </Text>
                                    <MiniBar
                                        value={live.fatigueIndex}
                                        color={live.fatigueIndex > 70 ? T.color.semantic.error : live.fatigueIndex > 40 ? T.color.semantic.warning : T.color.semantic.success}
                                    />
                                    <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13, minWidth: 32, textAlign: 'right' }}>
                                        {live.fatigueIndex}%
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>

                        {/* AI Confidence */}
                        <View style={{
                            backgroundColor: 'rgba(255, 107, 0, 0.1)',
                            borderWidth: 1, borderColor: 'rgba(255, 107, 0, 0.25)',
                            borderRadius: T.borderRadius.lg, padding: T.spacing[3], marginBottom: T.spacing[3],
                            flexDirection: 'row', alignItems: 'center', gap: T.spacing[3],
                        }}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 16,
                                backgroundColor: T.color.signature.muted,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Feather name="cpu" size={14} color={T.color.signature.primary} />
                            </View>
                            <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 10 }}>
                                AI CONFIDENCE
                            </Text>
                            <MiniBar value={live.confidence * 100} color={T.color.signature.primary} />
                            <Text style={{ ...type.cardTitle, color: T.color.signature.primary, fontSize: 13, minWidth: 36, textAlign: 'right' }}>
                                {Math.round(live.confidence * 100)}%
                            </Text>
                        </View>

                        {/* Mental Trend */}
                        {live.mentalHistory.length > 1 && (
                            <Animated.View entering={FadeIn.duration(300)} style={{
                                ...(T.glass.thin),
                                borderRadius: T.borderRadius.lg, padding: T.spacing[3], marginBottom: T.spacing[3],
                            }}>
                                <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 9, marginBottom: T.spacing[3] }}>
                                    MENTAL TREND
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 3 }}>
                                    {live.mentalHistory.slice(-12).map((v, i, arr) => (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1, height: `${Math.max(12, v)}%`,
                                                borderRadius: T.borderRadius.sm, backgroundColor: T.ratingColor(v),
                                                opacity: 0.5 + (i / arr.length) * 0.5,
                                            }}
                                        />
                                    ))}
                                </View>
                            </Animated.View>
                        )}

                        {/* Shot Buttons */}
                        <View style={{ marginBottom: T.spacing[3] }}>
                            <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 9, marginBottom: T.spacing[3] }}>
                                RECORD A SHOT
                            </Text>
                            <View style={{ flexDirection: 'row', gap: T.spacing[3] }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: T.spacing[4], borderRadius: T.borderRadius.xl,
                                        backgroundColor: `${T.color.semantic.success}20`,
                                        borderWidth: 1.5, borderColor: `${T.color.semantic.success}40`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[2],
                                        minHeight: 52,
                                    }}
                                    onPress={() => handleShotPress('made')}
                                    activeOpacity={0.75}
                                >
                                    <Feather name="check-circle" size={22} color={T.color.semantic.success} />
                                    <Text style={{ ...type.cardTitle, color: T.color.semantic.success }}>
                                        Made
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: T.spacing[4], borderRadius: T.borderRadius.xl,
                                        backgroundColor: `${T.color.semantic.error}20`,
                                        borderWidth: 1.5, borderColor: `${T.color.semantic.error}40`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[2],
                                        minHeight: 52,
                                    }}
                                    onPress={() => handleShotPress('missed')}
                                    activeOpacity={0.75}
                                >
                                    <Feather name="x-circle" size={22} color={T.color.semantic.error} />
                                    <Text style={{ ...type.cardTitle, color: T.color.semantic.error }}>
                                        Missed
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Alerts Feed */}
                        {live.alerts.length > 0 && (
                            <View style={{ marginBottom: T.spacing[3] }}>
                                <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 9, marginBottom: T.spacing[3] }}>
                                    AI FEEDBACK
                                </Text>
                                {live.alerts.slice(0, 2).map((alert, i) => (
                                    <CVHUDFeedback
                                        key={`${i}-${alert.message}`}
                                        message={alert.message}
                                        type={alert.severity === 'critical' ? 'error' : alert.severity as any}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Quarter Controls */}
                        <View style={{
                            ...(T.glass.thin),
                            borderRadius: T.borderRadius.xl, padding: T.spacing[4], marginBottom: T.spacing[3],
                        }}>
                            <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 9, marginBottom: T.spacing[3] }}>
                                QUARTER · Q{live.quarter}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: T.spacing[2] }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: T.spacing[3], borderRadius: T.borderRadius.lg,
                                        backgroundColor: `${T.color.semantic.warning}20`,
                                        borderWidth: 1, borderColor: `${T.color.semantic.warning}30`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[2],
                                        minHeight: 44,
                                    }}
                                    onPress={() => { impact.light(); live.endQuarter(); }}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="pause" size={14} color={T.color.semantic.warning} />
                                    <Text style={{ ...type.cardTitle, color: T.color.semantic.warning, fontSize: 13 }}>
                                        Break
                                    </Text>
                                </TouchableOpacity>

                                {live.phase === 'break' && (
                                    <TouchableOpacity
                                        style={{
                                            flex: 1, paddingVertical: T.spacing[3], borderRadius: T.borderRadius.lg,
                                            backgroundColor: T.color.signature.muted,
                                            borderWidth: 1, borderColor: `${T.color.signature.primary}30`,
                                            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[2],
                                            minHeight: 44,
                                        }}
                                        onPress={() => { impact.light(); live.nextQuarter(); }}
                                        activeOpacity={0.8}
                                    >
                                        <Feather name="play" size={14} color={T.color.signature.primary} />
                                        <Text style={{ ...type.cardTitle, color: T.color.signature.primary, fontSize: 13 }}>
                                            Q{live.quarter + 1}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: T.spacing[3], borderRadius: T.borderRadius.lg,
                                        backgroundColor: `${T.color.semantic.error}20`,
                                        borderWidth: 1, borderColor: `${T.color.semantic.error}30`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[2],
                                        minHeight: 44,
                                    }}
                                    onPress={() => { impact.medium(); live.end(); }}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="square" size={14} color={T.color.semantic.error} />
                                    <Text style={{ ...type.cardTitle, color: T.color.semantic.error, fontSize: 13 }}>
                                        End Game
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Inline error */}
                        {live.error && (
                            <View style={{
                                ...(T.glass.thin),
                                borderRadius: T.borderRadius.lg, padding: T.spacing[3], marginBottom: T.spacing[3],
                                borderColor: `${T.color.semantic.error}30`,
                                flexDirection: 'row', alignItems: 'center',
                            }}>
                                <Feather name="alert-triangle" size={18} color={T.color.semantic.error} style={{ marginRight: T.spacing[3] }} />
                                <Text style={{ ...type.caption, color: T.color.semantic.error, flex: 1 }}>
                                    {live.error}
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Error Phase */}
                {live.phase === 'error' && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingVertical: T.spacing[8] }}>
                        <View style={{
                            width: 72, height: 72, borderRadius: 36,
                            backgroundColor: `${T.color.semantic.error}20`,
                            justifyContent: 'center', alignItems: 'center', marginBottom: T.spacing[4],
                        }}>
                            <Feather name="wifi-off" size={32} color={T.color.semantic.error} />
                        </View>
                        <Text style={{ ...type.sectionTitle, color: T.color.text.primary }}>
                            Connection Lost
                        </Text>
                        <Text style={{
                            ...type.body, color: T.color.text.secondary, marginTop: T.spacing[2],
                            textAlign: 'center',
                        }}>
                            {live.error ?? 'Unable to connect to the AI server.'}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.color.signature.primary, borderRadius: T.borderRadius.lg,
                                paddingHorizontal: T.spacing[8], paddingVertical: T.spacing[3], marginTop: T.spacing[6],
                                ...T.glow(T.color.signature.primary, 0.2),
                                minHeight: 48, justifyContent: 'center',
                            }}
                            onPress={live.reset}
                        >
                            <Text style={{ ...type.cardTitle, color: T.color.background.primary }}>
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>

            {/* ======= Zone Picker Modal ======= */}
            <Modal visible={showZonePicker} transparent animationType="none">
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => { setShowZonePicker(false); setPendingOutcome(null) }}
                >
                    <Animated.View
                        entering={SlideInDown.duration(300).damping(18)}
                        style={{
                            backgroundColor: T.color.background.tertiary,
                            borderTopLeftRadius: T.borderRadius['2xl'], borderTopRightRadius: T.borderRadius['2xl'],
                            padding: T.spacing[6], paddingBottom: Platform.OS === 'ios' ? T.spacing[10] : T.spacing[6],
                            borderTopWidth: 1, borderTopColor: T.color.border.base,
                        }}
                    >
                        <View style={{ width: 40, height: 4, backgroundColor: T.color.text.tertiary, borderRadius: 2, alignSelf: 'center', marginBottom: T.spacing[5] }} />
                        <Text style={{ ...type.sectionTitle, color: T.color.text.primary, textAlign: 'center', marginBottom: T.spacing[4] }}>
                            Shot Zone
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: T.spacing[3], justifyContent: 'center' }}>
                            {SHOT_ZONES.map(zone => {
                                const isMade = pendingOutcome === 'made'
                                const color = isMade ? T.color.semantic.success : T.color.semantic.error
                                return (
                                    <TouchableOpacity
                                        key={zone}
                                        style={{
                                            paddingHorizontal: T.spacing[6], paddingVertical: T.spacing[3],
                                            borderRadius: T.borderRadius.lg,
                                            borderWidth: 1.5, borderColor: `${color}40`,
                                            backgroundColor: `${color}10`,
                                            minHeight: 44, justifyContent: 'center',
                                        }}
                                        onPress={() => handleZoneSelect(zone.toLowerCase().replace('-', '_'))}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={{ ...type.cardTitle, color, fontSize: 14 }}>
                                            {zone}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                        <TouchableOpacity
                            style={{ marginTop: T.spacing[4], alignItems: 'center', padding: T.spacing[3], minHeight: 44 }}
                            onPress={() => handleZoneSelect('unspecified')}
                        >
                            <Text style={{ ...type.caption, color: T.color.text.secondary }}>
                                Unspecified zone
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* ======= End Report Modal ======= */}
            <EndReportModal
                visible={showEndReport}
                report={live.endReport ? {
                    mentalScore: live.mentalScore,
                    shootingPct: live.shootingPct,
                    makes: live.makeCount,
                    attempts: live.makeCount + live.missCount,
                    quarter: live.quarter,
                    recommendations: live.recommendations,
                } : null}
                onClose={handleEndReport}
            />
        </View>
    )
}

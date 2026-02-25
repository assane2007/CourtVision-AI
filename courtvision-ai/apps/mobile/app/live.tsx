/**
 * Live Coach Ã¢â‚¬â€ V3 Design
 * Real-time AI coaching during a game. Camera feed Ã¢â€ â€™ frame analysis Ã¢â€ â€™ alerts.
 * Reanimated v3, Feather icons, English, fontFamily applied.
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
import { LiveCamera } from '../components/LiveCamera'
import { useStore } from '../lib/store'
import { XPBadge } from '../components/XPBadge'
import { T } from '../lib/theme'

// Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const SHOT_ZONES = ['Paint', 'Mid-Range', '3-Pt', 'Floater']

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Ã¢â€â‚¬Ã¢â€â‚¬ MiniBar Ã¢â‚¬â€ animated thin bar (Reanimated v3) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function MiniBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
    const width = useSharedValue(0)
    useEffect(() => {
        width.value = withTiming((value / max) * 100, { duration: 500 })
    }, [value])
    const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }))
    return (
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
            <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: color }, barStyle]} />
        </View>
    )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ StatChip Ã¢â‚¬â€ glass stat card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function StatChip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
    return (
        <View style={{
            flex: 1, borderRadius: T.radius.md,
            paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center',
            ...T.glass.light,
        }}>
            <Text style={{
                color: T.colors.muted, fontSize: 9, marginBottom: 4,
                textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700',
                fontFamily: T.fonts.body.semibold,
            }}>
                {label}
            </Text>
            <Text style={{ color, fontSize: 24, fontWeight: '900', fontFamily: T.fonts.display.bold }}>{value}</Text>
            {sub ? <Text style={{ color: T.colors.dim, fontSize: 10, marginTop: 2, fontFamily: T.fonts.body.regular }}>{sub}</Text> : null}
        </View>
    )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ AlertBanner Ã¢â‚¬â€ glass style (Reanimated v3) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function AlertBanner({ alert }: { alert: any }) {
    const sevColors: Record<string, string> = {
        info: T.colors.accent,
        warning: T.colors.orange,
        critical: T.colors.red,
    }
    const color = sevColors[alert.severity] ?? T.colors.accent

    return (
        <Animated.View
            entering={FadeInDown.duration(300).springify().damping(15)}
            style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: T.radius.md,
                padding: 14, marginBottom: 8,
                backgroundColor: `${color}10`,
                borderLeftWidth: 3, borderLeftColor: color,
                borderWidth: 1, borderRightColor: 'transparent',
                borderTopColor: 'transparent', borderBottomColor: 'transparent',
            }}
        >
            <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: color, marginRight: 12,
                ...T.glow(color, 0.5),
            }} />
            <Text style={{ color: T.colors.white, fontSize: 13, flex: 1, lineHeight: 19, fontWeight: '500', fontFamily: T.fonts.body.medium }}>
                {alert.message}
            </Text>
            <View style={{
                backgroundColor: `${color}20`, borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8,
            }}>
                <Text style={{ color, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, fontFamily: T.fonts.display.bold }}>
                    {alert.severity?.toUpperCase()}
                </Text>
            </View>
        </Animated.View>
    )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Mental Pulse Ring (Reanimated v3) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function MentalRing({ score }: { score: number }) {
    const color = T.scoreColor(score)
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
                <Text style={{ color, fontSize: 28, fontWeight: '900', fontFamily: T.fonts.display.black }}>{score}</Text>
                <Text style={{ color: T.colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1, fontFamily: T.fonts.display.bold }}>MENTAL</Text>
            </Animated.View>
        </View>
    )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ End Report Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function EndReportModal({ visible, report, onClose }: { visible: boolean; report: any; onClose: () => void }) {
    if (!report) return null
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    {/* Ambient glow */}
                    <View style={{
                        position: 'absolute', top: -80, alignSelf: 'center',
                        width: 200, height: 200, borderRadius: 100,
                        backgroundColor: T.colors.accentGlow, opacity: 0.08,
                    }} />

                    {/* Header */}
                    <Animated.View entering={ZoomIn.duration(400)} style={{ alignItems: 'center', marginBottom: 28 }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: `${T.colors.accent}12`,
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: 16, ...T.glow(T.colors.accent, 0.2),
                        }}>
                            <Feather name="award" size={38} color={T.colors.accent} />
                        </View>
                        <Text style={{
                            color: T.colors.white, fontSize: 26, fontWeight: '900',
                            letterSpacing: -0.5, fontFamily: T.fonts.display.black,
                        }}>
                            Session Complete
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 14, marginTop: 6, fontFamily: T.fonts.body.regular }}>
                            End of session report
                        </Text>
                    </Animated.View>

                    {/* Main stats */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <StatChip label="Mental" value={report.mentalScore ?? '--'} color={T.scoreColor(report.mentalScore ?? 0)} sub="/ 100" />
                        <StatChip label="Shooting" value={`${report.shootingPct ?? 0}%`} color={T.colors.accent} sub={`${report.makes ?? 0}/${report.attempts ?? 0}`} />
                        <StatChip label="Quarter" value={`Q${report.quarter ?? 1}`} color={T.colors.orange} />
                    </Animated.View>

                    {/* Recommendations */}
                    {report.recommendations?.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{
                                color: T.colors.white, fontWeight: '800', fontSize: 16,
                                marginBottom: 12, letterSpacing: -0.3, fontFamily: T.fonts.display.bold,
                            }}>
                                AI Recommendations
                            </Text>
                            {report.recommendations.map((rec: string, i: number) => (
                                <Animated.View
                                    key={i}
                                    entering={FadeInDown.duration(300).delay(200 + i * 80)}
                                    style={{
                                        ...T.glass.accent,
                                        borderRadius: T.radius.md, padding: 16,
                                        marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start',
                                    }}
                                >
                                    <View style={{
                                        width: 20, height: 20, borderRadius: 10,
                                        backgroundColor: `${T.colors.accent}15`,
                                        justifyContent: 'center', alignItems: 'center',
                                        marginRight: 12, marginTop: 1,
                                    }}>
                                        <Text style={{ color: T.colors.accent, fontSize: 11, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                            {i + 1}
                                        </Text>
                                    </View>
                                    <Text style={{ color: T.colors.white, fontSize: 14, flex: 1, lineHeight: 21, fontFamily: T.fonts.body.regular }}>
                                        {rec}
                                    </Text>
                                </Animated.View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={{
                            backgroundColor: T.colors.accent,
                            paddingVertical: 17, borderRadius: T.radius.pill,
                            alignItems: 'center', ...T.glow(T.colors.accent, 0.3),
                        }}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: 17, fontFamily: T.fonts.display.bold }}>
                            Back to Dashboard
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main Screen Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        setPendingOutcome(outcome)
        setShowZonePicker(true)
    }, [])

    const handleZoneSelect = useCallback(async (zone: string) => {
        setShowZonePicker(false)
        if (pendingOutcome) {
            try {
                await live.recordShot(pendingOutcome, zone as any)
                Vibration.vibrate(pendingOutcome === 'made' ? 60 : [0, 80, 60, 80])
            } catch (err) {
                console.warn('[LiveCoach] Shot recording failed:', err)
            }
        }
        setPendingOutcome(null)
    }, [pendingOutcome, live.recordShot])

    const handleClose = useCallback(async () => {
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
        <View style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <StatusBar barStyle="light-content" />

            {/* XP Popup */}
            {xpPopup && (
                <View style={{ position: 'absolute', zIndex: 9999, left: 0, right: 0, top: '30%', alignItems: 'center' }}>
                    <XPBadge amount={xpPopup.amount} label={xpPopup.label} onDone={() => setXpPopup(null)} />
                </View>
            )}

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ Camera Zone Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <View style={{ height: '38%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                <View style={{
                    position: 'absolute', bottom: -50, left: '25%',
                    width: 200, height: 100, borderRadius: 100,
                    backgroundColor: isActive ? 'rgba(255,59,92,0.08)' : `${T.colors.accent}08`,
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
                                    backgroundColor: `${T.colors.accent}0F`,
                                    justifyContent: 'center', alignItems: 'center',
                                    ...T.glow(T.colors.accent, 0.15),
                                }}>
                                    <Feather name="radio" size={38} color={`${T.colors.accent}60`} />
                                </View>
                                <Text style={{
                                    color: `${T.colors.accent}80`, marginTop: 14,
                                    fontSize: 13, fontWeight: '600', fontFamily: T.fonts.body.medium,
                                }}>
                                    Ready to analyze
                                </Text>
                            </Animated.View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Feather name="radio" size={38} color={T.colors.accent} />
                                <Text style={{ color: T.colors.muted, marginTop: 12, fontSize: 13, fontFamily: T.fonts.body.regular }}>
                                    {live.phase === 'connecting' ? 'Connecting...' : 'Session paused'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Header Overlay Ã¢â‚¬â€ HUD */}
                <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
                    <Animated.View
                        entering={FadeInDown.duration(400)}
                        style={{
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            paddingHorizontal: 16, paddingTop: 10,
                        }}
                    >
                        {/* Close */}
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20,
                                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                            }}
                            accessibilityLabel="Close Live Coach"
                        >
                            <Feather name="x" size={22} color="#FFF" />
                        </TouchableOpacity>

                        {/* Timer + Quarter */}
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 18, paddingVertical: 10,
                            borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10,
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                        }}>
                            {isActive && (
                                <View style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    backgroundColor: T.colors.red,
                                    ...T.glow(T.colors.red, 0.6),
                                }} />
                            )}
                            <Text style={{
                                color: '#FFF', fontWeight: '800', fontSize: 16,
                                fontVariant: ['tabular-nums'], fontFamily: T.fonts.display.bold,
                            }}>
                                {formatTime(live.elapsedTime)}
                            </Text>
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                            }}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', fontFamily: T.fonts.display.semibold }}>
                                    Q{live.quarter}
                                </Text>
                            </View>
                        </View>

                        {/* SSE Status */}
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8,
                            borderRadius: 16, flexDirection: 'row', alignItems: 'center',
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                        }}>
                            <View style={{
                                width: 6, height: 6, borderRadius: 3,
                                backgroundColor: live.sseConnected ? T.colors.green : T.colors.dim,
                                marginRight: 6,
                                ...(live.sseConnected ? T.glow(T.colors.green, 0.5) : {}),
                            }} />
                            <Text style={{
                                color: live.sseConnected ? T.colors.green : T.colors.dim,
                                fontSize: 10, fontWeight: '800', letterSpacing: 1,
                                fontFamily: T.fonts.display.bold,
                            }}>
                                {live.sseConnected ? 'LIVE' : 'OFF'}
                            </Text>
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </View>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ Main Panel Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 30 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Ã¢â€â‚¬Ã¢â€â‚¬ Idle State Ã¢â€â‚¬Ã¢â€â‚¬ */}
                {isIdle && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <Text style={{
                            color: T.colors.white, fontSize: 24, fontWeight: '900',
                            marginBottom: 8, letterSpacing: -0.5, fontFamily: T.fonts.display.black,
                        }}>
                            Live Coach
                        </Text>
                        <Text style={{
                            color: T.colors.muted, fontSize: 14, textAlign: 'center',
                            lineHeight: 22, marginBottom: 32, fontFamily: T.fonts.body.regular,
                        }}>
                            Start a session to receive{'\n'}real-time AI feedback.
                        </Text>

                        {/* Start button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.colors.red,
                                paddingVertical: 18, paddingHorizontal: 52,
                                borderRadius: T.radius.pill,
                                flexDirection: 'row', alignItems: 'center', gap: 12,
                                ...T.glow(T.colors.red, 0.4),
                            }}
                            onPress={live.start}
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
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18, letterSpacing: 0.3, fontFamily: T.fonts.display.bold }}>
                                Start Session
                            </Text>
                        </TouchableOpacity>

                        {/* Features */}
                        <View style={{ marginTop: 36, width: '100%', gap: 10 }}>
                            {([
                                { icon: 'activity' as const, text: 'Real-time mental analysis' },
                                { icon: 'target' as const, text: 'Shot tracking & stats' },
                                { icon: 'zap' as const, text: 'Instant AI alerts & feedback' },
                            ]).map((feat, i) => (
                                <Animated.View
                                    key={i}
                                    entering={FadeInDown.duration(300).delay(200 + i * 80)}
                                    style={{
                                        ...T.glass.light,
                                        borderRadius: T.radius.md,
                                        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                                    }}
                                >
                                    <Feather name={feat.icon} size={18} color={T.colors.accent} />
                                    <Text style={{ color: T.colors.textSecondary, fontSize: 13, fontWeight: '500', fontFamily: T.fonts.body.medium }}>
                                        {feat.text}
                                    </Text>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Ã¢â€â‚¬Ã¢â€â‚¬ Connecting Ã¢â€â‚¬Ã¢â€â‚¬ */}
                {live.phase === 'connecting' && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingVertical: 30 }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: `${T.colors.accent}14`,
                            justifyContent: 'center', alignItems: 'center',
                            ...T.glow(T.colors.accent, 0.2),
                        }}>
                            <Feather name="radio" size={38} color={T.colors.accent} />
                        </View>
                        <Text style={{
                            color: T.colors.white, fontSize: 18, fontWeight: '800', marginTop: 16,
                            fontFamily: T.fonts.display.bold,
                        }}>
                            Connecting to AI server...
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 13, marginTop: 6, fontFamily: T.fonts.body.regular }}>
                            Initializing session
                        </Text>
                    </Animated.View>
                )}

                {/* Ã¢â€â‚¬Ã¢â€â‚¬ Active / Break Ã¢â€â‚¬Ã¢â€â‚¬ */}
                {(isActive || live.phase === 'break') && (
                    <>
                        {/* Stats Row */}
                        <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                            <MentalRing score={live.mentalScore} />
                            <View style={{ flex: 1, gap: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <StatChip
                                        label="Shots"
                                        value={`${live.makeCount}/${live.makeCount + live.missCount}`}
                                        color={T.colors.accent}
                                        sub={`${live.shootingPct}%`}
                                    />
                                    <StatChip
                                        label="Posture"
                                        value={`${Math.round(live.postureScore * 100)}`}
                                        color={T.scoreColor(live.postureScore * 100)}
                                        sub="/ 100"
                                    />
                                </View>
                                {/* Fatigue */}
                                <View style={{
                                    ...T.glass.light,
                                    borderRadius: T.radius.md, padding: 12,
                                    flexDirection: 'row', alignItems: 'center', gap: 10,
                                }}>
                                    <Text style={{
                                        color: T.colors.muted, fontSize: 10, fontWeight: '700',
                                        letterSpacing: 0.5, fontFamily: T.fonts.body.semibold,
                                    }}>
                                        FATIGUE
                                    </Text>
                                    <MiniBar
                                        value={live.fatigueIndex}
                                        color={live.fatigueIndex > 70 ? T.colors.red : live.fatigueIndex > 40 ? T.colors.orange : T.colors.green}
                                    />
                                    <Text style={{
                                        color: T.colors.white, fontSize: 13, fontWeight: '800',
                                        minWidth: 32, textAlign: 'right', fontFamily: T.fonts.display.bold,
                                    }}>
                                        {live.fatigueIndex}%
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>

                        {/* AI Confidence */}
                        <View style={{
                            ...T.glass.accent,
                            borderRadius: T.radius.md, padding: 12, marginBottom: 12,
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                        }}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 16,
                                backgroundColor: `${T.colors.accent}12`,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Feather name="cpu" size={14} color={T.colors.accent} />
                            </View>
                            <Text style={{ color: T.colors.muted, fontSize: 12, fontWeight: '600', fontFamily: T.fonts.body.medium }}>
                                AI Confidence
                            </Text>
                            <MiniBar value={live.confidence * 100} color={T.colors.accent} />
                            <Text style={{
                                color: T.colors.accent, fontSize: 13, fontWeight: '800',
                                minWidth: 36, textAlign: 'right', fontFamily: T.fonts.display.bold,
                            }}>
                                {Math.round(live.confidence * 100)}%
                            </Text>
                        </View>

                        {/* Mental Trend */}
                        {live.mentalHistory.length > 1 && (
                            <Animated.View entering={FadeIn.duration(300)} style={{
                                ...T.glass.light,
                                borderRadius: T.radius.md, padding: 14, marginBottom: 12,
                            }}>
                                <Text style={{
                                    color: T.colors.muted, fontSize: 9, marginBottom: 10,
                                    fontWeight: '800', letterSpacing: 1, fontFamily: T.fonts.display.bold,
                                }}>
                                    MENTAL TREND
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 3 }}>
                                    {live.mentalHistory.slice(-12).map((v, i, arr) => (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1, height: `${Math.max(12, v)}%`,
                                                borderRadius: 4, backgroundColor: T.scoreColor(v),
                                                opacity: 0.5 + (i / arr.length) * 0.5,
                                            }}
                                        />
                                    ))}
                                </View>
                            </Animated.View>
                        )}

                        {/* Shot Buttons */}
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{
                                color: T.colors.muted, fontSize: 9, marginBottom: 10,
                                fontWeight: '800', letterSpacing: 1, fontFamily: T.fonts.display.bold,
                            }}>
                                RECORD A SHOT
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 16, borderRadius: T.radius.lg,
                                        backgroundColor: `${T.colors.green}10`,
                                        borderWidth: 1.5, borderColor: `${T.colors.green}40`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                                    }}
                                    onPress={() => handleShotPress('made')}
                                    activeOpacity={0.75}
                                >
                                    <Feather name="check-circle" size={22} color={T.colors.green} />
                                    <Text style={{ color: T.colors.green, fontWeight: '800', fontSize: 16, fontFamily: T.fonts.display.bold }}>
                                        Made
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 16, borderRadius: T.radius.lg,
                                        backgroundColor: `${T.colors.red}10`,
                                        borderWidth: 1.5, borderColor: `${T.colors.red}40`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                                    }}
                                    onPress={() => handleShotPress('missed')}
                                    activeOpacity={0.75}
                                >
                                    <Feather name="x-circle" size={22} color={T.colors.red} />
                                    <Text style={{ color: T.colors.red, fontWeight: '800', fontSize: 16, fontFamily: T.fonts.display.bold }}>
                                        Missed
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Alerts Feed */}
                        {live.alerts.length > 0 && (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{
                                    color: T.colors.muted, fontSize: 9, marginBottom: 10,
                                    fontWeight: '800', letterSpacing: 1, fontFamily: T.fonts.display.bold,
                                }}>
                                    AI FEEDBACK
                                </Text>
                                {live.alerts.slice(0, 3).map((alert, i) => (
                                    <AlertBanner key={`${i}-${alert.message}`} alert={alert} />
                                ))}
                            </View>
                        )}

                        {/* Quarter Controls */}
                        <View style={{
                            ...T.glass.light,
                            borderRadius: T.radius.lg, padding: 16, marginBottom: 14,
                        }}>
                            <Text style={{
                                color: T.colors.muted, fontSize: 9, marginBottom: 12,
                                fontWeight: '800', letterSpacing: 1, fontFamily: T.fonts.display.bold,
                            }}>
                                QUARTER Ã¢â‚¬â€ Q{live.quarter}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 13, borderRadius: T.radius.md,
                                        backgroundColor: `${T.colors.orange}10`,
                                        borderWidth: 1, borderColor: `${T.colors.orange}30`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                                    }}
                                    onPress={live.endQuarter}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="pause" size={14} color={T.colors.orange} />
                                    <Text style={{ color: T.colors.orange, fontWeight: '700', fontSize: 13, fontFamily: T.fonts.body.semibold }}>
                                        Break
                                    </Text>
                                </TouchableOpacity>

                                {live.phase === 'break' && (
                                    <TouchableOpacity
                                        style={{
                                            flex: 1, paddingVertical: 13, borderRadius: T.radius.md,
                                            backgroundColor: `${T.colors.accent}10`,
                                            borderWidth: 1, borderColor: `${T.colors.accent}30`,
                                            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                                        }}
                                        onPress={live.nextQuarter}
                                        activeOpacity={0.8}
                                    >
                                        <Feather name="play" size={14} color={T.colors.accent} />
                                        <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: 13, fontFamily: T.fonts.body.semibold }}>
                                            Q{live.quarter + 1}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 13, borderRadius: T.radius.md,
                                        backgroundColor: `${T.colors.red}10`,
                                        borderWidth: 1, borderColor: `${T.colors.red}30`,
                                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                                    }}
                                    onPress={live.end}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="square" size={14} color={T.colors.red} />
                                    <Text style={{ color: T.colors.red, fontWeight: '700', fontSize: 13, fontFamily: T.fonts.body.semibold }}>
                                        End Game
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Inline error */}
                        {live.error && (
                            <View style={{
                                ...T.glass.light,
                                borderRadius: T.radius.md, padding: 14, marginBottom: 12,
                                borderColor: `${T.colors.red}30`,
                                flexDirection: 'row', alignItems: 'center',
                            }}>
                                <Feather name="alert-triangle" size={18} color={T.colors.red} style={{ marginRight: 10 }} />
                                <Text style={{ color: T.colors.red, fontSize: 13, flex: 1, fontFamily: T.fonts.body.regular }}>
                                    {live.error}
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Error Phase */}
                {live.phase === 'error' && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingVertical: 30 }}>
                        <View style={{
                            width: 72, height: 72, borderRadius: 36,
                            backgroundColor: `${T.colors.red}10`,
                            justifyContent: 'center', alignItems: 'center', marginBottom: 16,
                        }}>
                            <Feather name="wifi-off" size={32} color={T.colors.red} />
                        </View>
                        <Text style={{
                            color: T.colors.white, fontSize: 18, fontWeight: '800',
                            fontFamily: T.fonts.display.bold,
                        }}>
                            Connection Lost
                        </Text>
                        <Text style={{
                            color: T.colors.muted, fontSize: 13, marginTop: 8,
                            textAlign: 'center', lineHeight: 20, fontFamily: T.fonts.body.regular,
                        }}>
                            {live.error ?? 'Unable to connect to the AI server.'}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.colors.accent, borderRadius: T.radius.md,
                                paddingHorizontal: 32, paddingVertical: 14, marginTop: 24,
                                ...T.glow(T.colors.accent, 0.2),
                            }}
                            onPress={live.reset}
                        >
                            <Text style={{ color: T.colors.bg, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ Zone Picker Modal Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <Modal visible={showZonePicker} transparent animationType="none">
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => { setShowZonePicker(false); setPendingOutcome(null) }}
                >
                    <Animated.View
                        entering={SlideInDown.duration(300).damping(18)}
                        style={{
                            backgroundColor: T.colors.card,
                            borderTopLeftRadius: T.radius.xxl, borderTopRightRadius: T.radius.xxl,
                            padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                            borderTopWidth: 1, borderTopColor: T.colors.border,
                        }}
                    >
                        <View style={{ width: 40, height: 4, backgroundColor: T.colors.dimmer, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                        <Text style={{
                            color: T.colors.white, fontSize: 18, fontWeight: '800',
                            marginBottom: 18, textAlign: 'center', letterSpacing: -0.3,
                            fontFamily: T.fonts.display.bold,
                        }}>
                            Shot Zone
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                            {SHOT_ZONES.map(zone => {
                                const isMade = pendingOutcome === 'made'
                                const color = isMade ? T.colors.green : T.colors.red
                                return (
                                    <TouchableOpacity
                                        key={zone}
                                        style={{
                                            paddingHorizontal: 24, paddingVertical: 14,
                                            borderRadius: T.radius.md,
                                            borderWidth: 1.5, borderColor: `${color}40`,
                                            backgroundColor: `${color}10`,
                                        }}
                                        onPress={() => handleZoneSelect(zone.toLowerCase().replace('-', '_'))}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={{ color, fontWeight: '700', fontSize: 14, fontFamily: T.fonts.body.semibold }}>
                                            {zone}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                        <TouchableOpacity
                            style={{ marginTop: 18, alignItems: 'center', padding: 12 }}
                            onPress={() => handleZoneSelect('unspecified')}
                        >
                            <Text style={{ color: T.colors.muted, fontSize: 13, fontFamily: T.fonts.body.regular }}>
                                Unspecified zone
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ End Report Modal Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

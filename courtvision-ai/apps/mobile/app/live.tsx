import {
    View, Text, TouchableOpacity, Animated,
    ScrollView, StatusBar, Vibration, Modal, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { useLiveCoach } from '../hooks/useLiveCoach'
import { LiveCamera } from '../components/LiveCamera'
import { useStore } from '../lib/store'
import { XPBadge } from '../components/XPBadge'
import { T } from '../lib/theme'

// ==========================================
// Constants & Helpers
// ==========================================

const SHOT_ZONES = ['Paint', 'Mid-Range', '3-Pt', 'Floater']

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function scoreColor(v: number): string {
    return T.scoreColor(v)
}

// ==========================================
// MiniBar — animated thin bar
// ==========================================

function MiniBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, { toValue: value / max, duration: 500, useNativeDriver: false }).start()
    }, [value])
    return (
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
            <Animated.View style={{
                height: 4, borderRadius: 2, backgroundColor: color,
                width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }} />
        </View>
    )
}

// ==========================================
// StatChip — glass stat card
// ==========================================

function StatChip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
    return (
        <View style={{
            flex: 1, borderRadius: T.radius.md,
            paddingVertical: 14, paddingHorizontal: 12,
            alignItems: 'center',
            ...T.glass.light,
        }}>
            <Text style={{ color: T.colors.muted, fontSize: 9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' }}>
                {label}
            </Text>
            <Text style={{ color, fontSize: 24, fontWeight: '900' }}>{value}</Text>
            {sub ? <Text style={{ color: T.colors.dim, fontSize: 10, marginTop: 2 }}>{sub}</Text> : null}
        </View>
    )
}

// ==========================================
// AlertBanner — glass style
// ==========================================

function AlertBanner({ alert }: { alert: any }) {
    const fadeAnim = useRef(new Animated.Value(0)).current
    const translateX = useRef(new Animated.Value(-20)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        ]).start()
    }, [alert])

    const sevColors: Record<string, string> = {
        info: T.colors.accent,
        warning: T.colors.orange,
        critical: T.colors.red,
    }
    const color = sevColors[alert.severity] ?? T.colors.accent

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateX }],
            flexDirection: 'row', alignItems: 'center',
            borderRadius: T.radius.md,
            padding: 14, marginBottom: 8,
            backgroundColor: `${color}10`,
            borderLeftWidth: 3, borderLeftColor: color,
            borderWidth: 1, borderRightColor: 'transparent',
            borderTopColor: 'transparent', borderBottomColor: 'transparent',
        }}>
            <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: color, marginRight: 12,
                ...T.glow(color, 0.5),
            }} />
            <Text style={{ color: T.colors.white, fontSize: 13, flex: 1, lineHeight: 19, fontWeight: '500' }}>
                {alert.message}
            </Text>
            <View style={{
                backgroundColor: `${color}20`, borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8,
            }}>
                <Text style={{ color, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                    {alert.severity?.toUpperCase()}
                </Text>
            </View>
        </Animated.View>
    )
}

// ==========================================
// Mental Pulse Ring — futuristic
// ==========================================

function MentalRing({ score }: { score: number }) {
    const pulseAnim = useRef(new Animated.Value(1)).current
    const rotateAnim = useRef(new Animated.Value(0)).current
    const color = scoreColor(score)

    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.05, duration: 1400, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])).start()
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 6000, useNativeDriver: true })
        ).start()
    }, [])

    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer rotating ring */}
            <Animated.View style={{
                position: 'absolute',
                width: 100, height: 100, borderRadius: 50,
                borderWidth: 1, borderColor: `${color}20`,
                borderTopColor: `${color}60`,
                transform: [{ rotate }],
            }} />
            {/* Main ring */}
            <Animated.View style={{
                transform: [{ scale: pulseAnim }],
                width: 90, height: 90, borderRadius: 45,
                backgroundColor: `${color}10`,
                borderWidth: 2.5, borderColor: `${color}50`,
                justifyContent: 'center', alignItems: 'center',
                ...T.glow(color, 0.3),
            }}>
                <Text style={{ color, fontSize: 28, fontWeight: '900' }}>{score}</Text>
                <Text style={{ color: T.colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 }}>MENTAL</Text>
            </Animated.View>
        </View>
    )
}

// ==========================================
// End Report Modal — Premium
// ==========================================

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
                        backgroundColor: 'rgba(0,229,255,0.05)',
                    }} />

                    {/* Title */}
                    <View style={{ alignItems: 'center', marginBottom: 28 }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: 'rgba(0,229,255,0.08)',
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: 16,
                            ...T.glow(T.colors.accent, 0.2),
                        }}>
                            <Text style={{ fontSize: 38 }}>🏀</Text>
                        </View>
                        <Text style={{ color: T.colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>
                            Session terminée
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 14, marginTop: 6 }}>
                            Rapport de fin de session
                        </Text>
                    </View>

                    {/* Main stats */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <StatChip label="Mental" value={report.mentalScore ?? '--'} color={scoreColor(report.mentalScore ?? 0)} sub="/ 100" />
                        <StatChip label="Shooting" value={`${report.shootingPct ?? 0}%`} color={T.colors.accent} sub={`${report.makes ?? 0}/${report.attempts ?? 0}`} />
                        <StatChip label="Quarter" value={`Q${report.quarter ?? 1}`} color={T.colors.orange} />
                    </View>

                    {/* Recommendations */}
                    {report.recommendations?.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ color: T.colors.white, fontWeight: '800', fontSize: 16, marginBottom: 12, letterSpacing: -0.3 }}>
                                💡 Recommandations IA
                            </Text>
                            {report.recommendations.map((rec: string, i: number) => (
                                <View key={i} style={{
                                    ...T.glass.accent,
                                    borderRadius: T.radius.md, padding: 16,
                                    marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start',
                                }}>
                                    <View style={{
                                        width: 20, height: 20, borderRadius: 10,
                                        backgroundColor: `${T.colors.accent}15`,
                                        justifyContent: 'center', alignItems: 'center',
                                        marginRight: 12, marginTop: 1,
                                    }}>
                                        <Text style={{ color: T.colors.accent, fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>
                                    </View>
                                    <Text style={{ color: T.colors.white, fontSize: 14, flex: 1, lineHeight: 21 }}>{rec}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={{
                            backgroundColor: T.colors.accent,
                            paddingVertical: 17, borderRadius: T.radius.pill,
                            alignItems: 'center',
                            ...T.glow(T.colors.accent, 0.3),
                        }}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: 17 }}>
                            Retour au Dashboard
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}

// ==========================================
// Main Screen
// ==========================================

export default function LiveCoachScreen() {
    const router    = useRouter()
    const addXP     = useStore(s => s.addXP)
    const sessionId = useRef(`session_${Date.now()}`).current  // FIX: useRef to avoid re-creating on every render
    const live      = useLiveCoach(sessionId)
    const [showZonePicker, setShowZonePicker]   = useState(false)
    const [pendingOutcome, setPendingOutcome]   = useState<'made' | 'missed' | null>(null)
    const [showEndReport, setShowEndReport]     = useState(false)
    const [cameraVisible, setCameraVisible]     = useState(true)
    const [xpPopup, setXpPopup]                = useState<{ amount: number; label: string } | null>(null)

    const headerAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start()
    }, [])

    // Show end report modal when session ends + reward XP
    // FIX: Added ref to prevent double XP award
    const xpAwarded = useRef(false)
    useEffect(() => {
        if (live.phase === 'ended' && live.endReport && !xpAwarded.current) {
            xpAwarded.current = true
            const totalShots = live.makeCount + live.missCount
            const baseXP     = 30
            const shotXP     = Math.min(totalShots * 2, 60)
            const mentalXP   = live.mentalScore >= 75 ? 20 : live.mentalScore >= 50 ? 10 : 0
            const totalXP    = baseXP + shotXP + mentalXP

            addXP(totalXP, 'Session Coach Live')
            setXpPopup({ amount: totalXP, label: 'Session complétée !' })
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
                // FIX: Don't crash if recordShot fails
                console.warn('[LiveCoach] Shot recording failed:', err)
            }
        }
        setPendingOutcome(null)
    }, [pendingOutcome, live.recordShot])

    const handleClose = useCallback(async () => {
        if (live.phase === 'active' || live.phase === 'break') {
            try {
                await live.end()
            } catch {
                // FIX: Navigate back even if end() fails
                router.back()
            }
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
    const isIdle   = live.phase === 'idle'

    return (
        <View style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <StatusBar barStyle="light-content" />

            {/* XP Popup */}
            {xpPopup && (
                <View style={{ position: 'absolute', zIndex: 9999, left: 0, right: 0, top: '30%', alignItems: 'center' }}>
                    <XPBadge amount={xpPopup.amount} label={xpPopup.label} onDone={() => setXpPopup(null)} />
                </View>
            )}

            {/* ── Camera Zone ── */}
            <View style={{ height: '38%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                {/* Camera ambient glow */}
                <View style={{
                    position: 'absolute', bottom: -50, left: '25%',
                    width: 200, height: 100, borderRadius: 100,
                    backgroundColor: isActive ? 'rgba(255,59,92,0.08)' : 'rgba(0,229,255,0.05)',
                    zIndex: 0,
                }} />

                {cameraVisible && (isActive || live.phase === 'break') ? (
                    <LiveCamera active={isActive} quarter={live.quarter} onFrame={live.sendFrame} compact={false} />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {isIdle ? (
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    width: 80, height: 80, borderRadius: 40,
                                    backgroundColor: 'rgba(0,229,255,0.06)',
                                    justifyContent: 'center', alignItems: 'center',
                                    ...T.glow(T.colors.accent, 0.15),
                                }}>
                                    <MaterialCommunityIcons name="radar" size={40} color={`${T.colors.accent}60`} />
                                </View>
                                <Text style={{ color: `${T.colors.accent}80`, marginTop: 14, fontSize: 13, fontWeight: '600' }}>
                                    Prêt à analyser
                                </Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <MaterialCommunityIcons name="radar" size={40} color={T.colors.accent} />
                                <Text style={{ color: T.colors.muted, marginTop: 12, fontSize: 13 }}>
                                    {live.phase === 'connecting' ? 'Connexion...' : 'Session en pause'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Header Overlay — HUD style */}
                <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
                    <Animated.View style={{
                        opacity: headerAnim,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 16, paddingTop: 10,
                    }}>
                        {/* Close */}
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20,
                                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                            }}
                            accessibilityLabel="Fermer le Coach Live"
                        >
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>

                        {/* Timer + Quarter — HUD Badge */}
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 18, paddingVertical: 10,
                            borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10,
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                        }}>
                            {isActive && (
                                <Animated.View style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    backgroundColor: T.colors.red,
                                    ...T.glow(T.colors.red, 0.6),
                                }} />
                            )}
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16, fontVariant: ['tabular-nums'] }}>
                                {formatTime(live.elapsedTime)}
                            </Text>
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                            }}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' }}>
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
                                ...live.sseConnected ? T.glow(T.colors.green, 0.5) : {},
                            }} />
                            <Text style={{ color: live.sseConnected ? T.colors.green : T.colors.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
                                {live.sseConnected ? 'LIVE' : 'OFF'}
                            </Text>
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </View>

            {/* ── Main Panel ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 30 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Idle State ── */}
                {isIdle && (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <Text style={{ color: T.colors.white, fontSize: 24, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 }}>
                            Coach Live
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
                            Lance une session pour recevoir des{'\n'}feedbacks IA en temps réel.
                        </Text>

                        {/* Animated start button */}
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
                            accessibilityLabel="Démarrer le Coach Live"
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <MaterialCommunityIcons name="radar" size={20} color="#FFF" />
                            </View>
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18, letterSpacing: 0.3 }}>
                                Lancer la session
                            </Text>
                        </TouchableOpacity>

                        {/* Features list */}
                        <View style={{ marginTop: 36, width: '100%', gap: 10 }}>
                            {[
                                { icon: '🧠', text: 'Analyse mentale en temps réel' },
                                { icon: '🎯', text: 'Tracking de tes tirs et stats' },
                                { icon: '⚡', text: 'Alertes IA instantanées' },
                            ].map((feat, i) => (
                                <View key={i} style={{
                                    ...T.glass.light,
                                    borderRadius: T.radius.md,
                                    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                                }}>
                                    <Text style={{ fontSize: 18 }}>{feat.icon}</Text>
                                    <Text style={{ color: T.colors.textSecondary, fontSize: 13, fontWeight: '500' }}>{feat.text}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Connecting ── */}
                {live.phase === 'connecting' && (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: 'rgba(0,229,255,0.08)',
                            justifyContent: 'center', alignItems: 'center',
                            ...T.glow(T.colors.accent, 0.2),
                        }}>
                            <MaterialCommunityIcons name="radar" size={40} color={T.colors.accent} />
                        </View>
                        <Text style={{ color: T.colors.white, fontSize: 18, fontWeight: '800', marginTop: 16 }}>
                            Connexion au serveur IA...
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 13, marginTop: 6 }}>
                            Initialisation de la session
                        </Text>
                    </View>
                )}

                {/* ── Active / Break ── */}
                {(isActive || live.phase === 'break') && (
                    <>
                        {/* Stats Row */}
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                            <MentalRing score={live.mentalScore} />
                            <View style={{ flex: 1, gap: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <StatChip
                                        label="Tirs"
                                        value={`${live.makeCount}/${live.makeCount + live.missCount}`}
                                        color={T.colors.accent}
                                        sub={`${live.shootingPct}%`}
                                    />
                                    <StatChip
                                        label="Posture"
                                        value={`${Math.round(live.postureScore * 100)}`}
                                        color={scoreColor(live.postureScore * 100)}
                                        sub="/ 100"
                                    />
                                </View>
                                {/* Fatigue */}
                                <View style={{
                                    ...T.glass.light,
                                    borderRadius: T.radius.md, padding: 12,
                                    flexDirection: 'row', alignItems: 'center', gap: 10,
                                }}>
                                    <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>FATIGUE</Text>
                                    <MiniBar
                                        value={live.fatigueIndex}
                                        color={live.fatigueIndex > 70 ? T.colors.red : live.fatigueIndex > 40 ? T.colors.orange : T.colors.green}
                                    />
                                    <Text style={{ color: T.colors.white, fontSize: 13, fontWeight: '800', minWidth: 32, textAlign: 'right' }}>
                                        {live.fatigueIndex}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Confidence */}
                        <View style={{
                            ...T.glass.accent,
                            borderRadius: T.radius.md,
                            padding: 12, marginBottom: 12,
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                        }}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 16,
                                backgroundColor: `${T.colors.accent}12`,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <FontAwesome5 name="brain" size={14} color={T.colors.accent} />
                            </View>
                            <Text style={{ color: T.colors.muted, fontSize: 12, fontWeight: '600' }}>Confiance IA</Text>
                            <MiniBar value={live.confidence * 100} color={T.colors.accent} />
                            <Text style={{ color: T.colors.accent, fontSize: 13, fontWeight: '800', minWidth: 36, textAlign: 'right' }}>
                                {Math.round(live.confidence * 100)}%
                            </Text>
                        </View>

                        {/* Mental Trend */}
                        {live.mentalHistory.length > 1 && (
                            <View style={{
                                ...T.glass.light,
                                borderRadius: T.radius.md,
                                padding: 14, marginBottom: 12,
                            }}>
                                <Text style={{ color: T.colors.muted, fontSize: 9, marginBottom: 10, fontWeight: '800', letterSpacing: 1 }}>
                                    TENDANCE MENTALE
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 3 }}>
                                    {live.mentalHistory.slice(-12).map((v, i, arr) => (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1,
                                                height: `${Math.max(12, v)}%`,
                                                borderRadius: 4,
                                                backgroundColor: scoreColor(v),
                                                opacity: 0.5 + (i / arr.length) * 0.5,
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Shot Buttons */}
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ color: T.colors.muted, fontSize: 9, marginBottom: 10, fontWeight: '800', letterSpacing: 1 }}>
                                ENREGISTRER UN TIR
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 16, borderRadius: T.radius.lg,
                                        backgroundColor: `${T.colors.green}10`,
                                        borderWidth: 1.5, borderColor: `${T.colors.green}40`,
                                        alignItems: 'center', flexDirection: 'row',
                                        justifyContent: 'center', gap: 8,
                                    }}
                                    onPress={() => handleShotPress('made')}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="checkmark-circle" size={22} color={T.colors.green} />
                                    <Text style={{ color: T.colors.green, fontWeight: '800', fontSize: 16 }}>Réussi</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 16, borderRadius: T.radius.lg,
                                        backgroundColor: `${T.colors.red}10`,
                                        borderWidth: 1.5, borderColor: `${T.colors.red}40`,
                                        alignItems: 'center', flexDirection: 'row',
                                        justifyContent: 'center', gap: 8,
                                    }}
                                    onPress={() => handleShotPress('missed')}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="close-circle" size={22} color={T.colors.red} />
                                    <Text style={{ color: T.colors.red, fontWeight: '800', fontSize: 16 }}>Raté</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Alerts Feed */}
                        {live.alerts.length > 0 && (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ color: T.colors.muted, fontSize: 9, marginBottom: 10, fontWeight: '800', letterSpacing: 1 }}>
                                    FEEDBACK IA
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
                            <Text style={{ color: T.colors.muted, fontSize: 9, marginBottom: 12, fontWeight: '800', letterSpacing: 1 }}>
                                QUART-TEMPS — Q{live.quarter}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 13, borderRadius: T.radius.md,
                                        backgroundColor: `${T.colors.orange}10`,
                                        borderWidth: 1, borderColor: `${T.colors.orange}30`,
                                        alignItems: 'center',
                                    }}
                                    onPress={live.endQuarter}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{ color: T.colors.orange, fontWeight: '700', fontSize: 13 }}>⏸ Pause</Text>
                                </TouchableOpacity>

                                {live.phase === 'break' && (
                                    <TouchableOpacity
                                        style={{
                                            flex: 1, paddingVertical: 13, borderRadius: T.radius.md,
                                            backgroundColor: `${T.colors.accent}10`,
                                            borderWidth: 1, borderColor: `${T.colors.accent}30`,
                                            alignItems: 'center',
                                        }}
                                        onPress={live.nextQuarter}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: 13 }}>▶ Q{live.quarter + 1}</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 13, borderRadius: T.radius.md,
                                        backgroundColor: `${T.colors.red}10`,
                                        borderWidth: 1, borderColor: `${T.colors.red}30`,
                                        alignItems: 'center',
                                    }}
                                    onPress={live.end}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{ color: T.colors.red, fontWeight: '700', fontSize: 13 }}>⏹ Fin match</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Error inline */}
                        {live.error && (
                            <View style={{
                                ...T.glass.light,
                                borderRadius: T.radius.md,
                                padding: 14, marginBottom: 12,
                                borderColor: `${T.colors.red}30`,
                                flexDirection: 'row', alignItems: 'center',
                            }}>
                                <Ionicons name="warning-outline" size={18} color={T.colors.red} style={{ marginRight: 10 }} />
                                <Text style={{ color: T.colors.red, fontSize: 13, flex: 1 }}>{live.error}</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Error Phase */}
                {live.phase === 'error' && (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                        <View style={{
                            width: 72, height: 72, borderRadius: 36,
                            backgroundColor: `${T.colors.red}10`,
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: 16,
                        }}>
                            <Ionicons name="warning-outline" size={32} color={T.colors.red} />
                        </View>
                        <Text style={{ color: T.colors.white, fontSize: 18, fontWeight: '800' }}>
                            Connexion perdue
                        </Text>
                        <Text style={{ color: T.colors.muted, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                            {live.error ?? 'Erreur de connexion au serveur IA.'}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: T.colors.accent, borderRadius: T.radius.md,
                                paddingHorizontal: 32, paddingVertical: 14, marginTop: 24,
                                ...T.glow(T.colors.accent, 0.2),
                            }}
                            onPress={live.reset}
                        >
                            <Text style={{ color: T.colors.bg, fontWeight: '800' }}>Réessayer</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* ── Zone Picker Modal ── */}
            <Modal visible={showZonePicker} transparent animationType="fade">
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => { setShowZonePicker(false); setPendingOutcome(null) }}
                >
                    <View style={{
                        backgroundColor: T.colors.card,
                        borderTopLeftRadius: T.radius.xxl,
                        borderTopRightRadius: T.radius.xxl,
                        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                        borderTopWidth: 1, borderTopColor: T.colors.border,
                    }}>
                        {/* Handle */}
                        <View style={{ width: 40, height: 4, backgroundColor: T.colors.dimmer, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                        <Text style={{ color: T.colors.white, fontSize: 18, fontWeight: '800', marginBottom: 18, textAlign: 'center', letterSpacing: -0.3 }}>
                            Zone de tir
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
                                        <Text style={{ color, fontWeight: '700', fontSize: 14 }}>{zone}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                        <TouchableOpacity
                            style={{ marginTop: 18, alignItems: 'center', padding: 12 }}
                            onPress={() => handleZoneSelect('unspecified')}
                        >
                            <Text style={{ color: T.colors.muted, fontSize: 13 }}>Zone non précisée</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── End Report Modal ── */}
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

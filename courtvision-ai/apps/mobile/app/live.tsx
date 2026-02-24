import {
    View, Text, TouchableOpacity, Animated,
    ScrollView, StatusBar, Vibration, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { useLiveCoach } from '../hooks/useLiveCoach'
import { LiveCamera } from '../components/LiveCamera'
import { useStore } from '../lib/store'
import { XPBadge } from '../components/XPBadge'

// ==========================================
// Constants & Helpers
// ==========================================

const COLORS = {
    bg: '#0D1117',
    card: '#161B22',
    border: '#21262D',
    accent: '#00D4FF',
    accentDim: 'rgba(0,212,255,0.12)',
    green: '#00C853',
    greenDim: 'rgba(0,200,83,0.12)',
    red: '#FF3D57',
    redDim: 'rgba(255,61,87,0.12)',
    orange: '#FF9800',
    orangeDim: 'rgba(255,152,0,0.12)',
    white: '#E6EDF3',
    muted: '#8B949E',
    dimText: '#484F58',
}

const ALERT_COLORS: Record<string, string> = {
    info: COLORS.accent,
    warning: COLORS.orange,
    critical: COLORS.red,
}

const SHOT_ZONES = ['Paint', 'Mid-Range', '3-Pt', 'Floater']

function formatTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function scoreColor(v: number): string {
    if (v >= 80) return COLORS.green
    if (v >= 60) return COLORS.orange
    return COLORS.red
}

// ==========================================
// MiniBar — thin animated bar
// ==========================================

function MiniBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, { toValue: value / max, duration: 500, useNativeDriver: false }).start()
    }, [value])
    return (
        <View style={{ height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden', flex: 1 }}>
            <Animated.View style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: color,
                width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }} />
        </View>
    )
}

// ==========================================
// StatChip — single stat card
// ==========================================

function StatChip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
    return (
        <View style={{
            flex: 1,
            backgroundColor: COLORS.card,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
        }}>
            <Text style={{ color: COLORS.muted, fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Text>
            <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{value}</Text>
            {sub ? <Text style={{ color: COLORS.dimText, fontSize: 10, marginTop: 2 }}>{sub}</Text> : null}
        </View>
    )
}

// ==========================================
// AlertBanner
// ==========================================

function AlertBanner({ alert }: { alert: any }) {
    const fadeAnim = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(-10)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start()
    }, [alert])

    const color = ALERT_COLORS[alert.severity] ?? COLORS.accent

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY }],
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: `${color}18`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            borderLeftWidth: 3,
            borderLeftColor: color,
        }}>
            <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: color, marginRight: 10,
            }} />
            <Text style={{ color: COLORS.white, fontSize: 13, flex: 1, lineHeight: 18 }}>
                {alert.message}
            </Text>
            <Text style={{ color: COLORS.dimText, fontSize: 10, marginLeft: 8 }}>
                {alert.severity?.toUpperCase()}
            </Text>
        </Animated.View>
    )
}

// ==========================================
// Mental Pulse Ring
// ==========================================

function MentalRing({ score }: { score: number }) {
    const pulseAnim = useRef(new Animated.Value(1)).current
    const color = scoreColor(score)

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    return (
        <Animated.View style={{
            transform: [{ scale: pulseAnim }],
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: `${color}18`,
            borderWidth: 2.5, borderColor: color,
            justifyContent: 'center', alignItems: 'center',
            shadowColor: color, shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4, shadowRadius: 12,
        }}>
            <Text style={{ color, fontSize: 26, fontWeight: '900' }}>{score}</Text>
            <Text style={{ color: COLORS.muted, fontSize: 9, fontWeight: '600' }}>MENTAL</Text>
        </Animated.View>
    )
}

// ==========================================
// End Report Modal
// ==========================================

function EndReportModal({ visible, report, onClose }: { visible: boolean; report: any; onClose: () => void }) {
    if (!report) return null
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    {/* Title */}
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <Text style={{ fontSize: 40, marginBottom: 10 }}>🏀</Text>
                        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: '900' }}>
                            Match terminé
                        </Text>
                        <Text style={{ color: COLORS.muted, fontSize: 14, marginTop: 4 }}>
                            Rapport de fin de session
                        </Text>
                    </View>

                    {/* Main stats row */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        <StatChip label="Mental Final" value={report.mentalScore ?? '--'} color={scoreColor(report.mentalScore ?? 0)} sub="/ 100" />
                        <StatChip label="Shooting %" value={`${report.shootingPct ?? 0}%`} color={COLORS.accent} sub={`${report.makes ?? 0}/${report.attempts ?? 0}`} />
                        <StatChip label="Quarters" value={`Q${report.quarter ?? 1}`} color={COLORS.orange} />
                    </View>

                    {/* Recommendations */}
                    {report.recommendations?.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>
                                💡 Recommandations IA
                            </Text>
                            {report.recommendations.map((rec: string, i: number) => (
                                <View key={i} style={{
                                    backgroundColor: COLORS.accentDim,
                                    borderRadius: 12, padding: 14,
                                    marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start',
                                    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
                                }}>
                                    <Text style={{ color: COLORS.accent, fontSize: 13, marginRight: 8 }}>›</Text>
                                    <Text style={{ color: COLORS.white, fontSize: 14, flex: 1, lineHeight: 20 }}>{rec}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={{
                            backgroundColor: COLORS.accent,
                            paddingVertical: 16,
                            borderRadius: 28,
                            alignItems: 'center',
                            shadowColor: COLORS.accent,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                        }}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <Text style={{ color: COLORS.bg, fontWeight: '800', fontSize: 17 }}>
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
    const sessionId = `session_${Date.now()}`
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
    useEffect(() => {
        if (live.phase === 'ended' && live.endReport) {
            // Calculer XP de la session
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

    const handleShotPress = (outcome: 'made' | 'missed') => {
        setPendingOutcome(outcome)
        setShowZonePicker(true)
    }

    const handleZoneSelect = async (zone: string) => {
        setShowZonePicker(false)
        if (pendingOutcome) {
            await live.recordShot(pendingOutcome, zone as any)
            Vibration.vibrate(pendingOutcome === 'made' ? 60 : [0, 80, 60, 80])
        }
        setPendingOutcome(null)
    }

    const handleClose = async () => {
        if (live.phase === 'active' || live.phase === 'break') {
            await live.end()
        } else {
            router.back()
        }
    }

    const handleEndReport = () => {
        setShowEndReport(false)
        live.reset()
        router.back()
    }

    const isActive = live.phase === 'active'
    const isIdle = live.phase === 'idle'

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" />

            {/* XP Popup */}
            {xpPopup && (
                <View style={{
                    position: 'absolute', zIndex: 9999,
                    left: 0, right: 0, top: '30%', alignItems: 'center',
                }}>
                    <XPBadge
                        amount={xpPopup.amount}
                        label={xpPopup.label}
                        onDone={() => setXpPopup(null)}
                    />
                </View>
            )}

            {/* Camera Zone */}
            <View style={{ height: '38%', backgroundColor: '#000', position: 'relative' }}>
                {cameraVisible && (isActive || live.phase === 'break') ? (
                    <LiveCamera
                        active={isActive}
                        quarter={live.quarter}
                        onFrame={live.sendFrame}
                        compact={false}
                    />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {isIdle ? (
                            <View style={{ alignItems: 'center' }}>
                                <MaterialCommunityIcons name="radar" size={60} color={`${COLORS.accent}60`} />
                                <Text style={{ color: `${COLORS.accent}60`, marginTop: 10, fontSize: 13 }}>
                                    Prêt à analyser
                                </Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <MaterialCommunityIcons name="radar" size={50} color={COLORS.accent} />
                                <Text style={{ color: COLORS.muted, marginTop: 10, fontSize: 13 }}>
                                    {live.phase === 'connecting' ? 'Connexion...' : 'Session en pause'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Header Overlay */}
                <SafeAreaView
                    style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                    pointerEvents="box-none"
                >
                    <Animated.View style={{
                        opacity: headerAnim,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingTop: 10,
                    }}>
                        {/* Close */}
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                padding: 10,
                                borderRadius: 20,
                            }}
                            accessibilityLabel="Fermer le Coach Live"
                        >
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>

                        {/* Timer + Quarter */}
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            paddingHorizontal: 16, paddingVertical: 8,
                            borderRadius: 20, flexDirection: 'row',
                            alignItems: 'center', gap: 10,
                        }}>
                            {isActive && (
                                <View style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    backgroundColor: COLORS.red,
                                }} />
                            )}
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>
                                {formatTime(live.elapsedTime)}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                Q{live.quarter}
                            </Text>
                        </View>

                        {/* SSE Indicator */}
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            paddingHorizontal: 10, paddingVertical: 6,
                            borderRadius: 14, flexDirection: 'row', alignItems: 'center',
                        }}>
                            <View style={{
                                width: 6, height: 6, borderRadius: 3,
                                backgroundColor: live.sseConnected ? COLORS.green : COLORS.dimText,
                                marginRight: 5,
                            }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                                {live.sseConnected ? 'LIVE' : 'OFF'}
                            </Text>
                        </View>
                    </Animated.View>
                </SafeAreaView>
            </View>

            {/* Main Panel */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
            >

                {/* ── Idle State ── */}
                {isIdle && (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
                            Coach Live
                        </Text>
                        <Text style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                            Lance une session pour recevoir des{'\n'}feedbacks IA en temps réel.
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLORS.red,
                                paddingVertical: 16,
                                paddingHorizontal: 48,
                                borderRadius: 30,
                                flexDirection: 'row', alignItems: 'center', gap: 10,
                                shadowColor: COLORS.red,
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.4,
                                shadowRadius: 12,
                                elevation: 8,
                            }}
                            onPress={live.start}
                            activeOpacity={0.85}
                            accessibilityLabel="Démarrer le Coach Live"
                        >
                            <MaterialCommunityIcons name="radar" size={22} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18 }}>
                                Lancer la session
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Connecting ── */}
                {live.phase === 'connecting' && (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <MaterialCommunityIcons name="radar" size={50} color={COLORS.accent} />
                        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '700', marginTop: 14 }}>
                            Connexion au serveur IA...
                        </Text>
                        <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>
                            Initialisation de la session
                        </Text>
                    </View>
                )}

                {/* ── Active / Break ── */}
                {(isActive || live.phase === 'break') && (
                    <>
                        {/* Stats Row */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                            <MentalRing score={live.mentalScore} />
                            <View style={{ flex: 1, gap: 8 }}>
                                {/* Shooting row */}
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <StatChip
                                        label="Tirs"
                                        value={`${live.makeCount}/${live.makeCount + live.missCount}`}
                                        color={COLORS.accent}
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
                                    backgroundColor: COLORS.card,
                                    borderRadius: 12, padding: 10,
                                    flexDirection: 'row', alignItems: 'center', gap: 10,
                                    borderWidth: 1, borderColor: COLORS.border,
                                }}>
                                    <Text style={{ color: COLORS.muted, fontSize: 11 }}>Fatigue</Text>
                                    <MiniBar
                                        value={live.fatigueIndex}
                                        color={live.fatigueIndex > 70 ? COLORS.red : live.fatigueIndex > 40 ? COLORS.orange : COLORS.green}
                                    />
                                    <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700', minWidth: 28, textAlign: 'right' }}>
                                        {live.fatigueIndex}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Confidence */}
                        <View style={{
                            backgroundColor: COLORS.card, borderRadius: 12,
                            padding: 12, marginBottom: 12,
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            borderWidth: 1, borderColor: COLORS.border,
                        }}>
                            <FontAwesome5 name="brain" size={16} color={COLORS.accent} />
                            <Text style={{ color: COLORS.muted, fontSize: 12 }}>Confiance IA</Text>
                            <MiniBar value={live.confidence * 100} color={COLORS.accent} />
                            <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' }}>
                                {Math.round(live.confidence * 100)}%
                            </Text>
                        </View>

                        {/* Mental Trend */}
                        {live.mentalHistory.length > 1 && (
                            <View style={{
                                backgroundColor: COLORS.card, borderRadius: 14,
                                padding: 14, marginBottom: 12,
                                borderWidth: 1, borderColor: COLORS.border,
                            }}>
                                <Text style={{ color: COLORS.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Tendance mentale
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 30, gap: 3 }}>
                                    {live.mentalHistory.slice(-12).map((v, i) => (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1,
                                                height: `${Math.max(10, v)}%`,
                                                borderRadius: 3,
                                                backgroundColor: scoreColor(v),
                                                opacity: 0.6 + (i / 12) * 0.4,
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Shot Buttons */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ color: COLORS.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Enregistrer un tir
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 16, borderRadius: 16,
                                        backgroundColor: COLORS.greenDim,
                                        borderWidth: 1.5, borderColor: COLORS.green,
                                        alignItems: 'center', flexDirection: 'row',
                                        justifyContent: 'center', gap: 8,
                                    }}
                                    onPress={() => handleShotPress('made')}
                                    activeOpacity={0.75}
                                    accessibilityLabel="Tir réussi"
                                >
                                    <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />
                                    <Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 16 }}>Réussi</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 16, borderRadius: 16,
                                        backgroundColor: COLORS.redDim,
                                        borderWidth: 1.5, borderColor: COLORS.red,
                                        alignItems: 'center', flexDirection: 'row',
                                        justifyContent: 'center', gap: 8,
                                    }}
                                    onPress={() => handleShotPress('missed')}
                                    activeOpacity={0.75}
                                    accessibilityLabel="Tir raté"
                                >
                                    <Ionicons name="close-circle" size={22} color={COLORS.red} />
                                    <Text style={{ color: COLORS.red, fontWeight: '800', fontSize: 16 }}>Raté</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Alerts Feed */}
                        {live.alerts.length > 0 && (
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ color: COLORS.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Feedback IA
                                </Text>
                                {live.alerts.slice(0, 3).map((alert, i) => (
                                    <AlertBanner key={i} alert={alert} />
                                ))}
                            </View>
                        )}

                        {/* Quarter Controls */}
                        <View style={{
                            backgroundColor: COLORS.card, borderRadius: 16,
                            padding: 14, marginBottom: 12,
                            borderWidth: 1, borderColor: COLORS.border,
                        }}>
                            <Text style={{ color: COLORS.muted, fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Quart-temps — Q{live.quarter}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 12, borderRadius: 12,
                                        backgroundColor: COLORS.orangeDim,
                                        borderWidth: 1, borderColor: COLORS.orange,
                                        alignItems: 'center',
                                    }}
                                    onPress={live.endQuarter}
                                    activeOpacity={0.8}
                                    accessibilityLabel="Terminer ce quart-temps"
                                >
                                    <Text style={{ color: COLORS.orange, fontWeight: '700', fontSize: 13 }}>
                                        ⏸ Pause QT
                                    </Text>
                                </TouchableOpacity>

                                {live.phase === 'break' && (
                                    <TouchableOpacity
                                        style={{
                                            flex: 1, paddingVertical: 12, borderRadius: 12,
                                            backgroundColor: COLORS.accentDim,
                                            borderWidth: 1, borderColor: COLORS.accent,
                                            alignItems: 'center',
                                        }}
                                        onPress={live.nextQuarter}
                                        activeOpacity={0.8}
                                        accessibilityLabel="Démarrer le prochain quart-temps"
                                    >
                                        <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13 }}>
                                            ▶ Q{live.quarter + 1}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={{
                                        flex: 1, paddingVertical: 12, borderRadius: 12,
                                        backgroundColor: COLORS.redDim,
                                        borderWidth: 1, borderColor: COLORS.red,
                                        alignItems: 'center',
                                    }}
                                    onPress={live.end}
                                    activeOpacity={0.8}
                                    accessibilityLabel="Terminer le match"
                                >
                                    <Text style={{ color: COLORS.red, fontWeight: '700', fontSize: 13 }}>
                                        ⏹ Fin match
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Error */}
                        {live.error && (
                            <View style={{
                                backgroundColor: COLORS.redDim, borderRadius: 12,
                                padding: 12, marginBottom: 12,
                                borderWidth: 1, borderColor: COLORS.red,
                                flexDirection: 'row', alignItems: 'center',
                            }}>
                                <Ionicons name="warning-outline" size={18} color={COLORS.red} style={{ marginRight: 8 }} />
                                <Text style={{ color: COLORS.red, fontSize: 13, flex: 1 }}>{live.error}</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Error Phase */}
                {live.phase === 'error' && (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <Ionicons name="warning-outline" size={50} color={COLORS.red} />
                        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '700', marginTop: 14 }}>
                            Connexion perdue
                        </Text>
                        <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                            {live.error ?? 'Erreur de connexion au serveur IA.'}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLORS.accent, borderRadius: 14,
                                paddingHorizontal: 28, paddingVertical: 12, marginTop: 20,
                            }}
                            onPress={live.reset}
                        >
                            <Text style={{ color: COLORS.bg, fontWeight: '700' }}>
                                Réessayer
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {/* Zone Picker Modal */}
            <Modal visible={showZonePicker} transparent animationType="fade">
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowZonePicker(false)}
                >
                    <View style={{
                        backgroundColor: COLORS.card, borderTopLeftRadius: 24,
                        borderTopRightRadius: 24, padding: 24,
                        borderTopWidth: 1, borderTopColor: COLORS.border,
                    }}>
                        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' }}>
                            Zone de tir
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                            {SHOT_ZONES.map(zone => (
                                <TouchableOpacity
                                    key={zone}
                                    style={{
                                        paddingHorizontal: 22, paddingVertical: 12,
                                        borderRadius: 14, borderWidth: 1.5,
                                        borderColor: pendingOutcome === 'made' ? COLORS.green : COLORS.red,
                                        backgroundColor: pendingOutcome === 'made' ? COLORS.greenDim : COLORS.redDim,
                                    }}
                                    onPress={() => handleZoneSelect(zone.toLowerCase().replace('-', '_'))}
                                    activeOpacity={0.75}
                                >
                                    <Text style={{
                                        color: pendingOutcome === 'made' ? COLORS.green : COLORS.red,
                                        fontWeight: '700', fontSize: 14,
                                    }}>
                                        {zone}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={{ marginTop: 16, alignItems: 'center', padding: 10 }}
                            onPress={() => handleZoneSelect('unspecified')}
                        >
                            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Zone non précisée</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* End Report Modal */}
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

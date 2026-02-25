import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useRef, useCallback } from 'react'
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { T } from '../../lib/theme'

const PIPELINE_STEPS = [
    { label: 'Prétraitement vidéo',    icon: '📹', xp: 5 },
    { label: 'Tracking des joueurs',   icon: '🎯', xp: 8 },
    { label: 'Reconstruction 3D',      icon: '🔮', xp: 10 },
    { label: 'Analyse des tirs',       icon: '🏀', xp: 15 },
    { label: 'Analyse mentale',        icon: '🧠', xp: 12 },
    { label: 'Génération du rapport',  icon: '📊', xp: 10 },
    { label: 'Création des highlights', icon: '🎬', xp: 15 },
]

const TOTAL_XP = PIPELINE_STEPS.reduce((a, s) => a + s.xp, 0)

export default function UploadAnalyze() {
    const router   = useRouter()
    const addXP    = useStore(s => s.addXP)

    const [analyzing, setAnalyzing]   = useState(false)
    const [progress, setProgress]     = useState(0)
    const [completed, setCompleted]   = useState(false)
    const progressAnim = useRef(new Animated.Value(0)).current
    const pulseAnim    = useRef(new Animated.Value(1)).current
    const fadeAnim     = useRef(new Animated.Value(1)).current

    const currentStep = Math.min(
        Math.floor((progress / 100) * PIPELINE_STEPS.length),
        PIPELINE_STEPS.length - 1
    )

    const startPulse = useCallback(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    const animateProgress = useCallback((toValue: number) => {
        Animated.timing(progressAnim, {
            toValue: toValue / 100,
            duration: 400,
            useNativeDriver: false,
        }).start()
    }, [])

    const handleUpload = useCallback((source: 'gallery' | 'camera') => {
        setAnalyzing(true)
        setProgress(0)
        startPulse()

        if (source === 'gallery') {
            toast.info('Vidéo importée', 'Analyse IA en cours…')
        } else {
            toast.info('Caméra activée', 'Enregistrement démarré')
        }

        let p = 0
        let lastStep = -1

        const inter = setInterval(() => {
            p += 4 + Math.random() * 4
            if (p >= 100) p = 100
            setProgress(Math.round(p))
            animateProgress(p)

            const step = Math.min(Math.floor((p / 100) * PIPELINE_STEPS.length), PIPELINE_STEPS.length - 1)
            if (step !== lastStep && PIPELINE_STEPS[step]) {
                lastStep = step
                const s = PIPELINE_STEPS[step]
                toast.xp(`+${s.xp} XP`, s.label, 1800)
            }

            if (p >= 100) {
                clearInterval(inter)
                addXP(TOTAL_XP, 'Analyse complète du match')
                toast.success('Analyse terminée !', `+${TOTAL_XP} XP gagnés`, 3500)
                setCompleted(true)
                setTimeout(() => router.push('/analysis/123'), 1800)
            }
        }, 350)
    }, [startPulse, animateProgress, addXP, router])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg, padding: T.space.xl }}>
            <Text style={{
                color: T.colors.white, fontSize: T.font.xxl,
                fontWeight: '900', marginBottom: 6, letterSpacing: -0.5,
            }}>
                Upload & Analyse
            </Text>
            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md, marginBottom: T.space.xxl }}>
                +{TOTAL_XP} XP pour une analyse complète
            </Text>

            {!analyzing ? (
                <>
                    <Text style={{
                        color: T.colors.textSecondary, fontSize: T.font.base,
                        marginBottom: T.space.xxxl, lineHeight: 24,
                    }}>
                        Importe une vidéo ou filme ton match.{'\n'}L'IA s'occupe du reste.
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
                        {/* Galerie */}
                        <TouchableOpacity
                            style={{
                                ...T.glass.accent,
                                borderRadius: T.radius.xl, padding: 36,
                                alignItems: 'center',
                                borderWidth: 1.5, borderColor: T.colors.borderAccent,
                                borderStyle: 'dashed',
                                ...T.glow(T.colors.accent, 0.08),
                            }}
                            onPress={() => handleUpload('gallery')}
                            activeOpacity={0.8}
                            accessibilityLabel="Choisir une vidéo dans la galerie"
                            accessibilityRole="button"
                        >
                            <View style={{
                                width: 72, height: 72, borderRadius: 36,
                                backgroundColor: T.colors.accentDim,
                                justifyContent: 'center', alignItems: 'center',
                                ...T.glow(T.colors.accent, 0.2),
                            }}>
                                <Ionicons name="images-outline" size={34} color={T.colors.accent} />
                            </View>
                            <Text style={{
                                color: T.colors.white, fontSize: T.font.lg,
                                fontWeight: '700', marginTop: 16,
                            }}>
                                Choisir dans la galerie
                            </Text>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 5 }}>
                                MP4, MOV — max 500 Mo
                            </Text>
                        </TouchableOpacity>

                        {/* Caméra */}
                        <TouchableOpacity
                            style={{
                                ...T.glass.light,
                                borderRadius: T.radius.xl, padding: 36, alignItems: 'center',
                            }}
                            onPress={() => handleUpload('camera')}
                            activeOpacity={0.8}
                            accessibilityLabel="Filmer un match en direct"
                            accessibilityRole="button"
                        >
                            <View style={{
                                width: 72, height: 72, borderRadius: 36,
                                backgroundColor: T.colors.primaryDim,
                                justifyContent: 'center', alignItems: 'center',
                                ...T.glow(T.colors.primary, 0.15),
                            }}>
                                <AntDesign name="camera" size={34} color={T.colors.primaryLight} />
                            </View>
                            <Text style={{
                                color: T.colors.white, fontSize: T.font.lg,
                                fontWeight: '700', marginTop: 16,
                            }}>
                                Filmer un match
                            </Text>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 5 }}>
                                Ouvre la caméra directement
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {/* Animated radar */}
                    <Animated.View style={{
                        transform: [{ scale: pulseAnim }],
                        width: 120, height: 120, borderRadius: 60,
                        backgroundColor: completed ? T.colors.greenDim : T.colors.accentDim,
                        justifyContent: 'center', alignItems: 'center',
                        ...(completed ? T.glow(T.colors.green, 0.3) : T.glow(T.colors.accent, 0.3)),
                    }}>
                        <MaterialCommunityIcons
                            name="radar"
                            size={60}
                            color={completed ? T.colors.green : T.colors.accent}
                        />
                    </Animated.View>

                    <Text style={{
                        color: T.colors.white, fontSize: T.font.xl,
                        fontWeight: '900', marginTop: T.space.xxl, letterSpacing: -0.3,
                    }}>
                        {completed ? '✅ Analyse terminée !' : 'Analyse IA en cours…'}
                    </Text>

                    {!completed && (
                        <Text style={{
                            color: T.colors.textSecondary, fontSize: T.font.md,
                            marginTop: T.space.sm, textAlign: 'center', lineHeight: 20,
                        }}>
                            {PIPELINE_STEPS[currentStep]?.icon} {PIPELINE_STEPS[currentStep]?.label}
                        </Text>
                    )}

                    {/* Progress bar */}
                    <View style={{
                        width: '85%', height: 8, backgroundColor: T.colors.dimmer,
                        borderRadius: 4, marginTop: T.space.xxl, overflow: 'hidden',
                        borderWidth: 1, borderColor: T.colors.border,
                    }}>
                        <Animated.View style={{
                            height: '100%',
                            backgroundColor: completed ? T.colors.green : T.colors.accent,
                            borderRadius: 4,
                            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        }} />
                    </View>
                    <Text style={{ color: T.colors.dim, fontSize: T.font.sm + 1, marginTop: 6 }}>
                        {Math.round(progress)}%
                    </Text>

                    {/* Étapes */}
                    <View style={{ marginTop: T.space.xxl, width: '85%' }}>
                        {PIPELINE_STEPS.map((step, i) => {
                            const stepThreshold = ((i + 1) / PIPELINE_STEPS.length) * 100
                            const isDone    = progress >= stepThreshold
                            const isCurrent = i === currentStep && !completed

                            return (
                                <View key={step.label} style={{
                                    flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10,
                                }}>
                                    <View style={{
                                        width: 22, height: 22, borderRadius: 11,
                                        backgroundColor: isDone ? T.colors.green : isCurrent ? T.colors.accent : T.colors.dimmer,
                                        justifyContent: 'center', alignItems: 'center',
                                        ...(isDone ? T.glow(T.colors.green, 0.15) : isCurrent ? T.glow(T.colors.accent, 0.15) : {}),
                                    }}>
                                        {isDone && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                    </View>
                                    <Text style={{
                                        color: isDone ? T.colors.green : isCurrent ? T.colors.white : T.colors.dim,
                                        fontSize: T.font.sm + 1,
                                        fontWeight: isCurrent ? '700' : '400',
                                        flex: 1,
                                    }}>
                                        {step.icon} {step.label}
                                    </Text>
                                    <Text style={{ color: T.colors.purple, fontSize: T.font.xs + 1, fontWeight: '700' }}>
                                        +{step.xp} XP
                                    </Text>
                                </View>
                            )
                        })}
                    </View>

                    {completed && (
                        <Text style={{
                            color: T.colors.purple, fontWeight: '900',
                            fontSize: T.font.lg, marginTop: T.space.lg,
                            ...T.glow(T.colors.purple, 0.2),
                        }}>
                            ⚡ +{TOTAL_XP} XP
                        </Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    )
}

import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useRef, useCallback } from 'react'
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'

const PIPELINE_STEPS = [
    { label: 'Prétraitement vidéo',   icon: '📹', xp: 5 },
    { label: 'Tracking des joueurs',  icon: '🎯', xp: 8 },
    { label: 'Reconstruction 3D',     icon: '🔮', xp: 10 },
    { label: 'Analyse des tirs',      icon: '🏀', xp: 15 },
    { label: 'Analyse mentale',       icon: '🧠', xp: 12 },
    { label: 'Génération du rapport', icon: '📊', xp: 10 },
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

    const currentStep = Math.min(
        Math.floor((progress / 100) * PIPELINE_STEPS.length),
        PIPELINE_STEPS.length - 1
    )

    const startPulse = useCallback(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
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
            p += 4 + Math.random() * 4   // progression légèrement aléatoire
            if (p >= 100) p = 100
            setProgress(Math.round(p))
            animateProgress(p)

            // Toast par étape
            const step = Math.min(Math.floor((p / 100) * PIPELINE_STEPS.length), PIPELINE_STEPS.length - 1)
            if (step !== lastStep && PIPELINE_STEPS[step]) {
                lastStep = step
                const s = PIPELINE_STEPS[step]
                toast.xp(`+${s.xp} XP`, s.label, 1800)
            }

            if (p >= 100) {
                clearInterval(inter)
                // Ajouter les XP total
                addXP(TOTAL_XP, 'Analyse complète du match')
                toast.success('Analyse terminée !', `+${TOTAL_XP} XP gagnés`, 3500)
                setCompleted(true)
                setTimeout(() => router.push('/analysis/123'), 1800)
            }
        }, 350)
    }, [startPulse, animateProgress, addXP, router])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            <Text style={{ color: '#E6EDF3', fontSize: 24, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 }}>
                Upload & Analyse
            </Text>
            <Text style={{ color: '#8B949E', fontSize: 13, marginBottom: 24 }}>
                +{TOTAL_XP} XP pour une analyse complète
            </Text>

            {!analyzing ? (
                <>
                    <Text style={{ color: '#8B949E', fontSize: 15, marginBottom: 36, lineHeight: 24 }}>
                        Importe une vidéo ou filme ton match.{'\n'}L'IA s'occupe du reste.
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
                        {/* Galerie */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#161B22',
                                borderRadius: 20, padding: 36,
                                alignItems: 'center',
                                borderWidth: 1.5, borderColor: '#1A73E8',
                                borderStyle: 'dashed',
                            }}
                            onPress={() => handleUpload('gallery')}
                            activeOpacity={0.8}
                            accessibilityLabel="Choisir une vidéo dans la galerie"
                            accessibilityRole="button"
                        >
                            <Ionicons name="images-outline" size={50} color="#1A73E8" />
                            <Text style={{ color: '#E6EDF3', fontSize: 17, fontWeight: '700', marginTop: 14 }}>
                                Choisir dans la galerie
                            </Text>
                            <Text style={{ color: '#8B949E', fontSize: 12, marginTop: 5 }}>MP4, MOV — max 500 Mo</Text>
                        </TouchableOpacity>

                        {/* Caméra */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#161B22',
                                borderRadius: 20, padding: 36,
                                alignItems: 'center',
                                borderWidth: 1, borderColor: '#21262D',
                            }}
                            onPress={() => handleUpload('camera')}
                            activeOpacity={0.8}
                            accessibilityLabel="Filmer un match en direct"
                            accessibilityRole="button"
                        >
                            <AntDesign name="camera" size={50} color="#00D4FF" />
                            <Text style={{ color: '#E6EDF3', fontSize: 17, fontWeight: '700', marginTop: 14 }}>
                                Filmer un match
                            </Text>
                            <Text style={{ color: '#8B949E', fontSize: 12, marginTop: 5 }}>
                                Ouvre la caméra directement
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <MaterialCommunityIcons
                            name="radar"
                            size={80}
                            color={completed ? '#00C853' : '#00D4FF'}
                        />
                    </Animated.View>

                    <Text style={{ color: '#E6EDF3', fontSize: 22, fontWeight: '800', marginTop: 28 }}>
                        {completed ? '✅ Analyse terminée !' : 'Analyse IA en cours…'}
                    </Text>

                    {!completed && (
                        <Text style={{ color: '#8B949E', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                            {PIPELINE_STEPS[currentStep]?.icon} {PIPELINE_STEPS[currentStep]?.label}
                        </Text>
                    )}

                    {/* Progress bar */}
                    <View style={{
                        width: '85%', height: 8, backgroundColor: '#161B22',
                        borderRadius: 4, marginTop: 28, overflow: 'hidden',
                        borderWidth: 1, borderColor: '#21262D',
                    }}>
                        <Animated.View style={{
                            height: '100%', backgroundColor: completed ? '#00C853' : '#00D4FF',
                            borderRadius: 4,
                            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        }} />
                    </View>
                    <Text style={{ color: '#484F58', fontSize: 12, marginTop: 6 }}>{Math.round(progress)}%</Text>

                    {/* Étapes */}
                    <View style={{ marginTop: 24, width: '85%' }}>
                        {PIPELINE_STEPS.map((step, i) => {
                            const stepThreshold = ((i + 1) / PIPELINE_STEPS.length) * 100
                            const isDone    = progress >= stepThreshold
                            const isCurrent = i === currentStep && !completed

                            return (
                                <View key={step.label} style={{
                                    flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 10,
                                }}>
                                    <View style={{
                                        width: 18, height: 18, borderRadius: 9,
                                        backgroundColor: isDone ? '#00C853' : isCurrent ? '#00D4FF' : '#21262D',
                                        justifyContent: 'center', alignItems: 'center',
                                    }}>
                                        {isDone && <Ionicons name="checkmark" size={11} color="#FFF" />}
                                    </View>
                                    <Text style={{
                                        color: isDone ? '#00C853' : isCurrent ? '#E6EDF3' : '#484F58',
                                        fontSize: 12,
                                        fontWeight: isCurrent ? '700' : '400',
                                        flex: 1,
                                    }}>
                                        {step.icon} {step.label}
                                    </Text>
                                    <Text style={{ color: '#B388FF', fontSize: 10, fontWeight: '700' }}>
                                        +{step.xp} XP
                                    </Text>
                                </View>
                            )
                        })}
                    </View>

                    {completed && (
                        <Text style={{ color: '#B388FF', fontWeight: '800', fontSize: 16, marginTop: 16 }}>
                            ⚡ +{TOTAL_XP} XP
                        </Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    )
}

import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { XPBadge } from '../components/XPBadge'
import { T } from '../lib/theme'

const WEEKLY_PROGRAM = [
    { day: 1, label: 'Lun', focus: 'Mécanique de tir',   duration: 45, done: true,  xp: 20 },
    { day: 2, label: 'Mar', focus: 'Défense & Footwork',  duration: 40, done: true,  xp: 18 },
    { day: 3, label: 'Mer', focus: 'Récupération active', duration: 30, done: false, isToday: true, xp: 12 },
    { day: 4, label: 'Jeu', focus: 'Création 1v1',        duration: 50, done: false, xp: 22 },
    { day: 5, label: 'Ven', focus: 'Pression mentale',    duration: 45, done: false, xp: 20 },
    { day: 6, label: 'Sam', focus: 'Match 2v2',           duration: 60, done: false, xp: 30 },
    { day: 7, label: 'Dim', focus: 'Test & Vidéo',        duration: 30, done: false, xp: 15 },
]

const TODAY_EXERCISES = [
    { name: 'Navettes terrain complet', reps: '10 allers-retours', intensity: 'Modérée', xp: 4, done: false },
    { name: 'Visualisation mentale',    reps: '15 minutes',        intensity: 'Faible',  xp: 3, done: false },
    { name: 'Dribbles côté faible',     reps: '4 séries x 5 min',  intensity: 'Modérée', xp: 5, done: false },
]

const INTENSITY_COLORS: Record<string, string> = {
    Faible:  T.colors.green,
    Modérée: T.colors.orange,
    Haute:   T.colors.red,
}

export default function TrainingProgram() {
    const router     = useRouter()
    const addXP      = useStore(s => s.addXP)
    const [exercises, setExercises] = useState(TODAY_EXERCISES)
    const [xpPopup, setXpPopup]    = useState<{ amount: number; label: string } | null>(null)

    const completedCount = exercises.filter(e => e.done).length
    const progressPct    = (completedCount / exercises.length) * 100
    const progressAnim   = useRef(new Animated.Value(0)).current
    const fadeAnim       = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    }, [])

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPct / 100,
            duration: 500,
            useNativeDriver: false,
        }).start()
    }, [progressPct])

    const toggleExercise = useCallback((i: number) => {
        const ex = exercises[i]
        const nowDone = !ex.done
        setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, done: !e.done } : e))
        if (nowDone) {
            addXP(ex.xp, ex.name)
            setXpPopup({ amount: ex.xp, label: ex.name })
            toast.xp(`+${ex.xp} XP`, ex.name)
        }
    }, [exercises, addXP])

    const allDone = completedCount === exercises.length

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView contentContainerStyle={{ padding: T.space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.xl }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 42, height: 42, borderRadius: T.radius.md,
                            ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center', marginRight: 14,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Retour"
                    >
                        <Ionicons name="arrow-back" size={20} color={T.colors.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: T.colors.white, fontSize: T.font.xl, fontWeight: '900', letterSpacing: -0.3 }}>
                            Programme 7 Jours
                        </Text>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm }}>
                            Généré par IA · basé sur tes faiblesses
                        </Text>
                    </View>
                </View>

                {/* XP popup */}
                {xpPopup && (
                    <XPBadge amount={xpPopup.amount} label={xpPopup.label} onDone={() => setXpPopup(null)} />
                )}

                {/* Objectif semaine */}
                <View style={{
                    ...T.glass.accent,
                    borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.xxl,
                    ...T.glow(T.colors.accent, 0.08),
                }}>
                    <Text style={{ color: T.colors.accent, fontWeight: '700', marginBottom: 6, fontSize: T.font.md }}>
                        🎯 Objectif de la semaine
                    </Text>
                    <Text style={{ color: T.colors.white, lineHeight: 22, fontSize: T.font.md }}>
                        Reconstruire ta confiance et stabiliser ton mental sous pression. Focus sur les tirs de mi-distance après drive.
                    </Text>
                </View>

                {/* Calendrier hebdo */}
                <Text style={{ color: T.colors.white, fontWeight: '800', fontSize: T.font.lg, marginBottom: T.space.md }}>
                    Cette semaine
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.space.xxl }}>
                    {WEEKLY_PROGRAM.map(day => (
                        <View key={day.day} style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.xs + 1, marginBottom: 4 }}>{day.label}</Text>
                            <View style={{
                                width: 38, height: 38, borderRadius: 19,
                                backgroundColor: day.done ? T.colors.green : day.isToday ? T.colors.primary : T.colors.dimmer,
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: day.isToday ? 2 : 0,
                                borderColor: T.colors.accent,
                                ...(day.done ? T.glow(T.colors.green, 0.2) : day.isToday ? T.glow(T.colors.accent, 0.2) : {}),
                            }}>
                                {day.done
                                    ? <Ionicons name="checkmark" size={16} color="#FFF" />
                                    : <Text style={{
                                        color: day.isToday ? '#FFF' : T.colors.muted,
                                        fontWeight: '700', fontSize: T.font.sm + 1,
                                    }}>{day.day}</Text>
                                }
                            </View>
                            <Text style={{ color: T.colors.dim, fontSize: T.font.xs, marginTop: 3, textAlign: 'center' }}>
                                +{day.xp}xp
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Séance du jour */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.space.sm }}>
                    <Text style={{ color: T.colors.white, fontWeight: '800', fontSize: T.font.lg }}>
                        Séance d'aujourd'hui
                    </Text>
                    <View style={{
                        ...T.glass.light,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: T.radius.sm,
                    }}>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm }}>⏱ 30 min</Text>
                    </View>
                </View>

                {/* Progress Bar animée */}
                <View style={{
                    height: 8, backgroundColor: T.colors.dimmer, borderRadius: 4,
                    marginBottom: 6, overflow: 'hidden',
                    borderWidth: 1, borderColor: T.colors.border,
                }}>
                    <Animated.View style={{
                        height: 8, borderRadius: 4, backgroundColor: T.colors.green,
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    }} />
                </View>
                <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.lg }}>
                    {completedCount}/{exercises.length} exercices · +{exercises.filter(e => e.done).reduce((a, e) => a + e.xp, 0)} XP gagnés
                </Text>

                {exercises.map((ex, i) => (
                    <TouchableOpacity
                        key={i}
                        style={{
                            ...T.glass.light,
                            borderRadius: T.radius.lg, padding: T.space.lg + 2, marginBottom: 10,
                            flexDirection: 'row', alignItems: 'center',
                            opacity: ex.done ? 0.6 : 1,
                            borderWidth: 1,
                            borderColor: ex.done ? `${T.colors.green}40` : T.colors.border,
                            ...(ex.done ? T.glow(T.colors.green, 0.06) : {}),
                        }}
                        onPress={() => toggleExercise(i)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: ex.done }}
                        accessibilityLabel={`${ex.done ? 'Décocher' : 'Cocher'} : ${ex.name}`}
                    >
                        <View style={{
                            width: 30, height: 30, borderRadius: 15,
                            backgroundColor: ex.done ? T.colors.green : 'transparent',
                            borderWidth: 2,
                            borderColor: ex.done ? T.colors.green : T.colors.muted,
                            justifyContent: 'center', alignItems: 'center',
                            marginRight: 14,
                            ...(ex.done ? T.glow(T.colors.green, 0.25) : {}),
                        }}>
                            {ex.done && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: T.colors.white, fontWeight: '600', fontSize: T.font.md + 1,
                                textDecorationLine: ex.done ? 'line-through' : 'none',
                            }}>
                                {ex.name}
                            </Text>
                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm + 1, marginTop: 3 }}>
                                {ex.reps}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <View style={{
                                backgroundColor: `${INTENSITY_COLORS[ex.intensity] ?? T.colors.muted}18`,
                                borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                            }}>
                                <Text style={{
                                    color: INTENSITY_COLORS[ex.intensity] ?? T.colors.muted,
                                    fontSize: T.font.xs + 1, fontWeight: '600',
                                }}>
                                    {ex.intensity}
                                </Text>
                            </View>
                            <Text style={{ color: T.colors.purple, fontSize: T.font.xs + 1, fontWeight: '700' }}>+{ex.xp} XP</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Completion card */}
                {allDone && (
                    <Animated.View style={{
                        backgroundColor: T.colors.greenDim, borderRadius: T.radius.xl,
                        padding: 24, alignItems: 'center', marginTop: T.space.sm,
                        borderWidth: 1, borderColor: `${T.colors.green}50`,
                        ...T.glow(T.colors.green, 0.15),
                    }}>
                        <Text style={{ fontSize: 36, marginBottom: 10 }}>🎉</Text>
                        <Text style={{ color: T.colors.green, fontWeight: '900', fontSize: T.font.xl }}>
                            Séance complétée !
                        </Text>
                        <Text style={{ color: T.colors.textSecondary, marginTop: 6, textAlign: 'center', fontSize: T.font.md }}>
                            +{TODAY_EXERCISES.reduce((a, e) => a + e.xp, 0)} XP · Streak maintenu 🔥
                        </Text>
                        <TouchableOpacity
                            style={{
                                marginTop: 16, backgroundColor: T.colors.green,
                                borderRadius: T.radius.md, paddingHorizontal: 24, paddingVertical: 11,
                                ...T.glow(T.colors.green, 0.25),
                            }}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                        >
                            <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.md + 1 }}>
                                Retour au Dashboard
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

            </ScrollView>
            </Animated.View>
        </SafeAreaView>
    )
}

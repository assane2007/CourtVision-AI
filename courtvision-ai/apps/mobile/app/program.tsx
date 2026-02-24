import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { XPBadge } from '../components/XPBadge'

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
    Faible:  '#00C853',
    Modérée: '#FF9800',
    Haute:   '#FF3D57',
}

export default function TrainingProgram() {
    const router     = useRouter()
    const addXP      = useStore(s => s.addXP)
    const [exercises, setExercises] = useState(TODAY_EXERCISES)
    const [xpPopup, setXpPopup]    = useState<{ amount: number; label: string } | null>(null)

    const completedCount = exercises.filter(e => e.done).length
    const progressPct    = (completedCount / exercises.length) * 100
    const progressAnim   = useRef(new Animated.Value(0)).current

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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 38, height: 38, borderRadius: 12,
                            backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D',
                            justifyContent: 'center', alignItems: 'center', marginRight: 14,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Retour"
                    >
                        <Ionicons name="arrow-back" size={20} color="#E6EDF3" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E6EDF3', fontSize: 22, fontWeight: '800' }}>Programme 7 Jours</Text>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Généré par IA · basé sur tes faiblesses</Text>
                    </View>
                </View>

                {/* XP popup */}
                {xpPopup && (
                    <XPBadge
                        amount={xpPopup.amount}
                        label={xpPopup.label}
                        onDone={() => setXpPopup(null)}
                    />
                )}

                {/* Objectif semaine */}
                <View style={{
                    backgroundColor: 'rgba(26,115,232,0.12)', borderRadius: 16,
                    padding: 16, borderWidth: 1, borderColor: 'rgba(26,115,232,0.4)',
                    marginBottom: 24,
                }}>
                    <Text style={{ color: '#1A73E8', fontWeight: '700', marginBottom: 6, fontSize: 14 }}>
                        🎯 Objectif de la semaine
                    </Text>
                    <Text style={{ color: '#E6EDF3', lineHeight: 22, fontSize: 13 }}>
                        Reconstruire ta confiance et stabiliser ton mental sous pression. Focus sur les tirs de mi-distance après drive.
                    </Text>
                </View>

                {/* Calendrier hebdo */}
                <Text style={{ color: '#E6EDF3', fontWeight: '700', fontSize: 17, marginBottom: 12 }}>Cette semaine</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                    {WEEKLY_PROGRAM.map(day => (
                        <View key={day.day} style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ color: '#8B949E', fontSize: 10, marginBottom: 4 }}>{day.label}</Text>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: day.done ? '#00C853' : day.isToday ? '#1A73E8' : '#161B22',
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: day.isToday ? 2 : 0,
                                borderColor: '#00D4FF',
                            }}>
                                {day.done
                                    ? <Ionicons name="checkmark" size={16} color="#FFF" />
                                    : <Text style={{ color: day.isToday ? '#FFF' : '#8B949E', fontWeight: '700', fontSize: 12 }}>{day.day}</Text>
                                }
                            </View>
                            <Text style={{ color: '#484F58', fontSize: 8, marginTop: 3, textAlign: 'center' }}>
                                +{day.xp}xp
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Séance du jour */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: '#E6EDF3', fontWeight: '700', fontSize: 17 }}>Séance d'aujourd'hui</Text>
                    <View style={{ backgroundColor: '#161B22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#21262D' }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>⏱ 30 min</Text>
                    </View>
                </View>

                {/* Progress Bar animée */}
                <View style={{ height: 8, backgroundColor: '#161B22', borderRadius: 4, marginBottom: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#21262D' }}>
                    <Animated.View style={{
                        height: 8, borderRadius: 4, backgroundColor: '#00C853',
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    }} />
                </View>
                <Text style={{ color: '#8B949E', fontSize: 12, marginBottom: 16 }}>
                    {completedCount}/{exercises.length} exercices · +{exercises.filter(e => e.done).reduce((a, e) => a + e.xp, 0)} XP gagnés
                </Text>

                {exercises.map((ex, i) => (
                    <TouchableOpacity
                        key={i}
                        style={{
                            backgroundColor: '#161B22',
                            borderRadius: 15,
                            padding: 18,
                            marginBottom: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            opacity: ex.done ? 0.6 : 1,
                            borderWidth: 1,
                            borderColor: ex.done ? 'rgba(0,200,83,0.25)' : '#21262D',
                        }}
                        onPress={() => toggleExercise(i)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: ex.done }}
                        accessibilityLabel={`${ex.done ? 'Décocher' : 'Cocher'} : ${ex.name}`}
                    >
                        <View style={{
                            width: 28, height: 28, borderRadius: 14,
                            backgroundColor: ex.done ? '#00C853' : 'transparent',
                            borderWidth: 2,
                            borderColor: ex.done ? '#00C853' : '#8B949E',
                            justifyContent: 'center', alignItems: 'center',
                            marginRight: 14,
                        }}>
                            {ex.done && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: '#E6EDF3', fontWeight: '600', fontSize: 14,
                                textDecorationLine: ex.done ? 'line-through' : 'none',
                            }}>
                                {ex.name}
                            </Text>
                            <Text style={{ color: '#8B949E', fontSize: 12, marginTop: 3 }}>
                                {ex.reps}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <View style={{
                                backgroundColor: `${INTENSITY_COLORS[ex.intensity] ?? '#8B949E'}18`,
                                borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                            }}>
                                <Text style={{ color: INTENSITY_COLORS[ex.intensity] ?? '#8B949E', fontSize: 10, fontWeight: '600' }}>
                                    {ex.intensity}
                                </Text>
                            </View>
                            <Text style={{ color: '#B388FF', fontSize: 10, fontWeight: '700' }}>+{ex.xp} XP</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Completion card */}
                {allDone && (
                    <Animated.View style={{
                        backgroundColor: 'rgba(0,200,83,0.12)', borderRadius: 18,
                        padding: 24, alignItems: 'center', marginTop: 8,
                        borderWidth: 1, borderColor: 'rgba(0,200,83,0.35)',
                    }}>
                        <Text style={{ fontSize: 36, marginBottom: 10 }}>🎉</Text>
                        <Text style={{ color: '#00C853', fontWeight: '800', fontSize: 20 }}>Séance complétée !</Text>
                        <Text style={{ color: '#8B949E', marginTop: 6, textAlign: 'center', fontSize: 13 }}>
                            +{TODAY_EXERCISES.reduce((a, e) => a + e.xp, 0)} XP · Streak maintenu 🔥
                        </Text>
                        <TouchableOpacity
                            style={{
                                marginTop: 16, backgroundColor: '#00C853',
                                borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11,
                            }}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                        >
                            <Text style={{ color: '#0D1117', fontWeight: '800', fontSize: 14 }}>
                                Retour au Dashboard
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

            </ScrollView>
        </SafeAreaView>
    )
}

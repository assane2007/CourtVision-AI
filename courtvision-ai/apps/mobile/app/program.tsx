import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'

const WEEKLY_PROGRAM = [
    { day: 1, label: 'Lun', focus: 'Mécanique de tir', duration: 45, done: true },
    { day: 2, label: 'Mar', focus: 'Défense & Footwork', duration: 40, done: true },
    { day: 3, label: 'Mer', focus: 'Récupération active', duration: 30, done: false, isToday: true },
    { day: 4, label: 'Jeu', focus: 'Création 1v1', duration: 50, done: false },
    { day: 5, label: 'Ven', focus: 'Pression mentale', duration: 45, done: false },
    { day: 6, label: 'Sam', focus: 'Match 2v2', duration: 60, done: false },
    { day: 7, label: 'Dim', focus: 'Test & Vidéo', duration: 30, done: false }
]

const TODAY_EXERCISES = [
    { name: 'Navettes terrain complet', reps: '10 allers-retours', intensity: 'Modérée', done: false },
    { name: 'Visualisation mentale', reps: '15 minutes', intensity: 'Faible', done: false },
    { name: 'Dribbles côté faible', reps: '4 séries x 5 min', intensity: 'Modérée', done: false }
]

export default function TrainingProgram() {
    const router = useRouter()
    const [exercises, setExercises] = useState(TODAY_EXERCISES)

    const toggleExercise = (i: number) => {
        setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, done: !ex.done } : ex))
    }

    const completedCount = exercises.filter(e => e.done).length
    const progressPct = (completedCount / exercises.length) * 100

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                        <Ionicons name="arrow-back" size={24} color="#E6EDF3" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ color: '#E6EDF3', fontSize: 22, fontWeight: 'bold' }}>Programme 7 Jours</Text>
                        <Text style={{ color: '#8B949E', fontSize: 13 }}>Généré par l'IA Groq — basé sur tes faiblesses</Text>
                    </View>
                </View>

                {/* Objectif semaine */}
                <View style={{ backgroundColor: 'rgba(26,115,232,0.15)', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#1A73E8', marginBottom: 25 }}>
                    <Text style={{ color: '#1A73E8', fontWeight: 'bold', marginBottom: 5 }}>🎯 Objectif de la semaine</Text>
                    <Text style={{ color: '#E6EDF3', lineHeight: 22 }}>
                        Reconstruire ta confiance et stabiliser ton mental sous pression. Focus sur les tirs de mi-distance après drive.
                    </Text>
                </View>

                {/* Calendrier hebdo */}
                <Text style={{ color: '#E6EDF3', fontWeight: '600', fontSize: 18, marginBottom: 12 }}>Cette semaine</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
                    {WEEKLY_PROGRAM.map(day => (
                        <View key={day.day} style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ color: '#8B949E', fontSize: 11, marginBottom: 4 }}>{day.label}</Text>
                            <View style={{
                                width: 38, height: 38, borderRadius: 19,
                                backgroundColor: day.done ? '#00C853' : day.isToday ? '#1A73E8' : '#161B22',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderWidth: day.isToday ? 2 : 0,
                                borderColor: '#00D4FF'
                            }}>
                                {day.done
                                    ? <Ionicons name="checkmark" size={18} color="#FFF" />
                                    : <Text style={{ color: day.isToday ? '#FFF' : '#8B949E', fontWeight: 'bold', fontSize: 13 }}>{day.day}</Text>
                                }
                            </View>
                        </View>
                    ))}
                </View>

                {/* Séance du jour */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: '#E6EDF3', fontWeight: '600', fontSize: 18 }}>Séance d'aujourd'hui</Text>
                    <View style={{ backgroundColor: '#161B22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>⏱ 30 min</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={{ height: 8, backgroundColor: '#161B22', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
                    <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#00C853', borderRadius: 4 }} />
                </View>
                <Text style={{ color: '#8B949E', fontSize: 12, marginBottom: 15 }}>{completedCount}/{exercises.length} exercices complétés</Text>

                {exercises.map((ex, i) => (
                    <TouchableOpacity
                        key={i}
                        style={{
                            backgroundColor: '#161B22',
                            borderRadius: 15,
                            padding: 18,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            opacity: ex.done ? 0.6 : 1
                        }}
                        onPress={() => toggleExercise(i)}
                    >
                        <View style={{
                            width: 28, height: 28, borderRadius: 14,
                            backgroundColor: ex.done ? '#00C853' : 'transparent',
                            borderWidth: 2,
                            borderColor: ex.done ? '#00C853' : '#8B949E',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 15
                        }}>
                            {ex.done && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#E6EDF3', fontWeight: '600', fontSize: 15, textDecorationLine: ex.done ? 'line-through' : 'none' }}>
                                {ex.name}
                            </Text>
                            <Text style={{ color: '#8B949E', fontSize: 13, marginTop: 3 }}>{ex.reps} · Intensité {ex.intensity}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {completedCount === exercises.length && (
                    <View style={{ backgroundColor: 'rgba(0,200,83,0.15)', borderRadius: 15, padding: 20, alignItems: 'center', marginTop: 10 }}>
                        <Text style={{ fontSize: 30, marginBottom: 10 }}>🎉</Text>
                        <Text style={{ color: '#00C853', fontWeight: 'bold', fontSize: 18 }}>Séance complétée !</Text>
                        <Text style={{ color: '#8B949E', marginTop: 5, textAlign: 'center' }}>+15 XP · Streak maintenu 🔥</Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    )
}

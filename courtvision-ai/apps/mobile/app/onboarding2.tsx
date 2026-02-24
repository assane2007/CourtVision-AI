import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '../lib/store'

const POSITIONS = [
    { label: 'Meneur (PG)',     value: 'PG', emoji: '⚡', desc: 'Passeur, leader, vision du jeu' },
    { label: 'Arrière (SG)',    value: 'SG', emoji: '🎯', desc: 'Scoreur, tireur à longue distance' },
    { label: 'Ailier (SF)',     value: 'SF', emoji: '🦅', desc: 'Polyvalent, attaque et défense' },
    { label: 'Ailier Fort (PF)', value: 'PF', emoji: '💪', desc: 'Puissance, rebonds, physique' },
    { label: 'Pivot (C)',       value: 'C',  emoji: '🛡️', desc: 'Protection de cercle, domination intérieure' },
]

const LEVELS = [
    { label: 'Débutant',       value: 'Débutant',       emoji: '🌱', desc: '< 1 an de pratique' },
    { label: 'Intermédiaire',  value: 'Intermédiaire',  emoji: '⚡', desc: '1–3 ans, compétitions régionales' },
    { label: 'Avancé',         value: 'Avancé',         emoji: '🔥', desc: '3–5 ans, niveau régional+' },
    { label: 'Pro',            value: 'Pro',            emoji: '💎', desc: '5+ ans, niveau national' },
]

const C = {
    bg: '#0D1117', card: '#161B22', border: '#21262D',
    blue: '#1A73E8', accent: '#00D4FF',
    white: '#E6EDF3', muted: '#8B949E', dim: '#484F58',
    green: '#00C853',
}

export default function Onboarding2() {
    const router   = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const [step, setStep] = useState<'position' | 'level'>('position')
    const [selectedPos, setSelectedPos]   = useState<string | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start()
    }, [step])

    const goToLevel = () => {
        fadeAnim.setValue(0)
        slideAnim.setValue(30)
        setStep('level')
    }

    const handleContinue = () => {
        // Pré-remplir le profil du store avec les choix d'onboarding
        useStore.setState(s => ({
            user: s.user
                ? { ...s.user, position: selectedPos ?? 'PG', level: selectedLevel ?? 'Intermédiaire' }
                : {
                    id: '', username: '', full_name: 'Joueur',
                    position: selectedPos ?? 'PG', level: selectedLevel ?? 'Intermédiaire',
                    streak: 0, mental_score: 0, shooting_grade: 'B',
                    shooting_fg_pct: 0, xp: 0, xp_level: 1,
                    total_sessions: 0, badges_count: 0,
                },
        }))
        router.push('/onboarding-camera')
    }

    const isPositionStep = step === 'position'
    const canContinuePos = !!selectedPos
    const canContinueLvl = !!selectedLevel
    const stepIndex = isPositionStep ? 1 : 2

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity onPress={() => step === 'level' ? setStep('position') : router.back()} style={{ marginBottom: 12 }}>
                    <Ionicons name="arrow-back" size={24} color={C.muted} />
                </TouchableOpacity>

                {/* Progress */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            backgroundColor: i < stepIndex ? C.blue : C.card,
                        }} />
                    ))}
                </View>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    {isPositionStep ? (
                        <>
                            <Text style={{ color: C.white, fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 }}>
                                Quel est ton poste ?
                            </Text>
                            <Text style={{ color: C.muted, fontSize: 15, marginBottom: 24, lineHeight: 22 }}>
                                Ton IA Digital Twin sera optimisé pour ta position spécifique.
                            </Text>

                            {POSITIONS.map((p) => {
                                const isSelected = selectedPos === p.value
                                return (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={{
                                            backgroundColor: isSelected ? `${C.blue}18` : C.card,
                                            padding: 18, borderRadius: 16, marginBottom: 10,
                                            borderWidth: 1.5, borderColor: isSelected ? C.blue : C.border,
                                            flexDirection: 'row', alignItems: 'center',
                                        }}
                                        onPress={() => setSelectedPos(p.value)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={{ fontSize: 26, marginRight: 14 }}>{p.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{p.label}</Text>
                                            <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{p.desc}</Text>
                                        </View>
                                        {isSelected && <Ionicons name="checkmark-circle" size={24} color={C.blue} />}
                                    </TouchableOpacity>
                                )
                            })}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: canContinuePos ? C.blue : C.card,
                                    paddingVertical: 18, borderRadius: 30,
                                    alignItems: 'center', opacity: canContinuePos ? 1 : 0.45,
                                    marginTop: 16,
                                    shadowColor: C.blue, shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: canContinuePos ? 0.3 : 0, shadowRadius: 10,
                                }}
                                onPress={goToLevel}
                                disabled={!canContinuePos}
                                activeOpacity={0.85}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>Continuer →</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={{ color: C.white, fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 }}>
                                Ton niveau actuel ?
                            </Text>
                            <Text style={{ color: C.muted, fontSize: 15, marginBottom: 24, lineHeight: 22 }}>
                                Calibre les attentes de l'IA pour des analyses précises dès le départ.
                            </Text>

                            {LEVELS.map((l) => {
                                const isSelected = selectedLevel === l.value
                                return (
                                    <TouchableOpacity
                                        key={l.value}
                                        style={{
                                            backgroundColor: isSelected ? `${C.green}14` : C.card,
                                            padding: 18, borderRadius: 16, marginBottom: 10,
                                            borderWidth: 1.5, borderColor: isSelected ? C.green : C.border,
                                            flexDirection: 'row', alignItems: 'center',
                                        }}
                                        onPress={() => setSelectedLevel(l.value)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={{ fontSize: 26, marginRight: 14 }}>{l.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{l.label}</Text>
                                            <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{l.desc}</Text>
                                        </View>
                                        {isSelected && <Ionicons name="checkmark-circle" size={24} color={C.green} />}
                                    </TouchableOpacity>
                                )
                            })}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: canContinueLvl ? C.blue : C.card,
                                    paddingVertical: 18, borderRadius: 30,
                                    alignItems: 'center', opacity: canContinueLvl ? 1 : 0.45,
                                    marginTop: 16,
                                    shadowColor: C.blue, shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: canContinueLvl ? 0.3 : 0, shadowRadius: 10,
                                }}
                                onPress={handleContinue}
                                disabled={!canContinueLvl}
                                activeOpacity={0.85}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>
                                    🚀 C'est parti !
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    )
}

import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '../lib/store'
import { T } from '../lib/theme'

const POSITIONS = [
    { label: 'Meneur (PG)',      value: 'PG', emoji: '⚡', desc: 'Passeur, leader, vision du jeu' },
    { label: 'Arrière (SG)',     value: 'SG', emoji: '🎯', desc: 'Scoreur, tireur à longue distance' },
    { label: 'Ailier (SF)',      value: 'SF', emoji: '🦅', desc: 'Polyvalent, attaque et défense' },
    { label: 'Ailier Fort (PF)', value: 'PF', emoji: '💪', desc: 'Puissance, rebonds, physique' },
    { label: 'Pivot (C)',        value: 'C',  emoji: '🛡️', desc: 'Protection de cercle, domination intérieure' },
]

const LEVELS = [
    { label: 'Débutant',      value: 'Débutant',      emoji: '🌱', desc: '< 1 an de pratique' },
    { label: 'Intermédiaire', value: 'Intermédiaire', emoji: '⚡', desc: '1–3 ans, compétitions régionales' },
    { label: 'Avancé',        value: 'Avancé',        emoji: '🔥', desc: '3–5 ans, niveau régional+' },
    { label: 'Pro',           value: 'Pro',           emoji: '💎', desc: '5+ ans, niveau national' },
]

export default function Onboarding2() {
    const router    = useRouter()
    const fadeAnim  = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const [step, setStep] = useState<'position' | 'level'>('position')
    const [selectedPos, setSelectedPos]     = useState<string | null>(null)
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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <ScrollView contentContainerStyle={{ padding: T.space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity onPress={() => step === 'level' ? setStep('position') : router.back()} style={{ marginBottom: T.space.md }}>
                    <View style={{
                        width: 40, height: 40, borderRadius: T.radius.md,
                        ...T.glass.light,
                        justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Ionicons name="arrow-back" size={20} color={T.colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Progress */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: T.space.xxl }}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            backgroundColor: i < stepIndex ? T.colors.accent : T.colors.dimmer,
                            ...(i < stepIndex ? { ...T.glow(T.colors.accent, 0.15) } : {}),
                        }} />
                    ))}
                </View>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    {isPositionStep ? (
                        <>
                            <Text style={{
                                color: T.colors.white, fontSize: T.font.xxxl,
                                fontWeight: '900', marginBottom: 6, letterSpacing: -0.5,
                            }}>
                                Quel est ton poste ?
                            </Text>
                            <Text style={{
                                color: T.colors.textSecondary, fontSize: T.font.base,
                                marginBottom: T.space.xxl, lineHeight: 22,
                            }}>
                                Ton IA Digital Twin sera optimisé pour ta position spécifique.
                            </Text>

                            {POSITIONS.map((p) => {
                                const isSelected = selectedPos === p.value
                                return (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={{
                                            ...(isSelected ? T.glass.accent : T.glass.light),
                                            padding: T.space.lg + 2, borderRadius: T.radius.lg, marginBottom: 10,
                                            borderWidth: isSelected ? 1.5 : 1,
                                            borderColor: isSelected ? T.colors.accent : T.colors.border,
                                            flexDirection: 'row', alignItems: 'center',
                                            ...(isSelected ? T.glow(T.colors.accent, 0.12) : {}),
                                        }}
                                        onPress={() => setSelectedPos(p.value)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={{
                                            width: 48, height: 48, borderRadius: T.radius.md,
                                            backgroundColor: isSelected ? T.colors.accentDim : T.colors.dimmer,
                                            justifyContent: 'center', alignItems: 'center', marginRight: 14,
                                        }}>
                                            <Text style={{ fontSize: 24 }}>{p.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '700' }}>{p.label}</Text>
                                            <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 3 }}>{p.desc}</Text>
                                        </View>
                                        {isSelected && (
                                            <View style={{
                                                width: 26, height: 26, borderRadius: 13,
                                                backgroundColor: T.colors.accent, justifyContent: 'center', alignItems: 'center',
                                            }}>
                                                <Ionicons name="checkmark" size={16} color={T.colors.bg} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )
                            })}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: canContinuePos ? T.colors.accent : T.colors.dimmer,
                                    paddingVertical: 18, borderRadius: T.radius.pill,
                                    alignItems: 'center', opacity: canContinuePos ? 1 : 0.45,
                                    marginTop: T.space.lg,
                                    ...(canContinuePos ? T.glow(T.colors.accent, 0.3) : {}),
                                }}
                                onPress={goToLevel}
                                disabled={!canContinuePos}
                                activeOpacity={0.85}
                            >
                                <Text style={{ color: canContinuePos ? T.colors.bg : T.colors.muted, fontWeight: '800', fontSize: T.font.lg }}>
                                    Continuer →
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={{
                                color: T.colors.white, fontSize: T.font.xxxl,
                                fontWeight: '900', marginBottom: 6, letterSpacing: -0.5,
                            }}>
                                Ton niveau actuel ?
                            </Text>
                            <Text style={{
                                color: T.colors.textSecondary, fontSize: T.font.base,
                                marginBottom: T.space.xxl, lineHeight: 22,
                            }}>
                                Calibre les attentes de l'IA pour des analyses précises dès le départ.
                            </Text>

                            {LEVELS.map((l) => {
                                const isSelected = selectedLevel === l.value
                                return (
                                    <TouchableOpacity
                                        key={l.value}
                                        style={{
                                            backgroundColor: isSelected ? T.colors.greenDim : T.colors.cardGlass,
                                            padding: T.space.lg + 2, borderRadius: T.radius.lg, marginBottom: 10,
                                            borderWidth: isSelected ? 1.5 : 1,
                                            borderColor: isSelected ? T.colors.green : T.colors.border,
                                            flexDirection: 'row', alignItems: 'center',
                                            ...(isSelected ? T.glow(T.colors.green, 0.12) : {}),
                                        }}
                                        onPress={() => setSelectedLevel(l.value)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={{
                                            width: 48, height: 48, borderRadius: T.radius.md,
                                            backgroundColor: isSelected ? T.colors.greenDim : T.colors.dimmer,
                                            justifyContent: 'center', alignItems: 'center', marginRight: 14,
                                        }}>
                                            <Text style={{ fontSize: 24 }}>{l.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '700' }}>{l.label}</Text>
                                            <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 3 }}>{l.desc}</Text>
                                        </View>
                                        {isSelected && (
                                            <View style={{
                                                width: 26, height: 26, borderRadius: 13,
                                                backgroundColor: T.colors.green, justifyContent: 'center', alignItems: 'center',
                                            }}>
                                                <Ionicons name="checkmark" size={16} color={T.colors.bg} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )
                            })}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: canContinueLvl ? T.colors.accent : T.colors.dimmer,
                                    paddingVertical: 18, borderRadius: T.radius.pill,
                                    alignItems: 'center', opacity: canContinueLvl ? 1 : 0.45,
                                    marginTop: T.space.lg,
                                    ...(canContinueLvl ? T.glow(T.colors.accent, 0.3) : {}),
                                }}
                                onPress={handleContinue}
                                disabled={!canContinueLvl}
                                activeOpacity={0.85}
                            >
                                <Text style={{ color: canContinueLvl ? T.colors.bg : T.colors.muted, fontWeight: '800', fontSize: T.font.lg }}>
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

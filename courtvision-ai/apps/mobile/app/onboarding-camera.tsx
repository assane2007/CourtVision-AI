import { View, Text, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef, useState } from 'react'
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { T } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const CAMERA_STEPS = [
    {
        id: 'placement', emoji: '📱',
        title: 'Place ton téléphone',
        subtitle: 'Position idéale pour l\'analyse IA',
        description: 'Pose ton téléphone en format paysage, à hauteur de poitrine, entre 3 et 5 mètres du terrain.',
        tips: [
            { icon: 'resize', text: 'Distance : 3–5 mètres du terrain', important: true },
            { icon: 'phone-landscape-outline', text: 'Mode paysage obligatoire', important: true },
            { icon: 'eye-outline', text: 'Le terrain doit être visible en entier', important: false },
            { icon: 'alert-circle-outline', text: 'Évite les contre-jours directs', important: false },
        ],
        diagram: 'placement',
    },
    {
        id: 'stability', emoji: '🔒',
        title: 'Stabilise l\'image',
        subtitle: 'L\'IA a besoin d\'une image stable',
        description: 'Utilise un trépied, un banc, ou cale ton téléphone contre un mur. L\'IA perd en précision si l\'image bouge.',
        tips: [
            { icon: 'easel-outline', text: 'Idéal : trépied ou support', important: true },
            { icon: 'cube-outline', text: 'Alternative : banc, mur, sac', important: false },
            { icon: 'hand-left-outline', text: 'Évite de filmer à main levée', important: true },
            { icon: 'timer-outline', text: 'Laisse le téléphone fixe pendant toute la session', important: false },
        ],
        diagram: 'stability',
    },
    {
        id: 'lighting', emoji: '💡',
        title: 'Éclairage & Cadrage',
        subtitle: 'Optimise la qualité vidéo',
        description: 'L\'IA détecte mieux tes mouvements avec un bon éclairage. Évite les ombres dures et les reflets.',
        tips: [
            { icon: 'sunny-outline', text: 'Extérieur : soleil dans le dos', important: true },
            { icon: 'bulb-outline', text: 'Intérieur : lumière uniforme', important: false },
            { icon: 'contrast-outline', text: 'Évite les zones de fort contraste', important: false },
            { icon: 'shirt-outline', text: 'Porte des vêtements visibles (pas blanc sur blanc)', important: false },
        ],
        diagram: 'lighting',
    },
    {
        id: 'ready', emoji: '🚀',
        title: 'Tu es prêt !',
        subtitle: 'L\'IA fait le reste',
        description: 'Lance une session et joue naturellement. CourtVision AI analyse tes tirs, tes déplacements et ton mental en temps réel.',
        tips: [
            { icon: 'basketball-outline', text: 'Joue normalement — l\'IA s\'adapte', important: false },
            { icon: 'analytics-outline', text: 'Résultats disponibles en ~2 minutes', important: false },
            { icon: 'notifications-outline', text: 'Active les notifs pour ton rapport', important: false },
            { icon: 'infinite-outline', text: 'Plus tu joues, plus ton Twin est précis', important: true },
        ],
        diagram: 'ready',
    },
]

export default function OnboardingCamera() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const progressAnim = useRef(new Animated.Value(0)).current

    const step = CAMERA_STEPS[currentStep]
    const isLastStep = currentStep === CAMERA_STEPS.length - 1

    useEffect(() => {
        fadeAnim.setValue(0)
        slideAnim.setValue(30)
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start()
        Animated.timing(progressAnim, {
            toValue: (currentStep + 1) / CAMERA_STEPS.length,
            duration: 300,
            useNativeDriver: false,
        }).start()
    }, [currentStep])

    const handleNext = () => {
        if (isLastStep) { router.push('/onboarding3') }
        else { setCurrentStep(prev => prev + 1) }
    }
    const handleSkip = () => { router.push('/onboarding3') }
    const handleBack = () => {
        if (currentStep > 0) { setCurrentStep(prev => prev - 1) }
        else { router.back() }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Header */}
            <View style={{ paddingHorizontal: T.space.xl, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.space.md }}>
                    <TouchableOpacity onPress={handleBack} accessibilityLabel="Retour">
                        <View style={{
                            width: 40, height: 40, borderRadius: T.radius.md,
                            ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Ionicons name="arrow-back" size={20} color={T.colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.md + 1 }}>Passer</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View style={{
                    height: 4, backgroundColor: T.colors.dimmer,
                    borderRadius: 2, marginBottom: 6,
                }}>
                    <Animated.View style={{
                        height: 4, backgroundColor: T.colors.accent, borderRadius: 2,
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        ...T.glow(T.colors.accent, 0.15),
                    }} />
                </View>
                <Text style={{ color: T.colors.dim, fontSize: T.font.sm, textAlign: 'right', marginBottom: 4 }}>
                    {currentStep + 1}/{CAMERA_STEPS.length}
                </Text>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: T.space.xl, paddingBottom: 30, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>

                    {/* Emoji + Title */}
                    <View style={{ alignItems: 'center', marginTop: 10, marginBottom: T.space.xl }}>
                        <View style={{
                            width: 88, height: 88, borderRadius: T.radius.xl,
                            ...T.glass.accent,
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: 16,
                            ...T.glow(T.colors.accent, 0.15),
                        }}>
                            <Text style={{ fontSize: 42 }}>{step.emoji}</Text>
                        </View>
                        <Text style={{
                            color: T.colors.white, fontSize: T.font.xxl,
                            fontWeight: '900', letterSpacing: -0.5, textAlign: 'center',
                        }}>
                            {step.title}
                        </Text>
                        <Text style={{
                            color: T.colors.accent, fontSize: T.font.md + 1,
                            fontWeight: '500', textAlign: 'center', marginTop: 4,
                        }}>
                            {step.subtitle}
                        </Text>
                    </View>

                    {/* Diagram */}
                    <CameraDiagram type={step.diagram} />

                    {/* Description */}
                    <Text style={{
                        color: T.colors.textSecondary, fontSize: T.font.md + 1,
                        lineHeight: 22, textAlign: 'center', marginBottom: T.space.xl, paddingHorizontal: 10,
                    }}>
                        {step.description}
                    </Text>

                    {/* Tips */}
                    <View style={{ marginBottom: T.space.xl }}>
                        {step.tips.map((tip, i) => (
                            <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center',
                                ...(tip.important ? T.glass.accent : T.glass.light),
                                borderRadius: T.radius.md, padding: 14, marginBottom: 8,
                            }}>
                                <Ionicons
                                    name={tip.icon as any}
                                    size={20}
                                    color={tip.important ? T.colors.accent : T.colors.muted}
                                />
                                <Text style={{
                                    color: tip.important ? T.colors.white : T.colors.textSecondary,
                                    fontSize: T.font.md + 1, marginLeft: 12, flex: 1, lineHeight: 20,
                                    fontWeight: tip.important ? '600' : '400',
                                }}>
                                    {tip.text}
                                </Text>
                                {tip.important && (
                                    <View style={{
                                        backgroundColor: T.colors.accentDim,
                                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                                    }}>
                                        <Text style={{ color: T.colors.accent, fontSize: T.font.xs, fontWeight: '700' }}>CLÉ</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={{ paddingHorizontal: T.space.xl, paddingBottom: 20 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.colors.accent,
                        paddingVertical: 18, borderRadius: T.radius.pill,
                        alignItems: 'center',
                        ...T.glow(T.colors.accent, 0.3),
                    }}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.lg }}>
                        {isLastStep ? '🏀 Commencer' : 'Suivant →'}
                    </Text>
                </TouchableOpacity>

                {/* Step dots */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
                    {CAMERA_STEPS.map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setCurrentStep(i)}
                            style={{
                                width: i === currentStep ? 24 : 8,
                                height: 8, borderRadius: 4,
                                backgroundColor: i === currentStep ? T.colors.accent : T.colors.dimmer,
                                marginHorizontal: 3,
                                ...(i === currentStep ? T.glow(T.colors.accent, 0.2) : {}),
                            }}
                        />
                    ))}
                </View>
            </View>
        </SafeAreaView>
    )
}

// ── Camera Diagram ──
function CameraDiagram({ type }: { type: string }) {
    const pulseAnim = useRef(new Animated.Value(0.8)).current
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
        ])).start()
    }, [])

    if (type === 'placement') {
        return (
            <View style={{
                height: 180, marginBottom: T.space.xl,
                ...T.glass.light, borderRadius: T.radius.lg,
                justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
            }}>
                <View style={{
                    width: SCREEN_WIDTH - 80, height: 100,
                    borderWidth: 2, borderColor: T.colors.borderAccent,
                    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                    position: 'relative',
                }}>
                    <View style={{
                        width: '40%', height: '60%',
                        borderWidth: 1, borderColor: `${T.colors.accent}20`, borderRadius: 4,
                    }} />
                    <View style={{
                        width: 30, height: 30, borderRadius: 15,
                        borderWidth: 1, borderColor: `${T.colors.accent}20`, position: 'absolute',
                    }} />
                    <Animated.View style={{
                        position: 'absolute', top: 20,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: T.colors.accent, opacity: pulseAnim,
                        ...T.glow(T.colors.accent, 0.3),
                    }} />
                    <Text style={{ position: 'absolute', top: 45, color: T.colors.muted, fontSize: T.font.xs }}>Joueur</Text>
                </View>
                <View style={{ position: 'absolute', bottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20 }}>📱</Text>
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: T.colors.accent, fontSize: T.font.xs + 1, fontWeight: '700' }}>3–5m</Text>
                        <Text style={{ color: T.colors.dim, fontSize: T.font.xs - 1 }}>Paysage • Fixe</Text>
                    </View>
                </View>
            </View>
        )
    }

    if (type === 'stability') {
        return (
            <View style={{
                height: 160, marginBottom: T.space.xl,
                ...T.glass.light, borderRadius: T.radius.lg,
                flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
                paddingHorizontal: T.space.xl,
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: T.colors.greenDim,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.green}40`,
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <View style={{ width: 2, height: 20, backgroundColor: T.colors.muted, marginTop: 2 }} />
                    </View>
                    <Text style={{ color: T.colors.green, fontSize: T.font.sm, fontWeight: '700', marginTop: 8 }}>✅ Trépied</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: T.colors.orangeDim,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.orange}40`,
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <View style={{ width: 40, height: 8, backgroundColor: T.colors.muted, borderRadius: 2, marginTop: 4 }} />
                    </View>
                    <Text style={{ color: T.colors.orange, fontSize: T.font.sm, fontWeight: '700', marginTop: 8 }}>⚠️ Support</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Animated.View style={{
                        width: 50, height: 60, backgroundColor: T.colors.redDim,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.red}40`,
                        transform: [{ rotate: '5deg' }, { scale: pulseAnim }],
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <Text style={{ fontSize: 10 }}>🤚</Text>
                    </Animated.View>
                    <Text style={{ color: T.colors.red, fontSize: T.font.sm, fontWeight: '700', marginTop: 8 }}>❌ Main</Text>
                </View>
            </View>
        )
    }

    if (type === 'lighting') {
        return (
            <View style={{
                height: 140, marginBottom: T.space.xl,
                ...T.glass.light, borderRadius: T.radius.lg,
                flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
                paddingHorizontal: T.space.xl,
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: T.colors.greenDim,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.green}30`,
                    }}>
                        <Text style={{ fontSize: 20 }}>☀️</Text>
                        <Text style={{ fontSize: 8, color: T.colors.muted, marginTop: 2 }}>↓</Text>
                        <Text style={{ fontSize: 16 }}>📱</Text>
                    </View>
                    <Text style={{ color: T.colors.green, fontSize: T.font.xs + 1, fontWeight: '600', marginTop: 6 }}>✅ Soleil derrière</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: T.colors.redDim,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.red}30`,
                    }}>
                        <Text style={{ fontSize: 16 }}>📱</Text>
                        <Text style={{ fontSize: 8, color: T.colors.muted, marginTop: 2 }}>↓</Text>
                        <Text style={{ fontSize: 20 }}>☀️</Text>
                    </View>
                    <Text style={{ color: T.colors.red, fontSize: T.font.xs + 1, fontWeight: '600', marginTop: 6 }}>❌ Contre-jour</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: T.colors.accentDim,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: T.colors.borderAccent,
                    }}>
                        <Text style={{ fontSize: 20 }}>💡</Text>
                        <Text style={{ fontSize: 16, marginTop: 4 }}>🏟️</Text>
                    </View>
                    <Text style={{ color: T.colors.accent, fontSize: T.font.xs + 1, fontWeight: '600', marginTop: 6 }}>✅ Gym éclairé</Text>
                </View>
            </View>
        )
    }

    // Ready state
    return (
        <View style={{
            height: 160, marginBottom: T.space.xl,
            ...T.glass.accent, borderRadius: T.radius.lg,
            justifyContent: 'center', alignItems: 'center',
        }}>
            <Animated.View style={{
                transform: [{ scale: pulseAnim }],
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: T.colors.accentDim,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.colors.borderAccent,
                ...T.glow(T.colors.accent, 0.2),
            }}>
                <Text style={{ fontSize: 40 }}>🏀</Text>
            </Animated.View>
            <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '700', marginTop: 12 }}>
                Ton coach IA est prêt
            </Text>
            <Text style={{ color: T.colors.dim, fontSize: T.font.sm }}>
                Analyse • Digital Twin • Highlights
            </Text>
        </View>
    )
}

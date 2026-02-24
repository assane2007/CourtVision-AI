import { View, Text, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef, useState } from 'react'
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ==========================================
// Données des étapes du tutoriel
// ==========================================

const CAMERA_STEPS = [
    {
        id: 'placement',
        emoji: '📱',
        title: 'Place ton téléphone',
        subtitle: 'Position idéale pour l\'analyse IA',
        description: 'Pose ton téléphone en format paysage, à hauteur de poitrine, entre 3 et 5 mètres du terrain.',
        tips: [
            { icon: 'resize', text: 'Distance : 3–5 mètres du terrain', important: true },
            { icon: 'phone-landscape-outline', text: 'Mode paysage obligatoire', important: true },
            { icon: 'eye-outline', text: 'Le terrain doit être visible en entier', important: false },
            { icon: 'alert-circle-outline', text: 'Évite les contre-jours directs', important: false },
        ],
        diagram: 'placement', // Will render a custom diagram
    },
    {
        id: 'stability',
        emoji: '🔒',
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
        id: 'lighting',
        emoji: '💡',
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
        id: 'ready',
        emoji: '🚀',
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

// ==========================================
// Composant Principal
// ==========================================

export default function OnboardingCamera() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const progressAnim = useRef(new Animated.Value(0)).current

    const step = CAMERA_STEPS[currentStep]
    const isLastStep = currentStep === CAMERA_STEPS.length - 1

    useEffect(() => {
        // Animate in
        fadeAnim.setValue(0)
        slideAnim.setValue(30)
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start()

        // Progress bar
        Animated.timing(progressAnim, {
            toValue: (currentStep + 1) / CAMERA_STEPS.length,
            duration: 300,
            useNativeDriver: false,
        }).start()
    }, [currentStep])

    const handleNext = () => {
        if (isLastStep) {
            router.push('/onboarding3')
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handleSkip = () => {
        router.push('/onboarding3')
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        } else {
            router.back()
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            {/* ── Header ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <TouchableOpacity onPress={handleBack} accessibilityLabel="Retour">
                        <Ionicons name="arrow-back" size={24} color="#8B949E" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={{ color: '#8B949E', fontSize: 14 }}>Passer</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Progress Bar ── */}
                <View style={{ height: 4, backgroundColor: '#161B22', borderRadius: 2, marginBottom: 6 }}>
                    <Animated.View style={{
                        height: 4,
                        backgroundColor: '#00D4FF',
                        borderRadius: 2,
                        width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                        }),
                    }} />
                </View>
                <Text style={{ color: '#484F58', fontSize: 11, textAlign: 'right', marginBottom: 4 }}>
                    {currentStep + 1}/{CAMERA_STEPS.length}
                </Text>
            </View>

            {/* ── Content ── */}
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>

                    {/* Emoji + Title */}
                    <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 20,
                            backgroundColor: '#161B22',
                            justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1.5, borderColor: 'rgba(0,212,255,0.2)',
                            marginBottom: 16,
                        }}>
                            <Text style={{ fontSize: 40 }}>{step.emoji}</Text>
                        </View>
                        <Text style={{
                            color: '#E6EDF3', fontSize: 26, fontWeight: '800',
                            letterSpacing: -0.3, textAlign: 'center',
                        }}>
                            {step.title}
                        </Text>
                        <Text style={{
                            color: '#00D4FF', fontSize: 14, fontWeight: '500',
                            textAlign: 'center', marginTop: 4,
                        }}>
                            {step.subtitle}
                        </Text>
                    </View>

                    {/* Diagram */}
                    <CameraDiagram type={step.diagram} />

                    {/* Description */}
                    <Text style={{
                        color: '#8B949E', fontSize: 14, lineHeight: 22,
                        textAlign: 'center', marginBottom: 20, paddingHorizontal: 10,
                    }}>
                        {step.description}
                    </Text>

                    {/* Tips */}
                    <View style={{ marginBottom: 20 }}>
                        {step.tips.map((tip, i) => (
                            <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: tip.important ? 'rgba(0,212,255,0.08)' : '#161B22',
                                borderRadius: 12, padding: 14, marginBottom: 8,
                                borderWidth: tip.important ? 1 : 0,
                                borderColor: tip.important ? 'rgba(0,212,255,0.2)' : 'transparent',
                            }}>
                                <Ionicons
                                    name={tip.icon as any}
                                    size={20}
                                    color={tip.important ? '#00D4FF' : '#8B949E'}
                                />
                                <Text style={{
                                    color: tip.important ? '#E6EDF3' : '#8B949E',
                                    fontSize: 14, marginLeft: 12, flex: 1, lineHeight: 20,
                                    fontWeight: tip.important ? '600' : '400',
                                }}>
                                    {tip.text}
                                </Text>
                                {tip.important && (
                                    <View style={{
                                        backgroundColor: 'rgba(0,212,255,0.15)',
                                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                                    }}>
                                        <Text style={{ color: '#00D4FF', fontSize: 9, fontWeight: '700' }}>IMPORTANT</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* ── Bottom CTA ── */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#00D4FF',
                        paddingVertical: 18,
                        borderRadius: 30,
                        alignItems: 'center',
                        shadowColor: '#00D4FF',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Text style={{ color: '#0D1117', fontWeight: '700', fontSize: 18 }}>
                        {isLastStep ? '🏀 Commencer' : 'Suivant'}
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
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: i === currentStep ? '#00D4FF' : '#30363D',
                                marginHorizontal: 3,
                            }}
                        />
                    ))}
                </View>
            </View>
        </SafeAreaView>
    )
}

// ==========================================
// Camera Diagram — Visual guide per step
// ==========================================

function CameraDiagram({ type }: { type: string }) {
    const pulseAnim = useRef(new Animated.Value(0.8)).current

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    if (type === 'placement') {
        return (
            <View style={{
                height: 180, marginBottom: 20,
                backgroundColor: '#161B22', borderRadius: 16,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 1, borderColor: '#21262D',
                overflow: 'hidden',
            }}>
                {/* Court representation */}
                <View style={{
                    width: SCREEN_WIDTH - 80, height: 100,
                    borderWidth: 2, borderColor: 'rgba(0,212,255,0.2)',
                    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                    position: 'relative',
                }}>
                    {/* Court lines */}
                    <View style={{
                        width: '40%', height: '60%',
                        borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
                        borderRadius: 4,
                    }} />
                    {/* Free throw circle */}
                    <View style={{
                        width: 30, height: 30, borderRadius: 15,
                        borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
                        position: 'absolute',
                    }} />

                    {/* Player marker */}
                    <Animated.View style={{
                        position: 'absolute', top: 20,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: '#00D4FF',
                        opacity: pulseAnim,
                    }} />
                    <Text style={{ position: 'absolute', top: 45, color: '#8B949E', fontSize: 9 }}>
                        Joueur
                    </Text>
                </View>

                {/* Phone marker */}
                <View style={{
                    position: 'absolute', bottom: 12,
                    flexDirection: 'row', alignItems: 'center',
                }}>
                    <Text style={{ fontSize: 20 }}>📱</Text>
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: '#00D4FF', fontSize: 10, fontWeight: '700' }}>3–5m</Text>
                        <Text style={{ color: '#484F58', fontSize: 8 }}>Paysage • Fixe</Text>
                    </View>
                </View>

                {/* Distance arrow */}
                <View style={{
                    position: 'absolute', right: 20, top: '30%',
                    height: '40%', width: 1,
                    backgroundColor: 'rgba(255,152,0,0.4)',
                }} />
                <Text style={{
                    position: 'absolute', right: 8, top: '45%',
                    color: '#FF9800', fontSize: 9, fontWeight: '600',
                }}>
                    ↕️
                </Text>
            </View>
        )
    }

    if (type === 'stability') {
        return (
            <View style={{
                height: 160, marginBottom: 20,
                backgroundColor: '#161B22', borderRadius: 16,
                flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
                paddingHorizontal: 20,
                borderWidth: 1, borderColor: '#21262D',
            }}>
                {/* Good */}
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: 'rgba(0,200,83,0.1)',
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)',
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <View style={{ width: 2, height: 20, backgroundColor: '#8B949E', marginTop: 2 }} />
                    </View>
                    <Text style={{ color: '#00C853', fontSize: 11, fontWeight: '700', marginTop: 8 }}>✅ Trépied</Text>
                    <Text style={{ color: '#484F58', fontSize: 9 }}>Parfait</Text>
                </View>

                {/* OK */}
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: 'rgba(255,152,0,0.1)',
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(255,152,0,0.3)',
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <View style={{
                            width: 40, height: 8, backgroundColor: '#8B949E',
                            borderRadius: 2, marginTop: 4,
                        }} />
                    </View>
                    <Text style={{ color: '#FF9800', fontSize: 11, fontWeight: '700', marginTop: 8 }}>⚠️ Support</Text>
                    <Text style={{ color: '#484F58', fontSize: 9 }}>Acceptable</Text>
                </View>

                {/* Bad */}
                <View style={{ alignItems: 'center' }}>
                    <Animated.View style={{
                        width: 50, height: 60, backgroundColor: 'rgba(255,61,87,0.1)',
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(255,61,87,0.3)',
                        transform: [{ rotate: '5deg' }, { scale: pulseAnim }],
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <Text style={{ fontSize: 10 }}>🤚</Text>
                    </Animated.View>
                    <Text style={{ color: '#FF3D57', fontSize: 11, fontWeight: '700', marginTop: 8 }}>❌ Main</Text>
                    <Text style={{ color: '#484F58', fontSize: 9 }}>À éviter</Text>
                </View>
            </View>
        )
    }

    if (type === 'lighting') {
        return (
            <View style={{
                height: 140, marginBottom: 20,
                backgroundColor: '#161B22', borderRadius: 16,
                flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
                paddingHorizontal: 20,
                borderWidth: 1, borderColor: '#21262D',
            }}>
                {/* Good: Sun behind */}
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70,
                        borderRadius: 12,
                        backgroundColor: 'rgba(0,200,83,0.08)',
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(0,200,83,0.2)',
                    }}>
                        <Text style={{ fontSize: 20 }}>☀️</Text>
                        <Text style={{ fontSize: 8, color: '#8B949E', marginTop: 2 }}>↓</Text>
                        <Text style={{ fontSize: 16 }}>📱</Text>
                    </View>
                    <Text style={{ color: '#00C853', fontSize: 10, fontWeight: '600', marginTop: 6 }}>✅ Soleil derrière</Text>
                </View>

                {/* Bad: Backlit */}
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255,61,87,0.08)',
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(255,61,87,0.2)',
                    }}>
                        <Text style={{ fontSize: 16 }}>📱</Text>
                        <Text style={{ fontSize: 8, color: '#8B949E', marginTop: 2 }}>↓</Text>
                        <Text style={{ fontSize: 20 }}>☀️</Text>
                    </View>
                    <Text style={{ color: '#FF3D57', fontSize: 10, fontWeight: '600', marginTop: 6 }}>❌ Contre-jour</Text>
                </View>

                {/* Good: Indoor */}
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70,
                        borderRadius: 12,
                        backgroundColor: 'rgba(0,212,255,0.08)',
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
                    }}>
                        <Text style={{ fontSize: 20 }}>💡</Text>
                        <Text style={{ fontSize: 16, marginTop: 4 }}>🏟️</Text>
                    </View>
                    <Text style={{ color: '#00D4FF', fontSize: 10, fontWeight: '600', marginTop: 6 }}>✅ Gym éclairé</Text>
                </View>
            </View>
        )
    }

    // Ready state
    return (
        <View style={{
            height: 160, marginBottom: 20,
            backgroundColor: '#161B22', borderRadius: 16,
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
        }}>
            <Animated.View style={{
                transform: [{ scale: pulseAnim }],
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(0,212,255,0.1)',
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: 'rgba(0,212,255,0.3)',
            }}>
                <Text style={{ fontSize: 40 }}>🏀</Text>
            </Animated.View>
            <Text style={{ color: '#00D4FF', fontSize: 13, fontWeight: '700', marginTop: 12 }}>
                Ton coach IA est prêt
            </Text>
            <Text style={{ color: '#484F58', fontSize: 11 }}>
                Analyse • Digital Twin • Highlights
            </Text>
        </View>
    )
}

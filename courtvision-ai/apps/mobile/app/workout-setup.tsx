/**
 * CourtVision AI — Workout Setup Screen
 * Guide de placement caméra avant l'entraînement.
 *
 * Étapes :
 * 1. Positionnement : placer le téléphone en mode paysage/portrait
 * 2. Calibration : vérifier que le terrain est visible
 * 3. Profil : sélection rapide de la zone de tir
 * 4. Démarrage : transition vers workout.tsx
 *
 * Design V4 : glass cards, amber accent, animations fluides.
 */

import React, { useState, useCallback } from 'react'
import {
    View, Text, TouchableOpacity, StyleSheet,
    Dimensions, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInRight,
    FadeOut,
    SlideInRight,
    SlideOutLeft,
} from 'react-native-reanimated'
import { T, typePresets } from '../lib/theme'

const type = typePresets
const { width: SCREEN_W } = Dimensions.get('window')

// ==========================================
// Types
// ==========================================

interface SetupStep {
    key: string
    title: string
    description: string
    icon: string
    tips: string[]
}

const SETUP_STEPS: SetupStep[] = [
    {
        key: 'position',
        title: 'Placement du téléphone',
        description: 'Place ton téléphone pour capturer ta mécanique de tir complète.',
        icon: 'smartphone',
        tips: [
            'À 3-4 mètres de toi, à hauteur de taille',
            'Angle légèrement vers le haut (15-30°)',
            'Surface stable (trépied recommandé)',
            'Vue latérale préférée (profil droit ou gauche)',
        ],
    },
    {
        key: 'lighting',
        title: 'Éclairage',
        description: 'Un bon éclairage améliore considérablement la précision de l\'IA.',
        icon: 'sun',
        tips: [
            'Lumière naturelle idéale (extérieur ou gym bien éclairée)',
            'Évite le contre-jour (ne pointe pas vers le soleil)',
            'Les gymnasiums avec éclairage LED fonctionnent très bien',
            'Évite les ombres fortes au sol',
        ],
    },
    {
        key: 'clothing',
        title: 'Tenue & visibilité',
        description: 'L\'IA détecte ton corps plus facilement avec le bon contraste.',
        icon: 'user',
        tips: [
            'Porte des vêtements ajustés (pas trop larges)',
            'Bon contraste avec l\'arrière-plan',
            'Bras et jambes visibles (pas de veste longue)',
            'Chaussures de basket standard',
        ],
    },
    {
        key: 'mode',
        title: 'Mode d\'entraînement',
        description: 'Choisis comment tu veux t\'entraîner aujourd\'hui.',
        icon: 'zap',
        tips: [
            '🤖 Mode IA Réelle — Caméra active, analyse en temps réel',
            '🎮 Mode Démo — Simule des tirs pour découvrir l\'app',
            '✏️ Mode Manuel — Tu enregistres make/miss manuellement',
        ],
    },
]

// ==========================================
// Sub-components
// ==========================================

function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <View style={styles.dotsRow}>
            {Array.from({ length: total }, (_, i) => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        i === current && styles.dotActive,
                        i < current && styles.dotDone,
                    ]}
                />
            ))}
        </View>
    )
}

function TipItem({ tip, delay = 0 }: { tip: string; delay?: number }) {
    return (
        <Animated.View entering={FadeInRight.delay(delay).duration(300)} style={styles.tipItem}>
            <Feather name="check-circle" size={14} color={T.color.semantic.success} />
            <Text style={styles.tipText}>{tip}</Text>
        </Animated.View>
    )
}

function ModeOption({
    icon,
    title,
    description,
    selected,
    onPress,
    delay = 0,
}: {
    icon: string
    title: string
    description: string
    selected: boolean
    onPress: () => void
    delay?: number
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)}>
            <TouchableOpacity
                style={[styles.modeOption, selected && styles.modeOptionSelected]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.modeIconCircle, selected && styles.modeIconCircleSelected]}>
                    <Feather
                        name={icon as any}
                        size={20}
                        color={selected ? T.color.signature.primary : T.color.text.tertiary}
                    />
                </View>
                <View style={styles.modeInfo}>
                    <Text style={[styles.modeTitle, selected && styles.modeTitleSelected]}>
                        {title}
                    </Text>
                    <Text style={styles.modeDescription}>{description}</Text>
                </View>
                <View style={[styles.modeRadio, selected && styles.modeRadioSelected]}>
                    {selected ? (
                        <View style={styles.modeRadioInner} />
                    ) : null}
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
}

// ==========================================
// Main Screen
// ==========================================

export default function WorkoutSetupScreen() {
    const router = useRouter()
    const [step, setStep] = useState(0)
    const [selectedMode, setSelectedMode] = useState<'camera' | 'demo' | 'manual'>('demo')

    const currentStep = SETUP_STEPS[step]

    const handleNext = useCallback(() => {
        if (step < SETUP_STEPS.length - 1) {
            setStep(s => s + 1)
        } else {
            // Démarrer le workout
            router.push({
                pathname: '/workout',
                params: { mode: selectedMode },
            })
        }
    }, [step, selectedMode, router])

    const handleBack = useCallback(() => {
        if (step > 0) {
            setStep(s => s - 1)
        } else {
            router.back()
        }
    }, [step, router])

    const handleSkip = useCallback(() => {
        router.push({
            pathname: '/workout',
            params: { mode: selectedMode },
        })
    }, [selectedMode, router])

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <StepDots current={step} total={SETUP_STEPS.length} />
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Animated.View
                    key={currentStep.key}
                    entering={SlideInRight.duration(300)}
                    exiting={SlideOutLeft.duration(200)}
                    style={styles.stepContent}
                >
                    {/* Icon */}
                    <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.iconCircle}>
                        <Feather name={currentStep.icon as any} size={36} color={T.color.signature.primary} />
                    </Animated.View>

                    {/* Title & Description */}
                    <Text style={styles.stepTitle}>{currentStep.title}</Text>
                    <Text style={styles.stepDescription}>{currentStep.description}</Text>

                    {/* Tips or Mode Selection */}
                    {currentStep.key === 'mode' ? (
                        <View style={styles.modeList}>
                            <ModeOption
                                icon="camera"
                                title="Mode IA Réelle"
                                description="La caméra analyse chaque tir en temps réel"
                                selected={selectedMode === 'camera'}
                                onPress={() => setSelectedMode('camera')}
                                delay={100}
                            />
                            <ModeOption
                                icon="zap"
                                title="Mode Démo"
                                description="Simule des tirs avec des données NBA réalistes"
                                selected={selectedMode === 'demo'}
                                onPress={() => setSelectedMode('demo')}
                                delay={200}
                            />
                            <ModeOption
                                icon="edit-3"
                                title="Mode Manuel"
                                description="Enregistre tes tirs manuellement (make/miss)"
                                selected={selectedMode === 'manual'}
                                onPress={() => setSelectedMode('manual')}
                                delay={300}
                            />
                        </View>
                    ) : (
                        <View style={styles.tipsList}>
                            {currentStep.tips.map((tip, i) => (
                                <TipItem key={i} tip={tip} delay={150 + i * 80} />
                            ))}
                        </View>
                    )}
                </Animated.View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={styles.nextBtnText}>
                        {step === SETUP_STEPS.length - 1 ? 'Démarrer l\'entraînement' : 'Suivant'}
                    </Text>
                    <Feather
                        name={step === SETUP_STEPS.length - 1 ? 'play' : 'arrow-right'}
                        size={18}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    skipText: {
        color: T.color.text.tertiary,
        fontSize: 14,
        fontFamily: T.fonts.body.semibold,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: T.color.background.tertiary,
    },
    dotActive: {
        width: 24,
        backgroundColor: T.color.signature.primary,
    },
    dotDone: {
        backgroundColor: `${T.color.signature.primary}50`,
    },

    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    stepContent: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 24,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${T.color.signature.primary}12`,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: `${T.color.signature.primary}25`,
        marginBottom: 24,
    },
    stepTitle: {
        color: T.color.text.primary,
        fontSize: 24,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
        textAlign: 'center',
        marginBottom: 8,
    },
    stepDescription: {
        color: T.color.text.secondary,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
        fontFamily: T.fonts.body.regular,
    },

    // Tips
    tipsList: {
        width: '100%',
        gap: 12,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.md,
        padding: 14,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    tipText: {
        flex: 1,
        color: T.color.text.secondary,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: T.fonts.body.regular,
    },

    // Mode selection
    modeList: {
        width: '100%',
        gap: 12,
    },
    modeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        borderWidth: 1.5,
        borderColor: T.color.border.default,
        gap: 14,
    },
    modeOptionSelected: {
        borderColor: T.color.signature.primary,
        backgroundColor: `${T.color.signature.primary}08`,
    },
    modeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: T.color.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeIconCircleSelected: {
        backgroundColor: `${T.color.signature.primary}15`,
    },
    modeInfo: {
        flex: 1,
    },
    modeTitle: {
        color: T.color.text.primary,
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    modeTitleSelected: {
        color: T.color.signature.primary,
    },
    modeDescription: {
        color: T.color.text.tertiary,
        fontSize: 12,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },
    modeRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: T.color.border.default,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeRadioSelected: {
        borderColor: T.color.signature.primary,
    },
    modeRadioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: T.color.signature.primary,
    },

    // Footer
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        paddingTop: 12,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: T.color.signature.primary,
        paddingVertical: 16,
        borderRadius: 16,
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
})

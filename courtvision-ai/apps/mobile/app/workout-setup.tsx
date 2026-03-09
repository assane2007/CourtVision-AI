/**
 * CourtVision AI — Workout Setup Screen
 * Camera placement guide before training.
 *
 * Steps:
 * 1. Positioning: place phone in landscape/portrait
 * 2. Calibration: check that the court is visible
 * 3. Profile: quick shooting zone selection
 * 4. Start: transition to workout.tsx
 *
 * Design V4: glass cards, amber accent, smooth animations.
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
        title: 'Phone Placement',
        description: 'Position your phone to capture your complete shooting form.',
        icon: 'smartphone',
        tips: [
            '3-4 meters away from you, at waist height',
            'Slight upward angle (15-30°)',
            'Stable surface (tripod recommended)',
            'Side view preferred (right or left profile)',
        ],
    },
    {
        key: 'lighting',
        title: 'Lighting',
        description: 'Good lighting significantly improves AI accuracy.',
        icon: 'sun',
        tips: [
            'Natural light is ideal (outdoors or well-lit gym)',
            'Avoid backlighting (don\'t point toward the sun)',
            'Gyms with LED lighting work great',
            'Avoid strong shadows on the ground',
        ],
    },
    {
        key: 'clothing',
        title: 'Clothing & Visibility',
        description: 'AI detects your body more easily with proper contrast.',
        icon: 'user',
        tips: [
            'Wear fitted clothing (not too loose)',
            'Good contrast with the background',
            'Arms and legs visible (no long jacket)',
            'Standard basketball shoes',
        ],
    },
    {
        key: 'mode',
        title: 'Training Mode',
        description: 'Choose how you want to train today.',
        icon: 'zap',
        tips: [
            '🤖 Real AI Mode — Active camera, real-time analysis',
            '🎮 Demo Mode — Simulates shots to explore the app',
            '✏️ Manual Mode — Record make/miss manually',
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
                                title="Real AI Mode"
                                description="Camera analyzes every shot in real time"
                                selected={selectedMode === 'camera'}
                                onPress={() => setSelectedMode('camera')}
                                delay={100}
                            />
                            <ModeOption
                                icon="zap"
                                title="Demo Mode"
                                description="Simulates shots with realistic NBA data"
                                selected={selectedMode === 'demo'}
                                onPress={() => setSelectedMode('demo')}
                                delay={200}
                            />
                            <ModeOption
                                icon="edit-3"
                                title="Manual Mode"
                                description="Record your shots manually (make/miss)"
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
                        {step === SETUP_STEPS.length - 1 ? 'Start Training' : 'Next'}
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
        borderColor: T.color.border.base,
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
        borderColor: T.color.border.base,
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
        borderColor: T.color.border.base,
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

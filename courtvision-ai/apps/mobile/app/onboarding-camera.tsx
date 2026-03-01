import { View, Text, TouchableOpacity, Dimensions, ScrollView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withRepeat,
    withSequence, Easing, FadeIn,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { T } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const type = T.type

//  Camera Setup Steps 

const CAMERA_STEPS = [
    {
        id: 'placement', emoji: '📐',
        title: 'Place Your Phone',
        subtitle: 'Optimal position for AI analysis',
        description: 'Set your phone in landscape mode, at chest height, 3 to 5 meters from the court.',
        tips: [
            { icon: 'maximize-2' as const, text: 'Distance: 3–5 meters from court', important: true },
            { icon: 'smartphone' as const, text: 'Landscape mode required', important: true },
            { icon: 'eye' as const, text: 'Full court should be visible', important: false },
            { icon: 'alert-circle' as const, text: 'Avoid direct backlight', important: false },
        ],
        diagram: 'placement',
    },
    {
        id: 'stability', emoji: '🔒',
        title: 'Stabilize the Shot',
        subtitle: 'AI needs a steady frame',
        description: 'Use a tripod, bench, or prop your phone against a wall. Shaky footage reduces accuracy.',
        tips: [
            { icon: 'triangle' as const, text: 'Best: tripod or phone mount', important: true },
            { icon: 'box' as const, text: 'Alternative: bench, wall, bag', important: false },
            { icon: 'x-circle' as const, text: 'Avoid handheld filming', important: true },
            { icon: 'clock' as const, text: 'Keep the phone still the entire session', important: false },
        ],
        diagram: 'stability',
    },
    {
        id: 'lighting', emoji: '💡',
        title: 'Lighting & Framing',
        subtitle: 'Optimize video quality',
        description: 'Good lighting helps the AI track your movements. Avoid harsh shadows and reflections.',
        tips: [
            { icon: 'sun' as const, text: 'Outdoor: sun behind you', important: true },
            { icon: 'zap' as const, text: 'Indoor: uniform lighting', important: false },
            { icon: 'sliders' as const, text: 'Avoid high-contrast areas', important: false },
            { icon: 'user' as const, text: 'Wear visible clothing (no white-on-white)', important: false },
        ],
        diagram: 'lighting',
    },
    {
        id: 'ready', emoji: '🚀',
        title: 'You\'re Ready!',
        subtitle: 'AI does the rest',
        description: 'Start a session and play naturally. CourtVision AI analyzes your shots, movement, and focus in real time.',
        tips: [
            { icon: 'activity' as const, text: 'Play naturally — AI adapts to you', important: false },
            { icon: 'bar-chart-2' as const, text: 'Results available in ~2 minutes', important: false },
            { icon: 'bell' as const, text: 'Turn on notifications for your report', important: false },
            { icon: 'trending-up' as const, text: 'More sessions = smarter Twin', important: true },
        ],
        diagram: 'ready',
    },
]

//  Camera Diagram Component 

function CameraDiagram({ type: diagramType }: { type: string }) {
    const pulse = useSharedValue(0.8)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1200 }),
                withTiming(0.8, { duration: 1200 }),
            ),
            -1, true,
        )
    }, [])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 0.6 + pulse.value * 0.4,
    }))

    if (diagramType === 'placement') {
        return (
            <View style={{
                height: 180, marginBottom: T.spacing[5],
                ...T.glass.base, borderRadius: T.radius.lg,
                justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
                borderColor: `${T.color.brand.primary}30`, borderWidth: 1,
            }}>
                <View style={{
                    width: SCREEN_WIDTH - 80, height: 110,
                    borderWidth: 2, borderColor: `${T.color.brand.primary}40`,
                    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    position: 'relative',
                    backgroundColor: `${T.color.brand.primary}05`,
                }}>
                    {/* Scanner Grid Lines */}
                    {[...Array(6)].map((_, i) => (
                        <View key={`hx-${i}`} style={{ position: 'absolute', top: i * 18, left: 0, right: 0, height: 1, backgroundColor: `${T.color.brand.primary}10` }} />
                    ))}
                    {[...Array(12)].map((_, i) => (
                        <View key={`vx-${i}`} style={{ position: 'absolute', left: i * 25, top: 0, bottom: 0, width: 1, backgroundColor: `${T.color.brand.primary}10` }} />
                    ))}

                    <View style={{
                        width: '40%', height: '60%',
                        borderWidth: 1, borderColor: `${T.color.brand.primary}50`, borderRadius: 4,
                        backgroundColor: `${T.color.brand.primary}15`,
                    }} />

                    <Animated.View style={[{
                        position: 'absolute',
                        width: '100%', height: 2,
                        backgroundColor: T.color.brand.primary,
                        ...T.glow.hero(T.color.brand.primary),
                    }, useAnimatedStyle(() => ({
                        transform: [{ translateY: (Math.sin(pulse.value * Math.PI) * 45) }]
                    }))]} />

                    <Animated.View style={[{
                        position: 'absolute', top: 25,
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: T.color.brand.primary,
                        ...T.glow.hero(T.color.brand.primary),
                        justifyContent: 'center', alignItems: 'center'
                    }, pulseStyle]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.color.bg.primary }} />
                    </Animated.View>
                    <Text style={{ position: 'absolute', top: 55, color: T.color.brand.primary, fontSize: 10, fontFamily: T.fonts.body.bold, letterSpacing: 1 }}>PLAYER LOCK</Text>
                </View>

                <View style={{ position: 'absolute', bottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="smartphone" size={20} color={T.color.brand.primary} style={{ transform: [{ rotate: '90deg' }] }} />
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: T.color.brand.primary, fontSize: 12, fontFamily: T.fonts.body.bold }}>3–5m RANGE</Text>
                        <Text style={{ color: T.color.text.tertiary, fontSize: 10, fontFamily: T.fonts.body.regular }}>HUD ACTIVE</Text>
                    </View>
                </View>
            </View>
        )
    }

    if (diagramType === 'stability') {
        return (
            <View style={{
                height: 160, marginBottom: T.spacing[5],
                ...T.glass.base, borderRadius: T.radius.lg,
                flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
                paddingHorizontal: T.spacing[5],
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: `${T.color.semantic.success}10`,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.color.semantic.success}40`,
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <View style={{ width: 2, height: 20, backgroundColor: T.color.text.secondary, marginTop: 2 }} />
                    </View>
                    <Text style={{ color: T.color.semantic.success, fontSize: 13, fontFamily: T.fonts.body.bold, marginTop: 8 }}>✅ Tripod</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: `${T.color.semantic.warning}10`,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.color.semantic.warning}40`,
                    }}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <View style={{ width: 40, height: 8, backgroundColor: T.color.text.secondary, borderRadius: 2, marginTop: 4 }} />
                    </View>
                    <Text style={{ color: T.color.semantic.warning, fontSize: 13, fontFamily: T.fonts.body.bold, marginTop: 8 }}>⚠️ Prop</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Animated.View style={[{
                        width: 50, height: 60, backgroundColor: `${T.color.semantic.error}10`,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.color.semantic.error}40`,
                        transform: [{ rotate: '5deg' }],
                    }, pulseStyle]}>
                        <Text style={{ fontSize: 24 }}>📱</Text>
                        <Text style={{ fontSize: 10 }}>〰️</Text>
                    </Animated.View>
                    <Text style={{ color: T.color.semantic.error, fontSize: 13, fontFamily: T.fonts.body.bold, marginTop: 8 }}>❌ Hand</Text>
                </View>
            </View>
        )
    }

    if (diagramType === 'lighting') {
        return (
            <View style={{
                height: 140, marginBottom: T.spacing[5],
                ...T.glass.base, borderRadius: T.radius.lg,
                flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
                paddingHorizontal: T.spacing[5],
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: `${T.color.semantic.success}10`,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.color.semantic.success}30`,
                    }}>
                        <Text style={{ fontSize: 20 }}>☀️</Text>
                        <Text style={{ fontSize: 8, color: T.color.text.secondary, marginTop: 2 }}>↓</Text>
                        <Text style={{ fontSize: 16 }}>🏀</Text>
                    </View>
                    <Text style={{ color: T.color.semantic.success, fontSize: 12, fontFamily: T.fonts.body.semibold, marginTop: 6 }}>✅ Sun behind</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: `${T.color.semantic.error}10`,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.color.semantic.error}30`,
                    }}>
                        <Text style={{ fontSize: 16 }}>🏀</Text>
                        <Text style={{ fontSize: 8, color: T.color.text.secondary, marginTop: 2 }}>↓</Text>
                        <Text style={{ fontSize: 20 }}>☀️</Text>
                    </View>
                    <Text style={{ color: T.color.semantic.error, fontSize: 12, fontFamily: T.fonts.body.semibold, marginTop: 6 }}>❌ Backlight</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: `${T.color.brand.primary}10`,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: T.color.border.soft,
                    }}>
                        <Text style={{ fontSize: 20 }}>💡</Text>
                        <Text style={{ fontSize: 16, marginTop: 4 }}>🏀</Text>
                    </View>
                    <Text style={{ color: T.color.brand.primary, fontSize: 12, fontFamily: T.fonts.body.semibold, marginTop: 6 }}>💡 Gym lights</Text>
                </View>
            </View>
        )
    }

    // Ready diagram
    return (
        <Animated.View entering={FadeIn.duration(500)} style={{
            height: 160, marginBottom: T.spacing[5],
            ...T.glass.vivid, borderRadius: T.radius.lg,
            justifyContent: 'center', alignItems: 'center',
            borderColor: T.color.brand.primary, borderWidth: 1,
            overflow: 'hidden'
        }}>
            <Animated.View style={[{
                position: 'absolute', width: 200, height: 200,
                backgroundColor: T.color.brand.primary,
                opacity: 0.1,
            }, pulseStyle]} />

            <Animated.View style={[{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: `${T.color.brand.primary}20`,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.color.brand.primary,
                ...T.glow.hero(T.color.brand.primary),
            }, pulseStyle]}>
                <Feather name="crosshair" size={32} color={T.color.brand.primary} />
            </Animated.View>
            <Text style={{ ...type.h3, color: T.color.text.primary, marginTop: 12 }}>
                SYSTEM ONLINE
            </Text>
            <Text style={{ ...type.caption, color: T.color.brand.primary, fontFamily: T.fonts.display.black, letterSpacing: 1 }}>
                AWAITING UPLINK
            </Text>
        </Animated.View>
    )
}

//  Screen 

export default function OnboardingCamera() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)

    const step = CAMERA_STEPS[currentStep]
    const isLastStep = currentStep === CAMERA_STEPS.length - 1

    // Step transition
    const contentOpacity = useSharedValue(1)
    const contentY = useSharedValue(0)

    useEffect(() => {
        contentOpacity.value = 0
        contentY.value = 20
        contentOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) })
        contentY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) })
    }, [currentStep])

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentY.value }],
    }))

    // Progress bar width
    const progressWidth = useSharedValue(0)
    useEffect(() => {
        progressWidth.value = withTiming((currentStep + 1) / CAMERA_STEPS.length, { duration: 300 })
    }, [currentStep])

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value * 100}%` as any,
    }))

    const handleNext = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        if (isLastStep) router.push('/onboarding3')
        else setCurrentStep(prev => prev + 1)
    }
    const handleSkip = () => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        router.push('/onboarding3')
    }
    const handleBack = () => {
        if (Platform.OS !== 'web') Haptics.selectionAsync()
        if (currentStep > 0) setCurrentStep(prev => prev - 1)
        else router.back()
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.bg.primary }}>
            {/* Header */}
            <View style={{ paddingHorizontal: T.spacing[5], paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.spacing[3] }}>
                    <TouchableOpacity onPress={handleBack} accessibilityLabel="Back">
                        <View style={{
                            width: 40, height: 40, borderRadius: T.radius.md,
                            ...T.glass.base,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Feather name="arrow-left" size={20} color={T.color.text.primary} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={{ ...type.body, color: T.color.text.secondary }}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={{ height: 4, backgroundColor: T.color.bg.tertiary, borderRadius: 2, marginBottom: 6 }}>
                    <Animated.View style={[{
                        height: 4, backgroundColor: T.color.brand.primary, borderRadius: 2,
                        ...T.glow.soft(T.color.brand.primary),
                    }, progressStyle]} />
                </View>
                <Text style={{ ...type.caption, color: T.color.text.tertiary, textAlign: 'right', marginBottom: 4 }}>
                    {currentStep + 1}/{CAMERA_STEPS.length}
                </Text>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: T.spacing[5], paddingBottom: 30, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[{ flex: 1 }, contentStyle]}>
                    {/* Emoji + Title */}
                    <View style={{ alignItems: 'center', marginTop: 10, marginBottom: T.spacing[5] }}>
                        <View style={{
                            width: 88, height: 88, borderRadius: T.radius.xl,
                            ...T.glass.vivid,
                            justifyContent: 'center', alignItems: 'center',
                            marginBottom: 16,
                            ...T.glow.soft(T.color.brand.primary),
                        }}>
                            <Text style={{ fontSize: 42 }}>{step.emoji}</Text>
                        </View>
                        <Text style={{
                            ...type.h2,
                            color: T.color.text.primary, fontSize: 24,
                            textAlign: 'center',
                        }}>
                            {step.title}
                        </Text>
                        <Text style={{
                            ...type.body,
                            color: T.color.brand.primary,
                            textAlign: 'center', marginTop: 4,
                        }}>
                            {step.subtitle}
                        </Text>
                    </View>

                    {/* Diagram */}
                    <CameraDiagram type={step.diagram} />

                    {/* Description */}
                    <Text style={{
                        ...type.body,
                        color: T.color.text.secondary,
                        lineHeight: 22, textAlign: 'center', marginBottom: T.spacing[5], paddingHorizontal: 10,
                    }}>
                        {step.description}
                    </Text>

                    {/* Tips */}
                    <View style={{ marginBottom: T.spacing[5] }}>
                        {step.tips.map((tip, i) => (
                            <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center',
                                ...(tip.important ? T.glass.vivid : T.glass.base),
                                borderRadius: T.radius.md, padding: 14, marginBottom: 8,
                            }}>
                                <Feather
                                    name={tip.icon}
                                    size={18}
                                    color={tip.important ? T.color.brand.primary : T.color.text.secondary}
                                />
                                <Text style={{
                                    color: tip.important ? T.color.text.primary : T.color.text.secondary,
                                    fontSize: 15, fontFamily: tip.important ? T.fonts.body.semibold : T.fonts.body.regular,
                                    marginLeft: 12, flex: 1, lineHeight: 20,
                                }}>
                                    {tip.text}
                                </Text>
                                {tip.important && (
                                    <View style={{
                                        backgroundColor: `${T.color.brand.primary}15`,
                                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                                    }}>
                                        <Text style={{ ...type.overline, color: T.color.brand.primary, fontSize: 10 }}>KEY</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={{ paddingHorizontal: T.spacing[5], paddingBottom: 20 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.color.brand.primary,
                        paddingVertical: 18, borderRadius: T.radius.full,
                        alignItems: 'center',
                        ...T.glow.hero(T.color.brand.primary),
                    }}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Text style={{ color: '#fff', fontFamily: T.fonts.display.black, fontSize: 17 }}>
                        {isLastStep ? '🏀 Get Started' : 'Next →'}
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
                                backgroundColor: i === currentStep ? T.color.brand.primary : T.color.bg.tertiary,
                                marginHorizontal: 3,
                                ...(i === currentStep ? T.glow.soft(T.color.brand.primary) : {}),
                            }}
                        />
                    ))}
                </View>
            </View>
        </SafeAreaView>
    )
}

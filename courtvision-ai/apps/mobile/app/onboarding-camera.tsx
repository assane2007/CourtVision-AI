import { View, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withRepeat,
    withSequence, Easing, FadeIn,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

//  Camera Setup Steps 

const CAMERA_STEPS = [
    {
        id: 'placement', emoji: '',
        title: 'Place Your Phone',
        subtitle: 'Optimal position for AI analysis',
        description: 'Set your phone in landscape mode, at chest height, 3 to 5 meters from the court.',
        tips: [
            { icon: 'maximize-2' as const, text: 'Distance: 35 meters from court', important: true },
            { icon: 'smartphone' as const, text: 'Landscape mode required', important: true },
            { icon: 'eye' as const, text: 'Full court should be visible', important: false },
            { icon: 'alert-circle' as const, text: 'Avoid direct backlight', important: false },
        ],
        diagram: 'placement',
    },
    {
        id: 'stability', emoji: '',
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
        id: 'lighting', emoji: '',
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
        id: 'ready', emoji: '',
        title: 'You`re Ready!',
        subtitle: 'AI does the rest',
        description: 'Start a session and play naturally. CourtVision AI analyzes your shots, movement, and focus in real time.',
        tips: [
            { icon: 'activity' as const, text: 'Play naturally  AI adapts to you', important: false },
            { icon: 'bar-chart-2' as const, text: 'Results available in ~2 minutes', important: false },
            { icon: 'bell' as const, text: 'Turn on notifications for your report', important: false },
            { icon: 'trending-up' as const, text: 'More sessions = smarter Twin', important: true },
        ],
        diagram: 'ready',
    },
]

//  Camera Diagram Component 

function CameraDiagram({ type }: { type: string }) {
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
                    <Animated.View style={[{
                        position: 'absolute', top: 20,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: T.colors.accent,
                        ...T.glow(T.colors.accent, 0.3),
                    }, pulseStyle]} />
                    <Text style={{ position: 'absolute', top: 45, color: T.colors.muted, fontSize: T.font.xs }}>Player</Text>
                </View>
                <View style={{ position: 'absolute', bottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20 }}></Text>
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: T.colors.accent, fontSize: T.font.xs + 1, fontWeight: '700' }}>35m</Text>
                        <Text style={{ color: T.colors.dim, fontSize: T.font.xs - 1 }}>Landscape  Steady</Text>
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
                        <Text style={{ fontSize: 24 }}></Text>
                        <View style={{ width: 2, height: 20, backgroundColor: T.colors.muted, marginTop: 2 }} />
                    </View>
                    <Text style={{ color: T.colors.green, fontSize: T.font.sm, fontWeight: '700', marginTop: 8 }}> Tripod</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 50, height: 60, backgroundColor: T.colors.orangeDim,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.orange}40`,
                    }}>
                        <Text style={{ fontSize: 24 }}></Text>
                        <View style={{ width: 40, height: 8, backgroundColor: T.colors.muted, borderRadius: 2, marginTop: 4 }} />
                    </View>
                    <Text style={{ color: T.colors.orange, fontSize: T.font.sm, fontWeight: '700', marginTop: 8 }}> Prop</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Animated.View style={[{
                        width: 50, height: 60, backgroundColor: T.colors.redDim,
                        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.red}40`,
                        transform: [{ rotate: '5deg' }],
                    }, pulseStyle]}>
                        <Text style={{ fontSize: 24 }}></Text>
                        <Text style={{ fontSize: 10 }}></Text>
                    </Animated.View>
                    <Text style={{ color: T.colors.red, fontSize: T.font.sm, fontWeight: '700', marginTop: 8 }}> Hand</Text>
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
                        <Text style={{ fontSize: 20 }}></Text>
                        <Text style={{ fontSize: 8, color: T.colors.muted, marginTop: 2 }}></Text>
                        <Text style={{ fontSize: 16 }}></Text>
                    </View>
                    <Text style={{ color: T.colors.green, fontSize: T.font.xs + 1, fontWeight: '600', marginTop: 6 }}> Sun behind</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: T.colors.redDim,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: `${T.colors.red}30`,
                    }}>
                        <Text style={{ fontSize: 16 }}></Text>
                        <Text style={{ fontSize: 8, color: T.colors.muted, marginTop: 2 }}></Text>
                        <Text style={{ fontSize: 20 }}></Text>
                    </View>
                    <Text style={{ color: T.colors.red, fontSize: T.font.xs + 1, fontWeight: '600', marginTop: 6 }}> Backlight</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 70, height: 70, borderRadius: T.radius.md,
                        backgroundColor: T.colors.accentDim,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 1, borderColor: T.colors.borderAccent,
                    }}>
                        <Text style={{ fontSize: 20 }}></Text>
                        <Text style={{ fontSize: 16, marginTop: 4 }}></Text>
                    </View>
                    <Text style={{ color: T.colors.accent, fontSize: T.font.xs + 1, fontWeight: '600', marginTop: 6 }}> Gym lights</Text>
                </View>
            </View>
        )
    }

    // Ready diagram
    return (
        <Animated.View entering={FadeIn.duration(500)} style={{
            height: 160, marginBottom: T.space.xl,
            ...T.glass.accent, borderRadius: T.radius.lg,
            justifyContent: 'center', alignItems: 'center',
        }}>
            <Animated.View style={[{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: T.colors.accentDim,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.colors.borderAccent,
                ...T.glow(T.colors.accent, 0.2),
            }, pulseStyle]}>
                <Text style={{ fontSize: 40 }}></Text>
            </Animated.View>
            <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '700', marginTop: 12 }}>
                Your AI coach is ready
            </Text>
            <Text style={{ color: T.colors.dim, fontSize: T.font.sm }}>
                Analysis  Digital Twin  Highlights
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
        if (isLastStep) router.push('/onboarding3')
        else setCurrentStep(prev => prev + 1)
    }
    const handleSkip = () => router.push('/onboarding3')
    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1)
        else router.back()
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Header */}
            <View style={{ paddingHorizontal: T.space.xl, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.space.md }}>
                    <TouchableOpacity onPress={handleBack} accessibilityLabel="Back">
                        <View style={{
                            width: 40, height: 40, borderRadius: T.radius.md,
                            ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Feather name="arrow-left" size={20} color={T.colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.md + 1 }}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={{ height: 4, backgroundColor: T.colors.dimmer, borderRadius: 2, marginBottom: 6 }}>
                    <Animated.View style={[{
                        height: 4, backgroundColor: T.colors.accent, borderRadius: 2,
                        ...T.glow(T.colors.accent, 0.15),
                    }, progressStyle]} />
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
                <Animated.View style={[{ flex: 1 }, contentStyle]}>
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
                                <Feather
                                    name={tip.icon}
                                    size={18}
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
                                        <Text style={{ color: T.colors.accent, fontSize: T.font.xs, fontWeight: '700' }}>KEY</Text>
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
                        {isLastStep ? ' Get Started' : 'Next '}
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

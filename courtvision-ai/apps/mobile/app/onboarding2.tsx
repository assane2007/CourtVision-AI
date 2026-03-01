import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    Easing, FadeInDown,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { T } from '../lib/theme'
import { useStore } from '../lib/store'
const type = T.type

//  Data 

const POSITIONS = [
    { label: 'Point Guard (PG)', value: 'PG', emoji: '🎯', desc: 'Passer, leader, court vision' },
    { label: 'Shooting Guard (SG)', value: 'SG', emoji: '🏹', desc: 'Scorer, long-range shooter' },
    { label: 'Small Forward (SF)', value: 'SF', emoji: '⚡', desc: 'Versatile, offense & defense' },
    { label: 'Power Forward (PF)', value: 'PF', emoji: '💪', desc: 'Physical, rebounds, post play' },
    { label: 'Center (C)', value: 'C', emoji: '🛡️', desc: 'Rim protector, interior dominance' },
]

const LEVELS = [
    { label: 'Beginner', value: 'Beginner', emoji: '🌱', desc: '< 1 year of practice' },
    { label: 'Intermediate', value: 'Intermediate', emoji: '🔥', desc: '1–3 years, local leagues' },
    { label: 'Advanced', value: 'Advanced', emoji: '⭐', desc: '3–5 years, regional+' },
    { label: 'Pro', value: 'Pro', emoji: '👑', desc: '5+ years, national level' },
]

//  Screen 

export default function Onboarding2() {
    const router = useRouter()
    const [step, setStep] = useState<'position' | 'level'>('position')
    const [selectedPos, setSelectedPos] = useState<string | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)

    // Step transition animation
    const contentOpacity = useSharedValue(0)
    const contentY = useSharedValue(20)

    const animateIn = () => {
        contentOpacity.value = 0
        contentY.value = 20
        contentOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
        contentY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) })
    }

    useEffect(() => { animateIn() }, [step])

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentY.value }],
    }))

    const goToLevel = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setStep('level')
    }

    const handleContinue = () => {
        useStore.setState((s: any) => ({
            user: s.user
                ? { ...s.user, position: selectedPos ?? 'PG', level: selectedLevel ?? 'Intermediate' }
                : {
                    id: '', username: '', full_name: 'Player',
                    position: selectedPos ?? 'PG', level: selectedLevel ?? 'Intermediate',
                    streak: 0, mental_score: 0, shooting_grade: 'B',
                    shooting_fg_pct: 0, xp: 0, xp_level: 1,
                    total_sessions: 0, badges_count: 0,
                },
        }))
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        router.push('/onboarding-camera')
    }

    const isPositionStep = step === 'position'
    const canContinuePos = !!selectedPos
    const canContinueLvl = !!selectedLevel
    const progressFill = isPositionStep ? 1 : 2

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.bg.primary }}>
            <ScrollView
                contentContainerStyle={{ padding: T.spacing[5], paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Back button */}
                <TouchableOpacity
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        step === 'level' ? setStep('position') : router.back()
                    }}
                    style={{ marginBottom: T.spacing[3] }}
                >
                    <View style={{
                        width: 40, height: 40, borderRadius: T.radius.md,
                        ...T.glass.base,
                        justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Feather name="arrow-left" size={20} color={T.color.text.secondary} />
                    </View>
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: T.spacing[6] }}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            backgroundColor: i < progressFill ? T.color.brand.primary : T.color.bg.tertiary,
                            ...(i < progressFill ? T.glow.soft(T.color.brand.primary) : {}),
                        }} />
                    ))}
                </View>

                <Animated.View style={contentStyle}>
                    {isPositionStep ? (
                        <>
                            <Text style={{
                                ...type.h2,
                                color: T.color.text.primary, marginBottom: 6,
                            }}>
                                What's your position?
                            </Text>
                            <Text style={{
                                ...type.body,
                                color: T.color.text.secondary,
                                marginBottom: T.spacing[6], lineHeight: 22,
                            }}>
                                Your AI Digital Twin will be optimized for your specific role.
                            </Text>

                            {POSITIONS.map((p, idx) => {
                                const isSelected = selectedPos === p.value
                                return (
                                    <Animated.View
                                        key={p.value}
                                        entering={FadeInDown.delay(idx * 60).duration(300)}
                                    >
                                        <TouchableOpacity
                                            style={{
                                                ...(isSelected ? T.glass.vivid : T.glass.base),
                                                padding: T.spacing[4] + 2, borderRadius: T.radius.lg, marginBottom: 12,
                                                borderWidth: 1.5,
                                                borderColor: isSelected ? T.color.brand.primary : 'transparent',
                                                flexDirection: 'row', alignItems: 'center',
                                                ...(isSelected ? T.glow.hero(T.color.brand.primary) : {}),
                                            }}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.selectionAsync()
                                                setSelectedPos(p.value)
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <View style={{
                                                width: 48, height: 48, borderRadius: T.radius.md,
                                                backgroundColor: isSelected ? `${T.color.brand.primary}15` : T.color.bg.tertiary,
                                                justifyContent: 'center', alignItems: 'center', marginRight: 14,
                                            }}>
                                                <Text style={{ fontSize: 24 }}>{p.emoji}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    ...type.h3,
                                                    color: T.color.text.primary,
                                                }}>{p.label}</Text>
                                                <Text style={{
                                                    ...type.caption,
                                                    color: T.color.text.secondary, marginTop: 3,
                                                }}>{p.desc}</Text>
                                            </View>
                                            {isSelected && (
                                                <View style={{
                                                    width: 26, height: 26, borderRadius: 13,
                                                    backgroundColor: T.color.brand.primary,
                                                    justifyContent: 'center', alignItems: 'center',
                                                }}>
                                                    <Feather name="check" size={14} color={T.color.bg.primary} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                )
                            })}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: canContinuePos ? T.color.brand.primary : T.color.bg.tertiary,
                                    paddingVertical: 18, borderRadius: T.radius.full,
                                    alignItems: 'center', opacity: canContinuePos ? 1 : 0.45,
                                    marginTop: T.spacing[4],
                                    ...(canContinuePos ? T.glow.hero(T.color.brand.primary) : {}),
                                }}
                                onPress={goToLevel}
                                disabled={!canContinuePos}
                                activeOpacity={0.85}
                            >
                                <Text style={{
                                    color: canContinuePos ? '#fff' : T.color.text.secondary,
                                    fontFamily: T.fonts.display.black, fontSize: 17,
                                }}>
                                    Continue →
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={{
                                ...type.h2,
                                color: T.color.text.primary, marginBottom: 6,
                            }}>
                                Your skill level?
                            </Text>
                            <Text style={{
                                ...type.body,
                                color: T.color.text.secondary,
                                marginBottom: T.spacing[6], lineHeight: 22,
                            }}>
                                Calibrate the AI for accurate analysis from the start.
                            </Text>

                            {LEVELS.map((l, idx) => {
                                const isSelected = selectedLevel === l.value
                                return (
                                    <Animated.View
                                        key={l.value}
                                        entering={FadeInDown.delay(idx * 60).duration(300)}
                                    >
                                        <TouchableOpacity
                                            style={{
                                                ...(isSelected ? T.glass.vivid : T.glass.base),
                                                backgroundColor: isSelected ? `${T.color.semantic.success}10` : T.glass.base.backgroundColor,
                                                padding: T.spacing[4] + 2, borderRadius: T.radius.lg, marginBottom: 12,
                                                borderWidth: 1.5,
                                                borderColor: isSelected ? T.color.semantic.success : 'transparent',
                                                flexDirection: 'row', alignItems: 'center',
                                                ...(isSelected ? T.glow.hero(T.color.semantic.success) : {}),
                                            }}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.selectionAsync()
                                                setSelectedLevel(l.value)
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <View style={{
                                                width: 48, height: 48, borderRadius: T.radius.md,
                                                backgroundColor: isSelected ? `${T.color.semantic.success}15` : T.color.bg.tertiary,
                                                justifyContent: 'center', alignItems: 'center', marginRight: 14,
                                            }}>
                                                <Text style={{ fontSize: 24 }}>{l.emoji}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    ...type.h3,
                                                    color: T.color.text.primary,
                                                }}>{l.label}</Text>
                                                <Text style={{
                                                    ...type.caption,
                                                    color: T.color.text.secondary, marginTop: 3,
                                                }}>{l.desc}</Text>
                                            </View>
                                            {isSelected && (
                                                <View style={{
                                                    width: 26, height: 26, borderRadius: 13,
                                                    backgroundColor: T.color.semantic.success,
                                                    justifyContent: 'center', alignItems: 'center',
                                                }}>
                                                    <Feather name="check" size={14} color={T.color.bg.primary} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                )
                            })}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: canContinueLvl ? T.color.brand.primary : T.color.bg.tertiary,
                                    paddingVertical: 18, borderRadius: T.radius.full,
                                    alignItems: 'center', opacity: canContinueLvl ? 1 : 0.45,
                                    marginTop: T.spacing[4],
                                    ...(canContinueLvl ? T.glow.hero(T.color.brand.primary) : {}),
                                }}
                                onPress={handleContinue}
                                disabled={!canContinueLvl}
                                activeOpacity={0.85}
                            >
                                <Text style={{
                                    color: canContinueLvl ? '#fff' : T.color.text.secondary,
                                    fontFamily: T.fonts.display.black, fontSize: 17,
                                }}>
                                    🏀 Let's go!
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    )
}

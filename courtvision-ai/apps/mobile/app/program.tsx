/**
 * Training Program — V4 Design
 * 7-day AI-generated training schedule with daily exercises, progress tracking.
 * Reanimated v3, Feather icons, English, fontFamily applied.
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useState, useCallback, useEffect } from 'react'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { XPBadge } from '../components/XPBadge'
import { T, typePresets } from '../lib/theme'

const type = typePresets

// ── Mock data ──────────────────────────────────────────────

const WEEKLY_PROGRAM = [
    { day: 1, label: 'Mon', focus: 'Shot Mechanics', duration: 45, done: true, xp: 20 },
    { day: 2, label: 'Tue', focus: 'Defense & Footwork', duration: 40, done: true, xp: 18 },
    { day: 3, label: 'Wed', focus: 'Active Recovery', duration: 30, done: false, isToday: true, xp: 12 },
    { day: 4, label: 'Thu', focus: '1v1 Creation', duration: 50, done: false, xp: 22 },
    { day: 5, label: 'Fri', focus: 'Mental Pressure', duration: 45, done: false, xp: 20 },
    { day: 6, label: 'Sat', focus: '2v2 Game', duration: 60, done: false, xp: 30 },
    { day: 7, label: 'Sun', focus: 'Test & Film', duration: 30, done: false, xp: 15 },
]

const TODAY_EXERCISES = [
    { name: 'Full-court sprints', reps: '10 round-trips', intensity: 'Moderate' as const, xp: 4, done: false },
    { name: 'Mental visualization', reps: '15 minutes', intensity: 'Low' as const, xp: 3, done: false },
    { name: 'Weak-hand dribbles', reps: '4 sets × 5 min', intensity: 'Moderate' as const, xp: 5, done: false },
]

const INTENSITY_COLORS: Record<string, string> = {
    Low: T.color.semantic.success,
    Moderate: T.color.semantic.warning,
    High: T.color.semantic.error,
}

// ── Animated Progress Bar ──────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
    const width = useSharedValue(0)
    useEffect(() => {
        width.value = withTiming(progress, { duration: 500 })
    }, [progress])
    const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }))

    return (
        <View style={{
            height: 8, backgroundColor: T.color.background.tertiary, borderRadius: 4,
            marginBottom: 6, overflow: 'hidden',
            borderWidth: 1, borderColor: T.color.border.subtle,
        }}>
            <Animated.View style={[{
                height: 8, borderRadius: 4, backgroundColor: T.color.semantic.success,
            }, barStyle]} />
        </View>
    )
}

// ── Main Screen ──────────────────────────────────────────────

export default function TrainingProgram() {
    const router = useRouter()
    const addXP = useStore(s => s.addXP)
    const [exercises, setExercises] = useState(TODAY_EXERCISES)
    const [xpPopup, setXpPopup] = useState<{ amount: number; label: string } | null>(null)

    const completedCount = exercises.filter(e => e.done).length
    const progressPct = (completedCount / exercises.length) * 100

    const toggleExercise = useCallback((i: number) => {
        const ex = exercises[i]
        const nowDone = !ex.done
        setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, done: !e.done } : e))
        if (nowDone) {
            addXP(ex.xp, ex.name)
            setXpPopup({ amount: ex.xp, label: ex.name })
            toast.xp(`+${ex.xp} XP`, ex.name)
        }
    }, [exercises, addXP])

    const allDone = completedCount === exercises.length

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: T.spacing[5], paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[5] }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 42, height: 42, borderRadius: T.borderRadius.md,
                                ...T.glass.light,
                                justifyContent: 'center', alignItems: 'center', marginRight: 14,
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Feather name="arrow-left" size={20} color={T.color.text.primary} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                ...type.sectionTitle,
                                color: T.color.text.primary,
                            }}>
                                7-Day Program
                            </Text>
                            <Text style={{ ...type.caption, color: T.color.text.secondary }}>
                                AI-generated · based on your weaknesses
                            </Text>
                        </View>
                    </Animated.View>

                    {/* XP popup */}
                    {xpPopup && (
                        <XPBadge amount={xpPopup.amount} label={xpPopup.label} onDone={() => setXpPopup(null)} />
                    )}

                    {/* Weekly Goal */}
                    <Animated.View entering={FadeInDown.duration(400).delay(80)} style={{
                        ...T.glass.accent,
                        borderRadius: T.borderRadius.lg, padding: T.spacing[4], marginBottom: T.spacing[6],
                        ...T.glow(T.color.signature.primary, 0.08),
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Feather name="target" size={16} color={T.color.signature.primary} />
                            <Text style={{
                                ...type.cardTitle,
                                color: T.color.signature.primary,
                            }}>
                                Weekly Goal
                            </Text>
                        </View>
                        <Text style={{ ...type.body, color: T.color.text.primary, lineHeight: 22 }}>
                            Rebuild your confidence and stabilize your mental game under pressure. Focus on mid-range shots after drives.
                        </Text>
                    </Animated.View>

                    {/* Weekly Calendar */}
                    <Text style={{
                        ...type.cardTitle,
                        color: T.color.text.primary, fontSize: 20,
                        marginBottom: T.spacing[3],
                    }}>
                        This Week
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[6] }}>
                        {WEEKLY_PROGRAM.map((day, i) => (
                            <Animated.View key={day.day} entering={FadeInUp.duration(300).delay(i * 50)} style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={{
                                    ...type.caption,
                                    color: T.color.text.secondary, marginBottom: 4,
                                }}>
                                    {day.label}
                                </Text>
                                <View style={{
                                    width: 38, height: 38, borderRadius: 19,
                                    backgroundColor: day.done ? T.color.semantic.success : day.isToday ? T.color.semantic.info : T.color.background.tertiary,
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: day.isToday ? 2 : 0,
                                    borderColor: T.color.signature.primary,
                                    ...(day.done ? T.glow(T.color.semantic.success, 0.2) : day.isToday ? T.glow(T.color.signature.primary, 0.2) : {}),
                                }}>
                                    {day.done
                                        ? <Feather name="check" size={16} color="#FFF" />
                                        : <Text style={{
                                            color: day.isToday ? '#FFF' : T.color.text.secondary,
                                            fontFamily: T.fonts.display.bold, fontSize: 14,
                                        }}>{day.day}</Text>
                                    }
                                </View>
                                <Text style={{
                                    ...type.overline,
                                    color: T.color.text.tertiary, marginTop: 3,
                                    textAlign: 'center', fontSize: 10,
                                }}>
                                    +{day.xp}xp
                                </Text>
                            </Animated.View>
                        ))}
                    </View>

                    {/* Today's Session */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.spacing[2] }}>
                        <Text style={{
                            ...type.cardTitle,
                            color: T.color.text.primary, fontSize: 20,
                        }}>
                            Today's Session
                        </Text>
                        <View style={{
                            ...T.glass.light,
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: T.borderRadius.sm,
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                            <Feather name="clock" size={12} color={T.color.text.secondary} />
                            <Text style={{ ...type.caption, color: T.color.text.secondary }}>
                                30 min
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <ProgressBar progress={progressPct} />
                    <Text style={{
                        ...type.caption,
                        color: T.color.text.secondary, marginBottom: T.spacing[4],
                    }}>
                        {completedCount}/{exercises.length} exercises · +{exercises.filter(e => e.done).reduce((a, e) => a + e.xp, 0)} XP earned
                    </Text>

                    {/* Exercise List */}
                    {exercises.map((ex, i) => (
                        <Animated.View key={i} entering={FadeInDown.duration(300).delay(100 + i * 60)}>
                            <TouchableOpacity
                                style={{
                                    ...T.glass.light,
                                    borderRadius: T.borderRadius.lg, padding: T.spacing[4] + 2, marginBottom: 10,
                                    flexDirection: 'row', alignItems: 'center',
                                    opacity: ex.done ? 0.6 : 1,
                                    borderWidth: 1,
                                    borderColor: ex.done ? `${T.color.semantic.success}40` : T.color.border.subtle,
                                    ...(ex.done ? T.glow(T.color.semantic.success, 0.06) : {}),
                                }}
                                onPress={() => toggleExercise(i)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: ex.done }}
                                accessibilityLabel={`${ex.done ? 'Uncheck' : 'Check'}: ${ex.name}`}
                            >
                                <View style={{
                                    width: 30, height: 30, borderRadius: 15,
                                    backgroundColor: ex.done ? T.color.semantic.success : 'transparent',
                                    borderWidth: 2,
                                    borderColor: ex.done ? T.color.semantic.success : T.color.text.secondary,
                                    justifyContent: 'center', alignItems: 'center',
                                    marginRight: 14,
                                    ...(ex.done ? T.glow(T.color.semantic.success, 0.25) : {}),
                                }}>
                                    {ex.done && <Feather name="check" size={16} color="#FFF" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        ...type.bodySemibold,
                                        color: T.color.text.primary,
                                        textDecorationLine: ex.done ? 'line-through' : 'none',
                                    }}>
                                        {ex.name}
                                    </Text>
                                    <Text style={{
                                        ...type.caption,
                                        color: T.color.text.secondary, marginTop: 3,
                                    }}>
                                        {ex.reps}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <View style={{
                                        backgroundColor: `${INTENSITY_COLORS[ex.intensity] ?? T.color.text.secondary}18`,
                                        borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                                    }}>
                                        <Text style={{
                                            color: INTENSITY_COLORS[ex.intensity] ?? T.color.text.secondary,
                                            fontSize: 12, fontFamily: T.fonts.body.semibold,
                                        }}>
                                            {ex.intensity}
                                        </Text>
                                    </View>
                                    <Text style={{
                                        ...type.overline,
                                        color: T.color.gamification.purple,
                                        fontSize: 12,
                                    }}>
                                        +{ex.xp} XP
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}

                    {/* Completion Card */}
                    {allDone && (
                        <Animated.View
                            entering={ZoomIn.duration(400)}
                            style={{
                                backgroundColor: T.color.semantic.successDim, borderRadius: T.borderRadius.xl,
                                padding: 24, alignItems: 'center', marginTop: T.spacing[2],
                                borderWidth: 1, borderColor: `${T.color.semantic.success}50`,
                                ...T.glow(T.color.semantic.success, 0.15),
                            }}
                        >
                            <View style={{
                                width: 56, height: 56, borderRadius: 28,
                                backgroundColor: `${T.color.semantic.success}20`,
                                justifyContent: 'center', alignItems: 'center', marginBottom: 10,
                            }}>
                                <Feather name="award" size={28} color={T.color.semantic.success} />
                            </View>
                            <Text style={{
                                ...type.sectionTitle,
                                color: T.color.semantic.success,
                            }}>
                                Session Complete!
                            </Text>
                            <Text style={{
                                ...type.body,
                                color: T.color.text.secondary,
                                marginTop: 6, textAlign: 'center',
                            }}>
                                +{TODAY_EXERCISES.reduce((a, e) => a + e.xp, 0)} XP · Streak maintained
                            </Text>
                            <TouchableOpacity
                                style={{
                                    marginTop: 16, backgroundColor: T.color.semantic.success,
                                    borderRadius: T.borderRadius.md, paddingHorizontal: 24, paddingVertical: 11,
                                    ...T.glow(T.color.semantic.success, 0.25),
                                }}
                                onPress={() => router.back()}
                                accessibilityRole="button"
                            >
                                <Text style={{
                                    color: T.color.background.primary, fontFamily: T.fonts.display.bold,
                                    fontSize: 16,
                                }}>
                                    Back to Dashboard
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    )
}

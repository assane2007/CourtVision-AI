/**
 * Training Program Ã¢â‚¬â€ V3 Design
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
import { T } from '../lib/theme'

// Ã¢â€â‚¬Ã¢â€â‚¬ Mock data (replaced by API /api/analyses/:id/program in production) Ã¢â€â‚¬Ã¢â€â‚¬

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
    { name: 'Weak-hand dribbles', reps: '4 sets Ãƒâ€” 5 min', intensity: 'Moderate' as const, xp: 5, done: false },
]

const INTENSITY_COLORS: Record<string, string> = {
    Low: T.colors.green,
    Moderate: T.colors.orange,
    High: T.colors.red,
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Animated Progress Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function ProgressBar({ progress }: { progress: number }) {
    const width = useSharedValue(0)
    useEffect(() => {
        width.value = withTiming(progress, { duration: 500 })
    }, [progress])
    const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }))

    return (
        <View style={{
            height: 8, backgroundColor: T.colors.dimmer, borderRadius: 4,
            marginBottom: 6, overflow: 'hidden',
            borderWidth: 1, borderColor: T.colors.border,
        }}>
            <Animated.View style={[{
                height: 8, borderRadius: 4, backgroundColor: T.colors.green,
            }, barStyle]} />
        </View>
    )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main Screen Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: T.space.xl, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.xl }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 42, height: 42, borderRadius: T.radius.md,
                                ...T.glass.light,
                                justifyContent: 'center', alignItems: 'center', marginRight: 14,
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Feather name="arrow-left" size={20} color={T.colors.white} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: T.colors.white, fontSize: T.font.xl, fontWeight: '900',
                                letterSpacing: -0.3, fontFamily: T.fonts.display.black,
                            }}>
                                7-Day Program
                            </Text>
                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, fontFamily: T.fonts.body.regular }}>
                                AI-generated Ã‚Â· based on your weaknesses
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
                        borderRadius: T.radius.lg, padding: T.space.lg, marginBottom: T.space.xxl,
                        ...T.glow(T.colors.accent, 0.08),
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Feather name="target" size={16} color={T.colors.accent} />
                            <Text style={{
                                color: T.colors.accent, fontWeight: '700', fontSize: T.font.md,
                                fontFamily: T.fonts.display.bold,
                            }}>
                                Weekly Goal
                            </Text>
                        </View>
                        <Text style={{ color: T.colors.white, lineHeight: 22, fontSize: T.font.md, fontFamily: T.fonts.body.regular }}>
                            Rebuild your confidence and stabilize your mental game under pressure. Focus on mid-range shots after drives.
                        </Text>
                    </Animated.View>

                    {/* Weekly Calendar */}
                    <Text style={{
                        color: T.colors.white, fontWeight: '800', fontSize: T.font.lg,
                        marginBottom: T.space.md, fontFamily: T.fonts.display.bold,
                    }}>
                        This Week
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.space.xxl }}>
                        {WEEKLY_PROGRAM.map((day, i) => (
                            <Animated.View key={day.day} entering={FadeInUp.duration(300).delay(i * 50)} style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={{
                                    color: T.colors.muted, fontSize: T.font.xs + 1, marginBottom: 4,
                                    fontFamily: T.fonts.body.medium,
                                }}>
                                    {day.label}
                                </Text>
                                <View style={{
                                    width: 38, height: 38, borderRadius: 19,
                                    backgroundColor: day.done ? T.colors.green : day.isToday ? T.colors.primary : T.colors.dimmer,
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: day.isToday ? 2 : 0,
                                    borderColor: T.colors.accent,
                                    ...(day.done ? T.glow(T.colors.green, 0.2) : day.isToday ? T.glow(T.colors.accent, 0.2) : {}),
                                }}>
                                    {day.done
                                        ? <Feather name="check" size={16} color="#FFF" />
                                        : <Text style={{
                                            color: day.isToday ? '#FFF' : T.colors.muted,
                                            fontWeight: '700', fontSize: T.font.sm + 1,
                                            fontFamily: T.fonts.display.bold,
                                        }}>{day.day}</Text>
                                    }
                                </View>
                                <Text style={{
                                    color: T.colors.dim, fontSize: T.font.xs, marginTop: 3,
                                    textAlign: 'center', fontFamily: T.fonts.body.regular,
                                }}>
                                    +{day.xp}xp
                                </Text>
                            </Animated.View>
                        ))}
                    </View>

                    {/* Today's Session */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.space.sm }}>
                        <Text style={{
                            color: T.colors.white, fontWeight: '800', fontSize: T.font.lg,
                            fontFamily: T.fonts.display.bold,
                        }}>
                            Today's Session
                        </Text>
                        <View style={{
                            ...T.glass.light,
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: T.radius.sm,
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                            <Feather name="clock" size={12} color={T.colors.textSecondary} />
                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, fontFamily: T.fonts.body.medium }}>
                                30 min
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <ProgressBar progress={progressPct} />
                    <Text style={{
                        color: T.colors.textSecondary, fontSize: T.font.sm, marginBottom: T.space.lg,
                        fontFamily: T.fonts.body.regular,
                    }}>
                        {completedCount}/{exercises.length} exercises Ã‚Â· +{exercises.filter(e => e.done).reduce((a, e) => a + e.xp, 0)} XP earned
                    </Text>

                    {/* Exercise List */}
                    {exercises.map((ex, i) => (
                        <Animated.View key={i} entering={FadeInDown.duration(300).delay(100 + i * 60)}>
                            <TouchableOpacity
                                style={{
                                    ...T.glass.light,
                                    borderRadius: T.radius.lg, padding: T.space.lg + 2, marginBottom: 10,
                                    flexDirection: 'row', alignItems: 'center',
                                    opacity: ex.done ? 0.6 : 1,
                                    borderWidth: 1,
                                    borderColor: ex.done ? `${T.colors.green}40` : T.colors.border,
                                    ...(ex.done ? T.glow(T.colors.green, 0.06) : {}),
                                }}
                                onPress={() => toggleExercise(i)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: ex.done }}
                                accessibilityLabel={`${ex.done ? 'Uncheck' : 'Check'}: ${ex.name}`}
                            >
                                <View style={{
                                    width: 30, height: 30, borderRadius: 15,
                                    backgroundColor: ex.done ? T.colors.green : 'transparent',
                                    borderWidth: 2,
                                    borderColor: ex.done ? T.colors.green : T.colors.muted,
                                    justifyContent: 'center', alignItems: 'center',
                                    marginRight: 14,
                                    ...(ex.done ? T.glow(T.colors.green, 0.25) : {}),
                                }}>
                                    {ex.done && <Feather name="check" size={16} color="#FFF" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        color: T.colors.white, fontWeight: '600', fontSize: T.font.md + 1,
                                        textDecorationLine: ex.done ? 'line-through' : 'none',
                                        fontFamily: T.fonts.body.semibold,
                                    }}>
                                        {ex.name}
                                    </Text>
                                    <Text style={{
                                        color: T.colors.textSecondary, fontSize: T.font.sm + 1, marginTop: 3,
                                        fontFamily: T.fonts.body.regular,
                                    }}>
                                        {ex.reps}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <View style={{
                                        backgroundColor: `${INTENSITY_COLORS[ex.intensity] ?? T.colors.muted}18`,
                                        borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                                    }}>
                                        <Text style={{
                                            color: INTENSITY_COLORS[ex.intensity] ?? T.colors.muted,
                                            fontSize: T.font.xs + 1, fontWeight: '600',
                                            fontFamily: T.fonts.body.medium,
                                        }}>
                                            {ex.intensity}
                                        </Text>
                                    </View>
                                    <Text style={{
                                        color: T.colors.purple, fontSize: T.font.xs + 1, fontWeight: '700',
                                        fontFamily: T.fonts.display.semibold,
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
                                backgroundColor: T.colors.greenDim, borderRadius: T.radius.xl,
                                padding: 24, alignItems: 'center', marginTop: T.space.sm,
                                borderWidth: 1, borderColor: `${T.colors.green}50`,
                                ...T.glow(T.colors.green, 0.15),
                            }}
                        >
                            <View style={{
                                width: 56, height: 56, borderRadius: 28,
                                backgroundColor: `${T.colors.green}20`,
                                justifyContent: 'center', alignItems: 'center', marginBottom: 10,
                            }}>
                                <Feather name="award" size={28} color={T.colors.green} />
                            </View>
                            <Text style={{
                                color: T.colors.green, fontWeight: '900', fontSize: T.font.xl,
                                fontFamily: T.fonts.display.black,
                            }}>
                                Session Complete!
                            </Text>
                            <Text style={{
                                color: T.colors.textSecondary, marginTop: 6,
                                textAlign: 'center', fontSize: T.font.md, fontFamily: T.fonts.body.regular,
                            }}>
                                +{TODAY_EXERCISES.reduce((a, e) => a + e.xp, 0)} XP Ã‚Â· Streak maintained
                            </Text>
                            <TouchableOpacity
                                style={{
                                    marginTop: 16, backgroundColor: T.colors.green,
                                    borderRadius: T.radius.md, paddingHorizontal: 24, paddingVertical: 11,
                                    ...T.glow(T.colors.green, 0.25),
                                }}
                                onPress={() => router.back()}
                                accessibilityRole="button"
                            >
                                <Text style={{
                                    color: T.colors.bg, fontWeight: '800', fontSize: T.font.md + 1,
                                    fontFamily: T.fonts.display.bold,
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

/**
 * DailyChallengeCard Ã¢â‚¬â€ Premium daily challenge widget.
 * Glassmorphism, glow effects, Reanimated v3.
 */

import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    interpolate,
} from 'react-native-reanimated'
import { useDailyChallenge, DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../hooks/useDailyChallenge'
import { T } from '../lib/theme'

export function DailyChallengeCard() {
    const { challenge, loading, timeLeft, progressPct, claimReward } = useDailyChallenge()
    const progress = useSharedValue(0)
    const pulse    = useSharedValue(1)

    useEffect(() => {
        progress.value = withTiming(progressPct / 100, { duration: 800 })
    }, [progressPct])

    useEffect(() => {
        if (challenge?.completed && !challenge?.claimed) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 700 }),
                    withTiming(1, { duration: 700 }),
                ),
                -1,
            )
        }
    }, [challenge?.completed])

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
    }))

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    if (loading) {
        return (
            <View style={{
                ...T.glass.light,
                borderRadius: T.radius.lg, padding: 20,
                marginBottom: 16, alignItems: 'center',
                justifyContent: 'center', height: 100,
            }}>
                <ActivityIndicator color={T.colors.accent} />
            </View>
        )
    }

    if (!challenge) return null

    const color = DIFFICULTY_COLORS[challenge.difficulty]
    const isExpired = new Date(challenge.expires_at).getTime() < Date.now()

    return (
        <Animated.View style={[{
            borderRadius: T.radius.lg,
            ...T.glass.light,
            borderColor: challenge.completed && !challenge.claimed ? `${color}50` : T.glass.light.borderColor,
            marginBottom: 16, overflow: 'hidden',
            ...(challenge.completed && !challenge.claimed ? T.glow(color, 0.2) : {}),
        }, pulseStyle]}>
            {/* Header */}
            <View style={{
                backgroundColor: `${color}10`,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: `${color}15`,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{challenge.emoji}</Text>
                    <Text style={{
                        color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase',
                        letterSpacing: 1, fontFamily: T.fonts.display.black,
                    }}>
                        Daily Challenge
                    </Text>
                    <View style={{
                        backgroundColor: `${color}18`, borderRadius: 6,
                        paddingHorizontal: 7, paddingVertical: 2,
                        borderWidth: 1, borderColor: `${color}30`,
                    }}>
                        <Text style={{ color, fontSize: 9, fontWeight: '700', fontFamily: T.fonts.body.bold }}>
                            {DIFFICULTY_LABELS[challenge.difficulty]}
                        </Text>
                    </View>
                </View>

                {/* Countdown */}
                {!challenge.completed && !isExpired && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="clock" size={11} color={T.colors.muted} />
                        <Text style={{
                            color: T.colors.muted, fontSize: 11, fontVariant: ['tabular-nums'],
                            fontFamily: T.fonts.body.regular,
                        }}>
                            {timeLeft}
                        </Text>
                    </View>
                )}
                {challenge.completed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="check-circle" size={14} color={T.colors.green} />
                        <Text style={{
                            color: T.colors.green, fontSize: 11, fontWeight: '700',
                            fontFamily: T.fonts.body.bold,
                        }}>
                            Completed
                        </Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={{ padding: 16 }}>
                <Text style={{
                    color: T.colors.white, fontWeight: '700', fontSize: 15, marginBottom: 4,
                    fontFamily: T.fonts.body.bold,
                }}>
                    {challenge.title}
                </Text>
                <Text style={{
                    color: T.colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 14,
                    fontFamily: T.fonts.body.regular,
                }}>
                    {challenge.description}
                </Text>

                {/* Progress */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <View style={{
                        flex: 1, height: 6, backgroundColor: T.colors.dimmer,
                        borderRadius: 3, overflow: 'hidden',
                    }}>
                        <Animated.View style={[{
                            height: 6, borderRadius: 3, backgroundColor: color,
                        }, progressBarStyle]} />
                    </View>
                    <Text style={{
                        color: T.colors.muted, fontSize: 11, minWidth: 50, textAlign: 'right',
                        fontVariant: ['tabular-nums'], fontFamily: T.fonts.body.regular,
                    }}>
                        {challenge.current}/{challenge.target}
                    </Text>
                </View>

                {/* Footer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="zap" size={12} color={T.colors.purple} />
                            <Text style={{
                                color: T.colors.purple, fontWeight: '900', fontSize: 14,
                                fontFamily: T.fonts.display.black,
                            }}>
                                +{challenge.xp_reward} XP
                            </Text>
                        </View>
                        {challenge.bonus_xp && !challenge.completed && (
                            <View style={{
                                backgroundColor: `${T.colors.gold}12`, borderRadius: 6,
                                paddingHorizontal: 7, paddingVertical: 2,
                                borderWidth: 1, borderColor: `${T.colors.gold}25`,
                            }}>
                                <Text style={{
                                    color: T.colors.gold, fontSize: 10, fontWeight: '700',
                                    fontFamily: T.fonts.body.bold,
                                }}>
                                    +{challenge.bonus_xp} bonus before 6pm
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Claim button */}
                    {challenge.completed && !challenge.claimed && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: color,
                                borderRadius: T.radius.sm,
                                paddingHorizontal: 18, paddingVertical: 9,
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                ...T.glow(color, 0.25),
                            }}
                            onPress={claimReward}
                            accessibilityRole="button"
                        >
                            <Feather name="zap" size={12} color={T.colors.bg} />
                            <Text style={{
                                color: T.colors.bg, fontWeight: '800', fontSize: 13,
                                fontFamily: T.fonts.display.bold,
                            }}>
                                Claim!
                            </Text>
                        </TouchableOpacity>
                    )}

                    {challenge.claimed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="gift" size={14} color={T.colors.green} />
                            <Text style={{
                                color: T.colors.green, fontSize: 12, fontWeight: '600',
                                fontFamily: T.fonts.body.semibold,
                            }}>
                                Claimed
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    )
}

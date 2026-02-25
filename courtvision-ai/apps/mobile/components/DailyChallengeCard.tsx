/**
 * DailyChallengeCard — Widget de défi quotidien premium.
 * Glassmorphism, glow effects, animations fluides.
 */

import React, { useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Animated, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useDailyChallenge, DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../hooks/useDailyChallenge'
import { T } from '../lib/theme'

export function DailyChallengeCard() {
    const { challenge, loading, timeLeft, progressPct, claimReward } = useDailyChallenge()
    const progressAnim = useRef(new Animated.Value(0)).current
    const pulseAnim    = useRef(new Animated.Value(1)).current

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPct / 100, duration: 800, useNativeDriver: false,
        }).start()
    }, [progressPct])

    useEffect(() => {
        if (challenge?.completed && !challenge?.claimed) {
            Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.02, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])).start()
        }
    }, [challenge?.completed])

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
        <Animated.View style={{
            borderRadius: T.radius.lg,
            ...T.glass.light,
            borderColor: challenge.completed && !challenge.claimed ? `${color}50` : T.glass.light.borderColor,
            marginBottom: 16, overflow: 'hidden',
            transform: [{ scale: pulseAnim }],
            ...(challenge.completed && !challenge.claimed ? T.glow(color, 0.2) : {}),
        }}>
            {/* Header */}
            <View style={{
                backgroundColor: `${color}10`,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: `${color}15`,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{challenge.emoji}</Text>
                    <Text style={{ color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Défi du jour
                    </Text>
                    <View style={{
                        backgroundColor: `${color}18`, borderRadius: 6,
                        paddingHorizontal: 7, paddingVertical: 2,
                        borderWidth: 1, borderColor: `${color}30`,
                    }}>
                        <Text style={{ color, fontSize: 9, fontWeight: '700' }}>
                            {DIFFICULTY_LABELS[challenge.difficulty]}
                        </Text>
                    </View>
                </View>

                {/* Countdown */}
                {!challenge.completed && !isExpired && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={11} color={T.colors.muted} />
                        <Text style={{ color: T.colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                            {timeLeft}
                        </Text>
                    </View>
                )}
                {challenge.completed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={14} color={T.colors.green} />
                        <Text style={{ color: T.colors.green, fontSize: 11, fontWeight: '700' }}>Complété</Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={{ padding: 16 }}>
                <Text style={{ color: T.colors.white, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                    {challenge.title}
                </Text>
                <Text style={{ color: T.colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>
                    {challenge.description}
                </Text>

                {/* Progress */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <View style={{ flex: 1, height: 6, backgroundColor: T.colors.dimmer, borderRadius: 3, overflow: 'hidden' }}>
                        <Animated.View style={{
                            height: 6, borderRadius: 3, backgroundColor: color,
                            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        }} />
                    </View>
                    <Text style={{ color: T.colors.muted, fontSize: 11, minWidth: 50, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                        {challenge.current}/{challenge.target}
                    </Text>
                </View>

                {/* Footer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 12 }}>⚡</Text>
                            <Text style={{ color: T.colors.purple, fontWeight: '900', fontSize: 14 }}>
                                +{challenge.xp_reward} XP
                            </Text>
                        </View>
                        {challenge.bonus_xp && !challenge.completed && (
                            <View style={{
                                backgroundColor: `${T.colors.gold}12`, borderRadius: 6,
                                paddingHorizontal: 7, paddingVertical: 2,
                                borderWidth: 1, borderColor: `${T.colors.gold}25`,
                            }}>
                                <Text style={{ color: T.colors.gold, fontSize: 10, fontWeight: '700' }}>
                                    +{challenge.bonus_xp} bonus si avant 18h
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
                            <Text style={{ fontSize: 12 }}>⚡</Text>
                            <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: 13 }}>Réclamer !</Text>
                        </TouchableOpacity>
                    )}

                    {challenge.claimed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="gift" size={14} color={T.colors.green} />
                            <Text style={{ color: T.colors.green, fontSize: 12, fontWeight: '600' }}>Réclamé</Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    )
}

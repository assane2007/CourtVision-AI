/**
 * DailyChallengeCard — Widget de défi quotidien.
 * 
 * À afficher sur le Dashboard pour maximiser la rétention.
 * Le défi expire à minuit → crée urgence + retour garanti demain.
 * 
 * Features :
 * - Compte à rebours en temps réel
 * - Barre de progression animée
 * - Bouton "Réclamer" avec animation XP
 * - Couleur adaptée à la difficulté
 */

import React, { useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Animated, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useDailyChallenge, DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../hooks/useDailyChallenge'

export function DailyChallengeCard() {
    const { challenge, loading, timeLeft, progressPct, claimReward } = useDailyChallenge()
    const progressAnim = useRef(new Animated.Value(0)).current
    const pulseAnim    = useRef(new Animated.Value(1)).current

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPct / 100,
            duration: 800,
            useNativeDriver: false,
        }).start()
    }, [progressPct])

    // Pulse quand le défi est complété mais pas encore réclamé
    useEffect(() => {
        if (challenge?.completed && !challenge?.claimed) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.02, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
                ])
            ).start()
        }
    }, [challenge?.completed])

    if (loading) {
        return (
            <View style={{
                backgroundColor: '#161B22', borderRadius: 18, padding: 20,
                borderWidth: 1, borderColor: '#21262D', marginBottom: 16,
                alignItems: 'center', justifyContent: 'center', height: 100,
            }}>
                <ActivityIndicator color="#00D4FF" />
            </View>
        )
    }

    if (!challenge) return null

    const color = DIFFICULTY_COLORS[challenge.difficulty]
    const isExpired = new Date(challenge.expires_at).getTime() < Date.now()

    return (
        <Animated.View style={{
            backgroundColor: '#161B22',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: challenge.completed && !challenge.claimed ? color : '#21262D',
            marginBottom: 16,
            overflow: 'hidden',
            transform: [{ scale: pulseAnim }],
            shadowColor: challenge.completed && !challenge.claimed ? color : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
        }}>
            {/* Header coloré */}
            <View style={{
                backgroundColor: `${color}18`,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: `${color}25`,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{challenge.emoji}</Text>
                    <Text style={{ color, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                        Défi du jour
                    </Text>
                    <View style={{
                        backgroundColor: `${color}25`, borderRadius: 6,
                        paddingHorizontal: 7, paddingVertical: 2,
                        borderWidth: 1, borderColor: `${color}50`,
                    }}>
                        <Text style={{ color, fontSize: 9, fontWeight: '700' }}>
                            {DIFFICULTY_LABELS[challenge.difficulty]}
                        </Text>
                    </View>
                </View>

                {/* Countdown */}
                {!challenge.completed && !isExpired && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time-outline" size={11} color="#8B949E" />
                        <Text style={{ color: '#8B949E', fontSize: 11, fontFamily: 'monospace' }}>
                            {timeLeft}
                        </Text>
                    </View>
                )}
                {challenge.completed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#00C853" />
                        <Text style={{ color: '#00C853', fontSize: 11, fontWeight: '700' }}>Complété</Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={{ padding: 16 }}>
                <Text style={{ color: '#E6EDF3', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                    {challenge.title}
                </Text>
                <Text style={{ color: '#8B949E', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
                    {challenge.description}
                </Text>

                {/* Progress bar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#21262D', borderRadius: 3, overflow: 'hidden' }}>
                        <Animated.View style={{
                            height: 6, borderRadius: 3, backgroundColor: color,
                            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        }} />
                    </View>
                    <Text style={{ color: '#8B949E', fontSize: 11, minWidth: 50, textAlign: 'right' }}>
                        {challenge.current}/{challenge.target}
                    </Text>
                </View>

                {/* Footer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 12 }}>⚡</Text>
                            <Text style={{ color: '#B388FF', fontWeight: '800', fontSize: 14 }}>
                                +{challenge.xp_reward} XP
                            </Text>
                        </View>
                        {challenge.bonus_xp && !challenge.completed && (
                            <View style={{
                                backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 6,
                                paddingHorizontal: 7, paddingVertical: 2,
                                borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
                            }}>
                                <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>
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
                                borderRadius: 12,
                                paddingHorizontal: 16, paddingVertical: 8,
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}
                            onPress={claimReward}
                            accessibilityRole="button"
                            accessibilityLabel={`Réclamer ${challenge.xp_reward} XP`}
                        >
                            <Text style={{ fontSize: 12 }}>⚡</Text>
                            <Text style={{ color: '#0D1117', fontWeight: '800', fontSize: 13 }}>
                                Réclamer !
                            </Text>
                        </TouchableOpacity>
                    )}

                    {challenge.claimed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="gift" size={14} color="#00C853" />
                            <Text style={{ color: '#00C853', fontSize: 12, fontWeight: '600' }}>Réclamé</Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    )
}

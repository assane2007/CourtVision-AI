/**
 * StreakReminderBanner
 * Bannière d'alerte en cas de streak en danger.
 * S'affiche seulement si le joueur a un streak actif et n'a pas joué aujourd'hui.
 */

import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useStore, selectStreak } from '../lib/store'
import { T } from '../lib/theme'

interface StreakReminderBannerProps {
    onDismiss?: () => void
}

export function StreakReminderBanner({ onDismiss }: StreakReminderBannerProps) {
    const router  = useRouter()
    const streak  = useStore(selectStreak)
    const slideAnim = useRef(new Animated.Value(-80)).current
    const opacAnim  = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (streak > 0) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 9 }),
                Animated.timing(opacAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start()
        }
    }, [streak])

    if (streak === 0) return null

    const dismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -80, duration: 250, useNativeDriver: true }),
            Animated.timing(opacAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onDismiss?.())
    }

    return (
        <Animated.View style={{
            transform: [{ translateY: slideAnim }],
            opacity: opacAnim,
            borderRadius: T.radius.lg, marginHorizontal: T.space.lg, marginBottom: T.space.md,
            padding: T.space.md, flexDirection: 'row', alignItems: 'center',
            ...T.glass.light,
            borderWidth: 1.5, borderColor: T.colors.orange,
            ...T.glow(T.colors.orange, 0.2),
        }}>
            <Text style={{ fontSize: 28, marginRight: T.space.md }}>🔥</Text>
            <View style={{ flex: 1 }}>
                <Text style={{ color: T.colors.orange, fontSize: T.font.md, fontWeight: '800' }}>
                    Streak {streak}j en danger !
                </Text>
                <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 2 }}>
                    Lance une session pour ne pas le perdre
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => { dismiss(); router.push('/(dashboard)/upload') }}
                activeOpacity={0.8}
                style={{
                    backgroundColor: T.colors.orange, borderRadius: T.radius.sm,
                    paddingHorizontal: 12, paddingVertical: 7, marginRight: T.space.sm,
                    ...T.shadow(T.colors.orange, 0.3, 8),
                }}
            >
                <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.sm }}>Jouer →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismiss}>
                <Ionicons name="close" size={18} color={T.colors.muted} />
            </TouchableOpacity>
        </Animated.View>
    )
}

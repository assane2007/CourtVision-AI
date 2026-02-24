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

const C = {
    bg: '#1A0A00', border: '#FF6B00', orange: '#FFB300',
    white: '#E6EDF3', muted: '#8B949E',
}

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
            backgroundColor: '#1A0A00',
            borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
            padding: 14, flexDirection: 'row', alignItems: 'center',
            borderWidth: 1.5, borderColor: '#FF6B00',
            shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 10,
        }}>
            <Text style={{ fontSize: 28, marginRight: 12 }}>🔥</Text>
            <View style={{ flex: 1 }}>
                <Text style={{ color: C.orange, fontSize: 14, fontWeight: '800' }}>
                    Streak {streak}j en danger !
                </Text>
                <Text style={{ color: '#B06020', fontSize: 12, marginTop: 2 }}>
                    Lance une session pour ne pas le perdre
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => { dismiss(); router.push('/(dashboard)/upload') }}
                style={{
                    backgroundColor: '#FF6B00', borderRadius: 12,
                    paddingHorizontal: 12, paddingVertical: 7, marginRight: 8,
                }}
            >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Jouer →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismiss}>
                <Ionicons name="close" size={18} color="#B06020" />
            </TouchableOpacity>
        </Animated.View>
    )
}

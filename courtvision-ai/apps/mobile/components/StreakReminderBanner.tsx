/**
 * StreakReminderBanner — Alert banner when streak is at risk.
 * V3: Reanimated v3, Feather icons, English, fontFamily.
 */

import { View, Text, TouchableOpacity } from 'react-native'
import { useCallback } from 'react'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { useStore, selectStreak } from '../lib/store'
import { T } from '../lib/theme'

interface StreakReminderBannerProps {
    onDismiss?: () => void
}

export function StreakReminderBanner({ onDismiss }: StreakReminderBannerProps) {
    const router = useRouter()
    const streak = useStore(selectStreak)

    const goPlay = useCallback(() => {
        onDismiss?.()
        router.push('/(dashboard)/upload')
    }, [onDismiss, router])

    if (streak === 0) return null

    return (
        <Animated.View
            entering={FadeInDown.springify().damping(14).stiffness(120)}
            exiting={FadeOutUp.duration(250)}
            style={{
                borderRadius: T.radius.lg, marginHorizontal: T.space.lg, marginBottom: T.space.md,
                padding: T.space.md, flexDirection: 'row', alignItems: 'center',
                ...T.glass.light,
                borderWidth: 1.5, borderColor: T.colors.orange,
                ...T.glow(T.colors.orange, 0.2),
            }}
        >
            <Text style={{ fontSize: 28, marginRight: T.space.md }}>🔥</Text>
            <View style={{ flex: 1 }}>
                <Text style={{
                    color: T.colors.orange, fontSize: T.font.md, fontWeight: '800',
                    fontFamily: T.fonts.display.bold,
                }}>
                    {streak}-day streak at risk!
                </Text>
                <Text style={{
                    color: T.colors.muted, fontSize: T.font.sm, marginTop: 2,
                    fontFamily: T.fonts.body.regular,
                }}>
                    Start a session to keep it going
                </Text>
            </View>
            <TouchableOpacity
                onPress={goPlay}
                activeOpacity={0.8}
                style={{
                    backgroundColor: T.colors.orange, borderRadius: T.radius.sm,
                    paddingHorizontal: 12, paddingVertical: 7, marginRight: T.space.sm,
                    ...T.shadow(T.colors.orange, 0.3, 8),
                }}
            >
                <Text style={{
                    color: T.colors.bg, fontWeight: '800', fontSize: T.font.sm,
                    fontFamily: T.fonts.display.bold,
                }}>
                    Play →
                </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss}>
                <Feather name="x" size={18} color={T.colors.muted} />
            </TouchableOpacity>
        </Animated.View>
    )
}

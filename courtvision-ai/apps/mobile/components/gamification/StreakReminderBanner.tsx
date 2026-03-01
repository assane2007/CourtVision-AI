/**
 * StreakReminderBanner — Alert banner when streak is at risk.
 * V3: Reanimated v3, Feather icons, English, fontFamily.
 */

import { View, Text, TouchableOpacity } from 'react-native'
import { useCallback } from 'react'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { useStore, selectStreak } from '../../lib/store'
import { T } from '../../lib/theme'

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
                borderRadius: T.radius.lg, marginHorizontal: T.spacing[4], marginBottom: T.spacing[3],
                padding: T.spacing[3], flexDirection: 'row', alignItems: 'center',
                ...T.glass.base,
                borderWidth: 1.5, borderColor: T.color.semantic.warning,
                ...T.glow.soft(T.color.semantic.warning),
            }}
        >
            <Text style={{ fontSize: 28, marginRight: T.spacing[3] }}>🔥</Text>
            <View style={{ flex: 1 }}>
                <Text style={{
                    color: T.color.semantic.warning, fontSize: T.fontSize.md, fontWeight: '800',
                    fontFamily: T.fonts.display.bold,
                }}>
                    {streak}-day streak at risk!
                </Text>
                <Text style={{
                    color: T.color.text.secondary, fontSize: T.fontSize.sm, marginTop: 2,
                    fontFamily: T.fonts.body.regular,
                }}>
                    Start a session to keep it going
                </Text>
            </View>
            <TouchableOpacity
                onPress={goPlay}
                activeOpacity={0.8}
                style={{
                    backgroundColor: T.color.semantic.warning, borderRadius: T.radius.sm,
                    paddingHorizontal: 12, paddingVertical: 7, marginRight: T.spacing[2],
                    ...T.glow.soft(T.color.semantic.warning),
                }}
            >
                <Text style={{
                    color: T.color.bg.primary, fontWeight: '800', fontSize: T.fontSize.sm,
                    fontFamily: T.fonts.display.bold,
                }}>
                    Play →
                </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss}>
                <Feather name="x" size={18} color={T.color.text.secondary} />
            </TouchableOpacity>
        </Animated.View>
    )
}

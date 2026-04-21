import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence
} from 'react-native-reanimated'
import { T, typePresets } from '../../lib/theme'

const type = typePresets

interface CVHUDTimerProps {
    seconds: number
    active?: boolean
}

export function CVHUDTimer({ seconds, active = false }: CVHUDTimerProps) {
    const flash = useSharedValue(0)

    useEffect(() => {
        flash.value = 0
        if (active) {
            flash.value = withSequence(
                withTiming(1, { duration: 120 }),
                withTiming(0, { duration: 180 })
            )
        }
    }, [active, seconds])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + flash.value * 0.14 }],
        backgroundColor: active ? T.color.ai.primary : 'rgba(255, 255, 255, 0.2)',
    }))

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.indicator, pulseStyle]} />
            <Text style={styles.timeText}>{formatTime(seconds)}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.bg.secondary,
        paddingHorizontal: T.spacing[4],
        paddingVertical: T.spacing[2],
        borderRadius: T.radius.full,
        borderWidth: 0.5,
        borderColor: T.color.border.base,
        gap: T.spacing[3],
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    timeText: {
        ...type.cardTitle,
        color: T.color.text.primary,
        fontSize: 18,
        fontFamily: T.fonts.mono.regular,
        fontVariant: ['tabular-nums'],
    }
})

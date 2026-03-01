import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
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
    const pulse = useSharedValue(1)

    useEffect(() => {
        if (active) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 500 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                true
            )
        } else {
            pulse.value = withTiming(1)
        }
    }, [active])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        backgroundColor: active ? T.color.semantic.error : 'rgba(255, 255, 255, 0.2)',
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
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: T.spacing[4],
        paddingVertical: T.spacing[2],
        borderRadius: T.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        gap: T.spacing[3],
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    timeText: {
        ...type.cardTitle,
        color: '#FFF',
        fontSize: 18,
        fontVariant: ['tabular-nums'],
    }
})

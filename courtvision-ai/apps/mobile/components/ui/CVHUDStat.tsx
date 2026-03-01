import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import { T, typePresets } from '../../lib/theme'

const type = typePresets

interface CVHUDStatProps {
    label: string
    value: string | number
    subValue?: string
    color?: string
    large?: boolean
    delay?: number
}

export function CVHUDStat({
    label,
    value,
    subValue,
    color = T.color.text.primary,
    large = false,
    delay = 0
}: CVHUDStatProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify().damping(15)}
            style={styles.container}
        >
            <Text style={styles.label}>{label.toUpperCase()}</Text>
            <View style={styles.content}>
                <Text style={[styles.value, { color }, large && styles.largeValue]}>{value}</Text>
                {subValue ? (
                    <Text style={styles.subValue}>{subValue}</Text>
                ) : null}
            </View>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: T.spacing[3],
        paddingVertical: T.spacing[2],
        borderRadius: T.borderRadius.lg,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minWidth: 80,
        alignItems: 'center',
    },
    label: {
        ...type.overline,
        color: T.color.text.tertiary,
        fontSize: 8,
        letterSpacing: 1,
        marginBottom: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: T.spacing[1],
    },
    value: {
        ...type.cardTitle,
        fontSize: 20,
        fontWeight: '700' as any,
    },
    largeValue: {
        fontSize: 28,
        lineHeight: 32,
    },
    subValue: {
        ...type.overline,
        color: T.color.text.secondary,
        fontSize: 10,
    }
})

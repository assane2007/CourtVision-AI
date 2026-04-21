import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
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
            entering={FadeInDown.delay(delay).duration(320).springify().damping(18).stiffness(200)}
            style={styles.container}
        >
            <Text style={styles.label}>{label}</Text>
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
        borderRadius: T.radius.lg,
        backgroundColor: T.color.bg.tertiary,
        borderWidth: 0.5,
        borderColor: T.color.border.base,
        minWidth: 80,
        alignItems: 'center',
    },
    label: {
        ...type.systemLabel,
        color: T.color.text.tertiary,
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
        fontFamily: T.fonts.mono.regular,
    },
    largeValue: {
        fontSize: 28,
        lineHeight: 32,
    },
    subValue: {
        ...type.dataMicro,
        color: T.color.text.secondary,
    }
})

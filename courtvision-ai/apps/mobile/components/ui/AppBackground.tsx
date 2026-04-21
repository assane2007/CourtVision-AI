import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T } from '../../lib/theme'

export type AppBackgroundVariant = 'dashboard' | 'focus' | 'calm'

const VARIANT_MAP: Record<AppBackgroundVariant, readonly [string, string, string]> = {
    dashboard: [
        T.color.bg.primary,
        T.color.bg.secondary,
        T.color.bg.tertiary,
    ],
    focus: [
        T.color.bg.primary,
        T.color.bg.primary,
        T.color.bg.secondary,
    ],
    calm: [
        T.color.bg.primary,
        T.color.bg.secondary,
        T.color.bg.tertiary,
    ],
}

export function AppBackground({
    variant = 'dashboard',
}: {
    variant?: AppBackgroundVariant
}) {
    const gradient = VARIANT_MAP[variant]

    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.dataSweep} />
            <View style={styles.gridVeil} />
        </View>
    )
}

const styles = StyleSheet.create({
    dataSweep: {
        position: 'absolute',
        top: -120,
        right: -80,
        width: 300,
        height: 260,
        borderRadius: 150,
        backgroundColor: 'rgba(0,240,255,0.08)',
    },
    gridVeil: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.01)',
        borderTopWidth: 0.5,
        borderTopColor: T.color.border.hairline,
    },
})

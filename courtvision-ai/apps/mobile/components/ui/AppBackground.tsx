import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T } from '../../lib/theme'

export type AppBackgroundVariant = 'dashboard' | 'focus' | 'calm'

const VARIANT_MAP: Record<AppBackgroundVariant, readonly [string, string, string]> = {
    dashboard: [
        T.color.bg.primary,
        T.color.bg.secondary,
        '#122842',
    ],
    focus: [
        T.color.bg.primary,
        '#12213A',
        '#0E2842',
    ],
    calm: [
        T.color.bg.primary,
        '#182032',
        '#1D293F',
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
                start={{ x: 0.05, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.glowTop} />
            <View style={styles.glowBottom} />
            <View style={styles.gridVeil} />
        </View>
    )
}

const styles = StyleSheet.create({
    glowTop: {
        position: 'absolute',
        top: -100,
        left: -50,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(249,115,22,0.20)',
    },
    glowBottom: {
        position: 'absolute',
        right: -80,
        bottom: -120,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(45,212,191,0.14)',
    },
    gridVeil: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.01)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.03)',
    },
})

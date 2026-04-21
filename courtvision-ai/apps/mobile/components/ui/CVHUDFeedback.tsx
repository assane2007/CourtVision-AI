import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T, typePresets } from '../../lib/theme'

const type = typePresets

export type HUDFeedbackType = 'success' | 'warning' | 'error' | 'info'

interface CVHUDFeedbackProps {
    message: string
    type?: HUDFeedbackType
    detail?: string
}

export function CVHUDFeedback({ message, type = 'info', detail }: CVHUDFeedbackProps) {
    const config = {
        success: { color: T.color.semantic.success, icon: 'check-circle' as const },
        warning: { color: T.color.semantic.warning, icon: 'alert-triangle' as const },
        error: { color: T.color.semantic.error, icon: 'x-circle' as const },
        info: { color: T.color.ai.primary, icon: 'info' as const },
    }[type]

    return (
        <Animated.View
            entering={FadeInUp.springify().damping(12)}
            exiting={FadeOutUp}
            style={[styles.container, { borderLeftColor: config.color }]}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
                <Feather name={config.icon} size={18} color={config.color} />
            </View>
            <View style={styles.content}>
                <Text style={styles.message}>{message}</Text>
                {detail ? (
                    <Text style={styles.detail}>{detail}</Text>
                ) : null}
            </View>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.bg.tertiary,
        padding: T.spacing[3],
        borderRadius: T.radius.lg,
        borderLeftWidth: 2,
        borderWidth: 0.5,
        borderColor: T.color.border.base,
        marginHorizontal: T.spacing[4],
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: T.spacing[3],
    },
    content: {
        flex: 1,
    },
    message: {
        ...type.cardTitle,
        color: T.color.text.primary,
        fontSize: 14,
    },
    detail: {
        ...type.caption,
        color: T.color.text.secondary,
        fontSize: 11,
        marginTop: 1,
    }
})

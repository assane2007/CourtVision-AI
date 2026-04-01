/**
 * ToastContainer — Premium Notifications with Glassmorphism
 * Using heavy physics, BlurView, and haptic feedback.
 */

import React, { useEffect, useState } from 'react'
import { Text, TouchableOpacity, View, StyleSheet, Dimensions, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeInUp,
    FadeOutUp,
    SlideInUp,
    SlideOutUp,
    runOnJS
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { Feather, AntDesign } from '@expo/vector-icons'
import type { ToastMessage, ToastType } from '../lib/toast';
import { useToastStore } from '../lib/toast'
import { colors, space } from '../constants/tokens'

const { width } = Dimensions.get('window')

// Aesthetic mappings per toast type
const TOAST_STYLES: Record<ToastType, { color: string; icon: React.ReactNode; haptic: Haptics.NotificationFeedbackType }> = {
    success: {
        color: '#00ffcc',
        icon: <Feather name="check-circle" size={20} color="#00ffcc" />,
        haptic: Haptics.NotificationFeedbackType.Success
    },
    error: {
        color: '#ff4400',
        icon: <Feather name="alert-triangle" size={20} color="#ff4400" />,
        haptic: Haptics.NotificationFeedbackType.Error
    },
    warning: {
        color: '#ffbb00',
        icon: <Feather name="alert-circle" size={20} color="#ffbb00" />,
        haptic: Haptics.NotificationFeedbackType.Warning
    },
    info: {
        color: '#00aaff',
        icon: <Feather name="info" size={20} color="#00aaff" />,
        haptic: Haptics.NotificationFeedbackType.Success
    },
    xp: {
        color: '#A020F0',
        icon: <Feather name="zap" size={20} color="#A020F0" />,
        haptic: Haptics.NotificationFeedbackType.Success
    },
}

function ToastItem({ msg, onDismiss }: { msg: ToastMessage; onDismiss: () => void }) {
    const styleDef = TOAST_STYLES[msg.type];

    // Trigger haptics on mount
    useEffect(() => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(styleDef.haptic).catch(() => { })
        }
    }, [])

    return (
        <Animated.View
            entering={SlideInUp.springify().damping(14).stiffness(120)}
            exiting={SlideOutUp.springify().damping(16).stiffness(150)}
            style={[styles.toastWrapper, { shadowColor: styleDef.color }]}
        >
            <TouchableOpacity
                onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    onDismiss()
                }}
                activeOpacity={0.8}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ flex: 1 }}
            >
                <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
                    {/* Glowing highlight strip on the left */}
                    <View style={[styles.glowStrip, { backgroundColor: styleDef.color }]} />

                    <View style={styles.contentRow}>
                        <View style={styles.iconContainer}>
                            {msg.emoji ? (
                                <Text style={styles.emoji}>{msg.emoji}</Text>
                            ) : (
                                styleDef.icon
                            )}
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.title} numberOfLines={1}>{msg.title}</Text>
                            {!!msg.subtitle && (
                                <Text style={styles.subtitle} numberOfLines={1}>{msg.subtitle}</Text>
                            )}
                        </View>
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    )
}

export function ToastContainer() {
    const { top } = useSafeAreaInsets()
    const messages = useToastStore(s => s.messages)
    const dismiss = useToastStore(s => s.dismiss)

    if (messages.length === 0) return null

    return (
        <View style={[styles.container, { top: Math.max(top, 10) + 10 }]} pointerEvents="box-none">
            {messages.map(msg => (
                <ToastItem key={msg.id} msg={msg} onDismiss={() => dismiss(msg.id)} />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        gap: 12,
    },
    toastWrapper: {
        borderRadius: 24,
        overflow: 'hidden',
        // Intense glow shadow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'transparent',
    },
    blurContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    glowStrip: {
        position: 'absolute',
        top: '25%',
        bottom: '25%',
        left: 0,
        width: 3,
        borderTopRightRadius: 3,
        borderBottomRightRadius: 3,
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    emoji: {
        fontSize: 18
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 15,
        fontWeight: '800',
        color: colors.snow,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 13,
        marginTop: 2,
        color: colors.fog,
        fontWeight: '500',
    }
})

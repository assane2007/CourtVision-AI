/**
 * ToastContainer — Premium toast notifications with glassmorphism.
 * V3: Reanimated v3, fontFamily.
 */

import React, { useEffect } from 'react'
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated'
import { useToastStore, ToastMessage, ToastType } from '../lib/toast'
import { T } from '../lib/theme'

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: `${T.colors.green}12`, border: `${T.colors.green}40`, text: T.colors.green },
    error:   { bg: `${T.colors.red}12`,   border: `${T.colors.red}40`,   text: T.colors.red },
    warning: { bg: `${T.colors.orange}12`, border: `${T.colors.orange}40`, text: T.colors.orange },
    info:    { bg: `${T.colors.accent}12`, border: `${T.colors.accent}40`, text: T.colors.accent },
    xp:      { bg: `${T.colors.purple}15`, border: `${T.colors.purple}40`, text: T.colors.purple },
}

function ToastItem({ msg, onDismiss }: { msg: ToastMessage; onDismiss: () => void }) {
    const translateY = useSharedValue(-80)
    const opacity    = useSharedValue(0)
    const scale      = useSharedValue(0.9)

    useEffect(() => {
        translateY.value = withSpring(0, { damping: 12, stiffness: 120 })
        opacity.value    = withTiming(1, { duration: 250 })
        scale.value      = withSpring(1, { damping: 12, stiffness: 120 })
    }, [])

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }, { scale: scale.value }],
    }))

    const style = TOAST_STYLES[msg.type]

    return (
        <Animated.View style={[
            styles.toast,
            { backgroundColor: style.bg, borderColor: style.border },
            animStyle,
        ]}>
            <TouchableOpacity
                style={styles.toastInner}
                onPress={onDismiss}
                activeOpacity={0.85}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                accessibilityLabel={`${msg.title}${msg.subtitle ? '. ' + msg.subtitle : ''}`}
            >
                {msg.emoji && <Text style={styles.emoji}>{msg.emoji}</Text>}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: style.text }]} numberOfLines={1}>{msg.title}</Text>
                    {msg.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{msg.subtitle}</Text>}
                </View>
                <Text style={[styles.dismiss, { color: style.text }]}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

export function ToastContainer() {
    const { top } = useSafeAreaInsets()
    const messages = useToastStore(s => s.messages)
    const dismiss  = useToastStore(s => s.dismiss)

    if (messages.length === 0) return null

    return (
        <View style={[styles.container, { top: top + 8 }]} pointerEvents="box-none">
            {messages.map(msg => (
                <ToastItem key={msg.id} msg={msg} onDismiss={() => dismiss(msg.id)} />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute', left: 16, right: 16, zIndex: 9999, gap: 8,
    },
    toast: {
        borderRadius: T.radius.md,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    toastInner: {
        flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
    },
    emoji: { fontSize: 18 },
    title: { fontSize: 14, fontWeight: '700', fontFamily: T.fonts.body.bold },
    subtitle: { color: T.colors.muted, fontSize: 12, marginTop: 1, fontFamily: T.fonts.body.regular },
    dismiss: { fontSize: 12, opacity: 0.7, paddingLeft: 4 },
})

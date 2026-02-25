/**
 * ToastContainer — Premium toast notifications avec glassmorphism.
 */

import React, { useEffect, useRef } from 'react'
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
    const translateY = useRef(new Animated.Value(-80)).current
    const opacity    = useRef(new Animated.Value(0)).current
    const scale      = useRef(new Animated.Value(0.9)).current

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
        ]).start()
    }, [])

    const style = TOAST_STYLES[msg.type]

    return (
        <Animated.View style={[
            styles.toast,
            { backgroundColor: style.bg, borderColor: style.border },
            { opacity, transform: [{ translateY }, { scale }] },
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
    title: { fontSize: 14, fontWeight: '700' },
    subtitle: { color: T.colors.muted, fontSize: 12, marginTop: 1 },
    dismiss: { fontSize: 12, opacity: 0.7, paddingLeft: 4 },
})

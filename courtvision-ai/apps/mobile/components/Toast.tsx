/**
 * ToastContainer — Composant React Native pour afficher les toasts.
 * 
 * À placer UNE SEULE FOIS dans le RootLayout :
 *   <ToastContainer />
 * 
 * Fonctionnalités :
 * - Animation slide-in depuis le haut
 * - Couleur et icône selon le type
 * - Swipe-to-dismiss (tap to dismiss)
 * - Accessibilité complète
 */

import React, { useEffect, useRef } from 'react'
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToastStore, ToastMessage, ToastType } from '../lib/toast'

// ─── Style par type ────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: 'rgba(0,200,83,0.15)',  border: '#00C853', text: '#00C853' },
    error:   { bg: 'rgba(255,61,87,0.15)', border: '#FF3D57', text: '#FF3D57' },
    warning: { bg: 'rgba(255,152,0,0.15)', border: '#FF9800', text: '#FF9800' },
    info:    { bg: 'rgba(0,212,255,0.15)', border: '#00D4FF', text: '#00D4FF' },
    xp:      { bg: 'rgba(179,136,255,0.2)', border: '#B388FF', text: '#B388FF' },
}

// ─── Single Toast ──────────────────────────────────────────────

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
                {msg.emoji && (
                    <Text style={styles.emoji}>{msg.emoji}</Text>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: style.text }]} numberOfLines={1}>
                        {msg.title}
                    </Text>
                    {msg.subtitle && (
                        <Text style={styles.subtitle} numberOfLines={1}>{msg.subtitle}</Text>
                    )}
                </View>
                <Text style={[styles.dismiss, { color: style.text }]}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

// ─── Container ─────────────────────────────────────────────────

export function ToastContainer() {
    const { top } = useSafeAreaInsets()
    const messages = useToastStore(s => s.messages)
    const dismiss  = useToastStore(s => s.dismiss)

    if (messages.length === 0) return null

    return (
        <View style={[styles.container, { top: top + 8 }]} pointerEvents="box-none">
            {messages.map(msg => (
                <ToastItem
                    key={msg.id}
                    msg={msg}
                    onDismiss={() => dismiss(msg.id)}
                />
            ))}
        </View>
    )
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        gap: 8,
    },
    toast: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    toastInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 10,
    },
    emoji: {
        fontSize: 18,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    subtitle: {
        color: '#8B949E',
        fontSize: 12,
        marginTop: 1,
    },
    dismiss: {
        fontSize: 12,
        opacity: 0.7,
        paddingLeft: 4,
    },
})

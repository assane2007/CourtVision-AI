/**
 * PrimaryButton — Bouton principal avec états complets.
 *
 * États : default | loading | success | disabled
 * Animation : scale press (spring) + feedback visuel immédiat
 * Haptics : optionnels (commentés pour compatibilité expo-go)
 *
 * Usage :
 *   <PrimaryButton label="Start Session" onPress={handleStart} />
 *   <PrimaryButton label="Analyzing…" state="loading" />
 *   <PrimaryButton label="Done!" state="success" />
 */

import React, { useEffect, useState } from 'react'
import type { ViewStyle, TextStyle} from 'react-native';
import {
    Text, ActivityIndicator, StyleSheet,
    TouchableOpacity,
} from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, Easing,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T } from '../lib/theme'
import { HapticFeedback } from '../lib/haptics'

// ─── Types ────────────────────────────────────────────────────

export type ButtonState = 'default' | 'loading' | 'success' | 'disabled'
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface PrimaryButtonProps {
    label: string
    onPress?: () => void
    state?: ButtonState
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: keyof typeof Feather.glyphMap
    iconPosition?: 'left' | 'right'
    fullWidth?: boolean
    style?: ViewStyle
    labelStyle?: TextStyle
}

// ─── Size config ─────────────────────────────────────────────

const SIZE_CONFIG = {
    sm: { height: 40, paddingH: 14, fontSize: T.fontSize.sm, iconSize: 14, radius: T.radius.sm },
    md: { height: 52, paddingH: 20, fontSize: T.fontSize.base, iconSize: 16, radius: T.radius.lg },
    lg: { height: 60, paddingH: 28, fontSize: T.fontSize.lg, iconSize: 18, radius: T.radius.xl },
} as const

// ─── Variant backgrounds ──────────────────────────────────────

function bgColor(variant: ButtonVariant, state: ButtonState) {
    if (state === 'disabled') return T.color.border.soft
    if (state === 'success') return T.color.semantic.success
    switch (variant) {
        case 'primary': return T.color.brand.primary
        case 'secondary': return T.color.brand.muted
        case 'ghost': return 'transparent'
        case 'danger': return T.color.semantic.error
    }
}

function textColor(variant: ButtonVariant, state: ButtonState) {
    if (state === 'disabled') return T.color.text.secondary
    if (state === 'success') return T.color.text.primary
    switch (variant) {
        case 'primary': return T.color.text.inverse
        case 'secondary': return T.color.brand.primary
        case 'ghost': return T.color.text.secondary
        case 'danger': return T.color.text.inverse
    }
}

function borderStyle(variant: ButtonVariant, state: ButtonState) {
    if (variant === 'secondary') return {
        borderWidth: 1,
        borderColor: state === 'disabled' ? T.color.text.tertiary : `${T.color.brand.primary}40`,
    }
    if (variant === 'ghost') return {
        borderWidth: 1,
        borderColor: T.color.border.base,
    }
    return {}
}

// ─── PrimaryButton ────────────────────────────────────────────

export function PrimaryButton({
    label,
    onPress,
    state = 'default',
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = true,
    style,
    labelStyle,
}: PrimaryButtonProps) {
    const cfg = SIZE_CONFIG[size]
    const isDisabled = state === 'disabled' || state === 'loading'

    // Press animation
    const scale = useSharedValue(1)
    const bg = useSharedValue(0) // 0=normal, 1=pressed

    const handlePressIn = () => {
        HapticFeedback.light()
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 })
        bg.value = withTiming(1, { duration: 80 })
    }

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 })
        bg.value = withTiming(0, { duration: 150 })
    }

    // Success → auto-reset to default after 2s
    const [internalState, setInternalState] = useState<ButtonState>(state)
    useEffect(() => {
        setInternalState(state)
        if (state === 'success') {
            const t = setTimeout(() => setInternalState('default'), 2000)
            return () => clearTimeout(t)
        }
        return undefined
    }, [state])

    // Glow amplitude (only for primary)
    const glowOpacity = useSharedValue(variant === 'primary' ? 0.35 : 0)
    useEffect(() => {
        if (variant === 'primary' && internalState === 'default') {
            glowOpacity.value = withTiming(0.35, { duration: 300 })
        } else {
            glowOpacity.value = withTiming(0, { duration: 200 })
        }
    }, [internalState, variant])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: glowOpacity.value,
    }))

    const currentBg = bgColor(variant, internalState)
    const currentText = textColor(variant, internalState)
    const currentBorder = borderStyle(variant, internalState)

    const glowShadow = variant === 'primary' ? T.glow.hero(T.color.brand.primary) : {}

    return (
        <Animated.View style={[
            {
                width: fullWidth ? '100%' : undefined,
                alignSelf: fullWidth ? 'stretch' : 'flex-start',
            },
            animatedStyle,
        ]}>
            <TouchableOpacity
                style={[
                    styles.base,
                    {
                        height: cfg.height,
                        paddingHorizontal: cfg.paddingH,
                        borderRadius: cfg.radius,
                        backgroundColor: currentBg,
                        ...currentBorder,
                        ...glowShadow,
                    },
                    style,
                ]}
                onPress={isDisabled ? undefined : onPress}
                onPressIn={isDisabled ? undefined : handlePressIn}
                onPressOut={isDisabled ? undefined : handlePressOut}
                activeOpacity={1} // on gère nous-mêmes
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: isDisabled, busy: state === 'loading' }}
                accessibilityLabel={label}
            >
                {internalState === 'loading' ? (
                    <ActivityIndicator size="small" color={currentText} />
                ) : internalState === 'success' ? (
                    <>
                        <Feather name="check" size={cfg.iconSize + 2} color={currentText} />
                        <Text style={[styles.label, { fontSize: cfg.fontSize, color: currentText }, labelStyle]}>
                            {label}
                        </Text>
                    </>
                ) : (
                    <>
                        {icon && iconPosition === 'left' && (
                            <Feather name={icon} size={cfg.iconSize} color={currentText} />
                        )}
                        <Text
                            style={[styles.label, { fontSize: cfg.fontSize, color: currentText }, labelStyle]}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                        {icon && iconPosition === 'right' && (
                            <Feather name={icon} size={cfg.iconSize} color={currentText} />
                        )}
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    )
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        overflow: 'hidden',
    },
    label: {
        fontWeight: '700',
        letterSpacing: 0.2,
    },
})

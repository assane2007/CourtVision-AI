/**
 * FABUpload — Floating Action Button for the Film tab.
 *
 * Premium circular button with:
 * - Continuous pulse glow when idle
 * - Spring scale on press + haptic feedback
 * - Amber brand color with radial glow
 * - Can be placed as an overlay or used from TabBar
 *
 * V3 — Reanimated, haptics, premium styling.
 */

import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Platform } from 'react-native'
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring,
    withRepeat, withSequence, withTiming,
    Easing, cancelAnimation,
} from 'react-native-reanimated'
import { AntDesign } from '@expo/vector-icons'
import { T } from '../lib/theme'

// Haptic feedback (graceful fallback if not installed)
let Haptics: any = null
try { Haptics = require('expo-haptics') } catch { }

interface FABUploadProps {
    onPress: () => void
    size?: number
    pulsing?: boolean
}

export default function FABUpload({
    onPress,
    size = 64,
    pulsing = true,
}: FABUploadProps) {
    const scale = useSharedValue(1)
    const glowScale = useSharedValue(1)
    const glowOpacity = useSharedValue(0.3)

    // Continuous pulse glow when idle
    useEffect(() => {
        if (pulsing) {
            glowScale.value = withRepeat(
                withSequence(
                    withTiming(1.35, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                ),
                -1,
                false,
            )
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                    withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                ),
                -1,
                false,
            )
        }
        return () => {
            cancelAnimation(glowScale)
            cancelAnimation(glowOpacity)
        }
    }, [pulsing])

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glowScale.value }],
        opacity: glowOpacity.value,
    }))

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 300 })
    }

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 180 })
    }

    const handlePress = () => {
        if (Platform.OS !== 'web' && Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        }
        // Success bounce
        scale.value = withSequence(
            withSpring(1.1, { damping: 12, stiffness: 200 }),
            withSpring(1, { damping: 10 }),
        )
        onPress()
    }

    const half = size / 2

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole="button"
            accessibilityLabel="Upload video"
        >
            {/* Glow ring behind */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        width: size + 24,
                        height: size + 24,
                        borderRadius: (size + 24) / 2,
                        backgroundColor: T.color.signature.primary,
                        top: -12,
                        left: -12,
                    },
                    glowStyle,
                ]}
            />

            {/* Main button */}
            <Animated.View
                style={[
                    {
                        width: size,
                        height: size,
                        borderRadius: half,
                        backgroundColor: T.color.brand.primary,
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...T.glow.hero(T.color.brand.primary),
                    },
                    buttonStyle,
                ]}
            >
                <AntDesign name="plus" size={size * 0.38} color="#FFFFFF" />
            </Animated.View>
        </Pressable>
    )
}

const styles = StyleSheet.create({})

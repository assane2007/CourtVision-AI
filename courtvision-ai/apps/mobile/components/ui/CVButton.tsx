/**
 * CVButton — CourtVision branded button component.
 *
 * Built on gluestack-ui Button with CourtVision brand identity.
 * Features: amber glow, spring press animation, loading/success/disabled states.
 * Variants: primary (amber), secondary (outline), ghost, danger, success.
 *
 * Usage:
 *   <CVButton label="Start Session" onPress={handleStart} />
 *   <CVButton label="Details" variant="secondary" size="sm" icon="arrow-right" />
 *   <CVButton label="Analyzing…" loading />
 */

import React, { useEffect, useRef, useState } from 'react'
import type { ViewStyle, TextStyle } from 'react-native'
import { Pressable, Text, View, Platform } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVButtonVariant = 'primary' | 'secondary' | 'ghost'
export type CVButtonState = 'default' | 'loading' | 'success'

export interface CVButtonProps {
  label: string
  onPress?: () => void
  variant?: CVButtonVariant
  state?: CVButtonState
  icon?: keyof typeof Feather.glyphMap
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  labelStyle?: TextStyle
}

// ─── Variant Styles ───────────────────────────────────────────

function getVariantStyle(variant: CVButtonVariant, disabled: boolean) {
  if (disabled || variant === 'primary') {
    return {
      bg: variant === 'primary' ? T.color.brand.primary : 'transparent',
      text: variant === 'primary' ? T.color.text.primary : variant === 'secondary' ? T.color.text.secondary : T.color.text.tertiary,
      border: variant === 'secondary' ? T.color.border.white20 : undefined as string | undefined,
      decoration: 'none' as const,
    }
  }

  switch (variant) {
    case 'primary':
      return {
        bg: T.color.brand.primary,
        text: T.color.text.primary,
        border: undefined,
        decoration: 'none' as const,
      }
    case 'secondary':
      return {
        bg: 'transparent',
        text: T.color.text.secondary,
        border: T.color.border.white20,
        decoration: 'none' as const,
      }
    case 'ghost':
      return {
        bg: 'transparent',
        text: T.color.text.tertiary,
        border: undefined,
        decoration: 'none' as const,
      }
  }
}

// ─── Component ───────────────────────────────────────────────

export function CVButton({
  label,
  onPress,
  variant = 'primary',
  state = 'default',
  icon,
  iconPosition = 'left',
  disabled = false,
  fullWidth = true,
  style,
  labelStyle,
}: CVButtonProps) {
  const [pressedState, setPressedState] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoading = state === 'loading'
  const isSuccess = state === 'success'
  const isDisabled = disabled || isLoading
  const height = variant === 'primary' ? 56 : variant === 'secondary' ? 48 : 44
  const fontSize = 15
  const iconSize = 16
  const vs = getVariantStyle(variant, isDisabled)
  const dot = useSharedValue(0.2)

  useEffect(() => {
    if (isSuccess) {
      setShowDone(true)
      timerRef.current = setTimeout(() => {
        setShowDone(false)
      }, T.motion.successPulseMs)
    } else {
      setShowDone(false)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isSuccess])

  useEffect(() => {
    if (!isLoading) return
    dot.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.exp) }),
        withTiming(0.25, { duration: 220, easing: Easing.in(Easing.exp) }),
      ),
      -1,
      false,
    )
  }, [isLoading, dot])

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onPress?.()
  }

  const dotStyle1 = useAnimatedStyle(() => ({ opacity: dot.value }))
  const dotStyle2 = useAnimatedStyle(() => ({ opacity: Math.max(0.2, dot.value - 0.25) }))
  const dotStyle3 = useAnimatedStyle(() => ({ opacity: Math.max(0.2, dot.value - 0.5) }))

  return (
    <Pressable
      onPress={isDisabled ? undefined : handlePress}
      onPressIn={() => setPressedState(true)}
      onPressOut={() => setPressedState(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: 16,
          borderRadius: 6,
          backgroundColor: vs.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          overflow: 'hidden' as const,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed ? 0.97 : 1 }],
          ...(vs.border ? { borderWidth: 0.5, borderColor: vs.border } : {}),
          opacity: isDisabled ? 0.25 : 1,
        } as ViewStyle,
        showDone ? { borderWidth: 1, borderColor: T.color.semantic.success } : null,
        style,
      ]}
    >
      {isLoading ? (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Animated.View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: vs.text }, dotStyle1]} />
          <Animated.View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: vs.text }, dotStyle2]} />
          <Animated.View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: vs.text }, dotStyle3]} />
        </View>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Feather name={icon} size={iconSize} color={vs.text} />
          )}
          <Text
            style={[
              {
                color: vs.text,
                fontSize,
                fontFamily: T.fonts.body.medium,
                letterSpacing: 0.2,
              },
              variant === 'ghost' && pressedState ? { textDecorationLine: 'underline' } : null,
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {showDone ? 'Done' : label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Feather name={icon} size={iconSize} color={vs.text} />
          )}
        </>
      )}
    </Pressable>
  )
}

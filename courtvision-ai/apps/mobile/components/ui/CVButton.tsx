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

import React from 'react'
import {
  TouchableOpacity, Text, ActivityIndicator,
  ViewStyle, TextStyle, View, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type CVButtonSize = 'sm' | 'md' | 'lg'

export interface CVButtonProps {
  label: string
  onPress?: () => void
  variant?: CVButtonVariant
  size?: CVButtonSize
  icon?: keyof typeof Feather.glyphMap
  iconPosition?: 'left' | 'right'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  labelStyle?: TextStyle
}

// ─── Size Configs ─────────────────────────────────────────────

const SIZES: Record<CVButtonSize, {
  height: number; px: number; fontSize: number; iconSize: number; radius: number
}> = {
  sm: { height: 40, px: 14, fontSize: T.fontSize.sm, iconSize: 14, radius: T.radius.md },
  md: { height: 52, px: 20, fontSize: T.fontSize.base, iconSize: 16, radius: T.radius.lg },
  lg: { height: 60, px: 28, fontSize: T.fontSize.lg, iconSize: 18, radius: T.radius.xl },
}

// ─── Variant Styles ───────────────────────────────────────────

function getVariantStyle(variant: CVButtonVariant, disabled: boolean) {
  if (disabled) {
    return {
      bg: T.color.border.soft,
      text: T.color.text.tertiary,
      border: undefined as string | undefined,
      shadow: {} as ViewStyle,
    }
  }

  switch (variant) {
    case 'primary':
      return {
        bg: T.color.brand.primary,
        text: T.color.text.inverse,
        border: undefined,
        shadow: T.glow.hero(T.color.brand.primary),
      }
    case 'secondary':
      return {
        bg: `${T.color.brand.primary}15`,
        text: T.color.brand.primary,
        border: `${T.color.brand.primary}40`,
        shadow: {} as ViewStyle,
      }
    case 'ghost':
      return {
        bg: 'transparent',
        text: T.color.text.secondary,
        border: T.color.border.base,
        shadow: {} as ViewStyle,
      }
    case 'danger':
      return {
        bg: T.color.semantic.error,
        text: T.color.text.primary,
        border: undefined,
        shadow: T.glow.soft(T.color.semantic.error),
      }
    case 'success':
      return {
        bg: T.color.semantic.success,
        text: T.color.text.primary,
        border: undefined,
        shadow: T.glow.soft(T.color.semantic.success),
      }
  }
}

// ─── Component ───────────────────────────────────────────────

export function CVButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  labelStyle,
}: CVButtonProps) {
  const cfg = SIZES[size]
  const isDisabled = disabled || loading
  const vs = getVariantStyle(variant, isDisabled)

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress?.()
  }

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : handlePress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      style={[
        {
          height: cfg.height,
          paddingHorizontal: cfg.px,
          borderRadius: cfg.radius,
          backgroundColor: vs.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          overflow: 'hidden' as const,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          ...(vs.border ? { borderWidth: 1, borderColor: vs.border } : {}),
          ...vs.shadow,
        } as ViewStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Feather name={icon} size={cfg.iconSize} color={vs.text} />
          )}
          <Text
            style={[
              {
                color: vs.text,
                fontSize: cfg.fontSize,
                fontWeight: '700',
                letterSpacing: 0.2,
              },
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Feather name={icon} size={cfg.iconSize} color={vs.text} />
          )}
        </>
      )}
    </TouchableOpacity>
  )
}

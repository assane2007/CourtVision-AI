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
  ViewStyle, TextStyle, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
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
  sm: { height: 40, px: 14, fontSize: T.fontSize.sm, iconSize: 14, radius: T.borderRadius.md },
  md: { height: 52, px: 20, fontSize: T.fontSize.base, iconSize: 16, radius: T.borderRadius.lg },
  lg: { height: 60, px: 28, fontSize: T.fontSize.lg, iconSize: 18, radius: T.borderRadius.xl },
}

// ─── Variant Styles ───────────────────────────────────────────

function getVariantStyle(variant: CVButtonVariant, disabled: boolean) {
  if (disabled) {
    return {
      bg: T.color.border.subtle,
      text: T.color.text.tertiary,
      border: undefined as string | undefined,
      shadow: {} as ViewStyle,
    }
  }

  switch (variant) {
    case 'primary':
      return {
        bg: T.color.signature.primary,
        text: T.color.text.primary,
        border: undefined,
        shadow: T.glow(T.color.signature.primary, 0.30),
      }
    case 'secondary':
      return {
        bg: T.color.signature.dim,
        text: T.color.signature.primary,
        border: `${T.color.signature.primary}40`,
        shadow: {} as ViewStyle,
      }
    case 'ghost':
      return {
        bg: 'transparent',
        text: T.color.text.secondary,
        border: T.color.border.default,
        shadow: {} as ViewStyle,
      }
    case 'danger':
      return {
        bg: T.color.semantic.error,
        text: T.color.text.primary,
        border: undefined,
        shadow: T.glow(T.color.semantic.error, 0.25),
      }
    case 'success':
      return {
        bg: T.color.semantic.success,
        text: T.color.text.primary,
        border: undefined,
        shadow: T.glow(T.color.semantic.success, 0.25),
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

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
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

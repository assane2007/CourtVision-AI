/**
 * CVInput — CourtVision branded text input.
 *
 * Dark glass-morphism input with amber focus ring.
 * Built on gluestack-ui Input + CourtVision tokens.
 *
 * Usage:
 *   <CVInput placeholder="Search sessions…" icon="search" />
 *   <CVInput placeholder="Email" variant="filled" error="Invalid email" />
 */

import React, { useState } from 'react'
import type { ViewStyle, TextInputProps } from 'react-native';
import { View, TextInput, Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVInputVariant = 'outline' | 'filled' | 'ghost'
export type CVInputSize = 'sm' | 'md' | 'lg'

export interface CVInputProps extends Omit<TextInputProps, 'style'> {
  variant?: CVInputVariant
  size?: CVInputSize
  icon?: keyof typeof Feather.glyphMap
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  style?: ViewStyle
  inputStyle?: ViewStyle
}

// ─── Size Config ──────────────────────────────────────────────

const SIZE_CONFIG: Record<CVInputSize, {
  height: number; fontSize: number; iconSize: number; radius: number; px: number
}> = {
  sm: { height: 40, fontSize: T.fontSize.sm, iconSize: 14, radius: T.borderRadius.md, px: 12 },
  md: { height: 48, fontSize: T.fontSize.base, iconSize: 16, radius: T.borderRadius.lg, px: 14 },
  lg: { height: 56, fontSize: T.fontSize.md, iconSize: 18, radius: T.borderRadius.xl, px: 16 },
}

// ─── Component ───────────────────────────────────────────────

export function CVInput({
  variant = 'outline',
  size = 'md',
  icon,
  label,
  error,
  hint,
  fullWidth = true,
  style,
  inputStyle,
  ...textInputProps
}: CVInputProps) {
  const [focused, setFocused] = useState(false)
  const cfg = SIZE_CONFIG[size]

  const hasError = !!error
  const borderColor = hasError
    ? T.color.semantic.error
    : focused
      ? T.color.signature.primary
      : variant === 'ghost'
        ? 'transparent'
        : T.color.border.base

  const bgColor = variant === 'filled'
    ? T.color.background.secondary
    : variant === 'ghost'
      ? 'transparent'
      : T.color.background.tertiary

  return (
    <View style={[{ width: fullWidth ? '100%' : undefined }, style]}>
      {/* Label */}
      {label && (
        <Text style={{
          color: hasError ? T.color.semantic.error : T.color.text.secondary,
          fontSize: T.fontSize.sm,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginBottom: 6,
        }}>
          {label}
        </Text>
      )}

      {/* Input Row */}
      <View style={{
        height: cfg.height,
        borderRadius: cfg.radius,
        backgroundColor: bgColor,
        borderWidth: variant === 'ghost' ? 0 : 1,
        borderColor,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: cfg.px,
        gap: 10,
        ...(focused && !hasError ? T.glow(T.color.signature.primary, 0.12) : {}),
      }}>
        {icon && (
          <Feather
            name={icon}
            size={cfg.iconSize}
            color={focused ? T.color.signature.primary : T.color.text.tertiary}
          />
        )}
        <TextInput
          style={[{
            flex: 1,
            color: T.color.text.primary,
            fontSize: cfg.fontSize,
            fontWeight: '400',
            height: '100%',
          }, inputStyle] as any}
          placeholderTextColor={T.color.text.tertiary}
          selectionColor={T.color.signature.primary}
          onFocus={(e) => {
            setFocused(true)
            textInputProps.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            textInputProps.onBlur?.(e)
          }}
          {...textInputProps}
        />
      </View>

      {/* Error / Hint */}
      {(error || hint) && (
        <Text style={{
          color: hasError ? T.color.semantic.error : T.color.text.tertiary,
          fontSize: T.fontSize.xs,
          marginTop: 4,
          marginLeft: 2,
        }}>
          {error || hint}
        </Text>
      )}
    </View>
  )
}

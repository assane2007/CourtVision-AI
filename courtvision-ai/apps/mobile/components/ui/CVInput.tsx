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
import type { TextStyle, ViewStyle, TextInputProps } from 'react-native';
import { View, TextInput, Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVInputVariant = 'default'
export type CVInputSize = 'md'

export interface CVInputProps extends Omit<TextInputProps, 'style'> {
  variant?: CVInputVariant
  size?: CVInputSize
  icon?: keyof typeof Feather.glyphMap
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  style?: ViewStyle
  inputStyle?: TextStyle
}

// ─── Size Config ──────────────────────────────────────────────

const SIZE_CONFIG = {
  height: 52, fontSize: 15, iconSize: 16, px: 14,
}

// ─── Component ───────────────────────────────────────────────

export function CVInput({
  variant = 'default',
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
  const cfg = SIZE_CONFIG

  const hasError = !!error
  const borderColor = hasError
    ? 'rgba(255,77,0,0.5)'
    : focused
      ? 'rgba(0,212,255,0.5)'
      : T.color.border.white08

  const bgColor = '#0E0E0E'

  return (
    <View style={[{ width: fullWidth ? '100%' : undefined }, style]}>
      {/* Label */}
      {label && (
        <Text style={{
          color: hasError ? 'rgba(255,77,0,0.5)' : T.color.text.quaternary,
          fontSize: 11,
          fontFamily: T.fonts.body.medium,
          letterSpacing: 0.88,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          {label}
        </Text>
      )}

      {/* Input Row */}
      <View style={{
        height: cfg.height,
        borderRadius: T.radius.sharp,
        backgroundColor: bgColor,
        borderWidth: 0.5,
        borderColor,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: cfg.px,
        gap: 10,
      }}>
        {icon && (
          <Feather
            name={icon}
            size={cfg.iconSize}
            color={focused ? T.color.ai.primary : T.color.text.dim}
          />
        )}
        <TextInput
          style={[{
            flex: 1,
            color: T.color.text.value,
            fontSize: cfg.fontSize,
            fontFamily: T.fonts.body.regular,
            height: '100%',
          }, inputStyle] as any}
          placeholderTextColor={T.color.text.dim}
          selectionColor={T.color.brand.primary}
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

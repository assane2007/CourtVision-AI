/**
 * CVText — CourtVision branded text component.
 *
 * Built on gluestack-ui Text with CourtVision typography presets.
 * Supports preset styles: heroStat, bigStat, screenTitle, sectionTitle,
 * cardTitle, body, bodySemibold, caption, overline.
 *
 * Usage:
 *   <CVText preset="screenTitle">Dashboard</CVText>
 *   <CVText preset="body" color="secondary">Some description</CVText>
 *   <CVText preset="heroStat" color="amber">73%</CVText>
 */

import React from 'react'
import { Text } from '@gluestack-ui/themed'
import { TextStyle } from 'react-native'
import { T, typePresets } from '../../lib/theme'

// ─── Presets ──────────────────────────────────────────────────

export type TextPreset = keyof typeof typePresets
export type TextColorAlias =
  | 'primary' | 'secondary' | 'tertiary' | 'inverse'
  | 'amber' | 'success' | 'error' | 'warning' | 'info'
  | 'purple' | 'gold' | 'white'

const COLOR_MAP: Record<TextColorAlias, string> = {
  primary:   T.color.text.primary,
  secondary: T.color.text.secondary,
  tertiary:  T.color.text.tertiary,
  inverse:   T.color.text.inverse,
  amber:     T.color.signature.primary,
  success:   T.color.semantic.success,
  error:     T.color.semantic.error,
  warning:   T.color.semantic.warning,
  info:      T.color.semantic.info,
  purple:    T.color.gamification.purple,
  gold:      T.color.gamification.gold,
  white:     '#FFFFFF',
}

// ─── Props ───────────────────────────────────────────────────

export interface CVTextProps {
  children: React.ReactNode
  /** Typography preset — defaults to 'body' */
  preset?: TextPreset
  /** Semantic color alias — defaults to 'primary' */
  color?: TextColorAlias | string
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Number of lines before truncation */
  numberOfLines?: number
  /** Extra styles */
  style?: TextStyle
  /** Make selectable */
  selectable?: boolean
}

// ─── Component ───────────────────────────────────────────────

export function CVText({
  children,
  preset = 'body',
  color = 'primary',
  align,
  numberOfLines,
  style,
  selectable,
}: CVTextProps) {
  const presetStyle = typePresets[preset]
  const resolvedColor = COLOR_MAP[color as TextColorAlias] ?? color

  return (
    <Text
      style={[
        presetStyle as TextStyle,
        {
          color: resolvedColor,
          textAlign: align,
        },
        style,
      ]}
      numberOfLines={numberOfLines}
      selectable={selectable}
    >
      {children}
    </Text>
  )
}

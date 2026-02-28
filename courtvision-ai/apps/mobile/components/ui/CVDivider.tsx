/**
 * CVDivider — CourtVision branded divider/separator.
 *
 * Subtle glass-tinted separator line matching the dark theme.
 *
 * Usage:
 *   <CVDivider />
 *   <CVDivider variant="accent" spacing={24} />
 */

import React from 'react'
import { View, ViewStyle } from 'react-native'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVDividerVariant = 'subtle' | 'default' | 'strong' | 'accent'

export interface CVDividerProps {
  variant?: CVDividerVariant
  /** Vertical margin above and below */
  spacing?: number
  style?: ViewStyle
}

// ─── Colors ──────────────────────────────────────────────────

const COLORS: Record<CVDividerVariant, string> = {
  subtle:  T.color.border.subtle,
  default: T.color.border.default,
  strong:  T.color.border.strong,
  accent:  T.color.border.accent,
}

// ─── Component ───────────────────────────────────────────────

export function CVDivider({
  variant = 'subtle',
  spacing = T.spacing[4],
  style,
}: CVDividerProps) {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: COLORS[variant],
          marginVertical: spacing,
          width: '100%',
        },
        style,
      ]}
      accessibilityRole="none"
    />
  )
}

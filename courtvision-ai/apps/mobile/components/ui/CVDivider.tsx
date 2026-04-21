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
import type { ViewStyle } from 'react-native';
import { View } from 'react-native'
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
  subtle:  T.color.border.hairline,
  default: T.color.border.base,
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
          height: 0.5,
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

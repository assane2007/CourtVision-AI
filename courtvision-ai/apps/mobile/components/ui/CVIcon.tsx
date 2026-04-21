/**
 * CVIcon — CourtVision branded icon wrapper.
 *
 * Renders a Feather icon with optional circular background
 * and CourtVision color presets.
 *
 * Usage:
 *   <CVIcon name="zap" color="amber" />
 *   <CVIcon name="check" color="success" bg size={28} />
 *   <CVIcon name="alert-circle" color="danger" bg />
 */

import React from 'react'
import type { ViewStyle } from 'react-native';
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVIconColor =
  | 'primary' | 'secondary' | 'tertiary'
  | 'amber' | 'cyan' | 'success' | 'error' | 'warning' | 'info'
  | 'purple' | 'gold' | 'white'

export interface CVIconProps {
  name: keyof typeof Feather.glyphMap
  color?: CVIconColor | string
  /** Icon size in px — default 20 */
  size?: number
  /** Show circular background tint */
  bg?: boolean
  /** Extra styles on wrapper */
  style?: ViewStyle
}

// ─── Color Map ────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  primary:   T.color.text.primary,
  secondary: T.color.text.secondary,
  tertiary:  T.color.text.tertiary,
  amber:     T.color.brand.primary,
  cyan:      T.color.ai.primary,
  success:   T.color.semantic.success,
  error:     T.color.semantic.error,
  warning:   T.color.semantic.warning,
  info:      T.color.ai.primary,
  purple:    T.color.gamification.purple,
  gold:      T.color.gamification.gold,
  white:     '#FFFFFF',
}

const BG_MAP: Record<string, string> = {
  amber:   T.color.brand.muted,
  cyan:    T.color.ai.muted,
  success: 'rgba(34,197,94,0.10)',
  error:   'rgba(255,90,101,0.10)',
  warning: 'rgba(255,193,69,0.10)',
  info:    T.color.ai.muted,
  purple:  'rgba(167,139,250,0.10)',
  gold:    'rgba(255,209,102,0.10)',
}

// ─── Component ───────────────────────────────────────────────

export function CVIcon({
  name,
  color = 'primary',
  size = 20,
  bg = false,
  style,
}: CVIconProps) {
  const resolvedColor = COLOR_MAP[color] ?? color
  const bgColor = BG_MAP[color] ?? 'rgba(255,255,255,0.06)'

  const icon = <Feather name={name} size={size} color={resolvedColor} />

  if (!bg) {
    return <View style={style}>{icon}</View>
  }

  const containerSize = size * 2
  return (
    <View
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      {icon}
    </View>
  )
}

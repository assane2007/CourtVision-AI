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
import { View, ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVIconColor =
  | 'primary' | 'secondary' | 'tertiary'
  | 'amber' | 'success' | 'error' | 'warning' | 'info'
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
  amber:     T.color.signature.primary,
  success:   T.color.semantic.success,
  error:     T.color.semantic.error,
  warning:   T.color.semantic.warning,
  info:      T.color.semantic.info,
  purple:    T.color.gamification.purple,
  gold:      T.color.gamification.gold,
  white:     '#FFFFFF',
}

const BG_MAP: Record<string, string> = {
  amber:   'rgba(255,107,0,0.10)',
  success: 'rgba(0,198,122,0.10)',
  error:   'rgba(255,58,94,0.10)',
  warning: 'rgba(255,186,0,0.10)',
  info:    'rgba(10,132,255,0.10)',
  purple:  'rgba(167,139,250,0.10)',
  gold:    'rgba(255,215,0,0.10)',
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

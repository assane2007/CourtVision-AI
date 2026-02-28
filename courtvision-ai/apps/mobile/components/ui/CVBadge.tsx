/**
 * CVBadge — CourtVision branded badge / chip / tag.
 *
 * Compact informational element with glass tint.
 * Variants: amber (brand), success, danger, warning, info, purple, gold, neutral.
 *
 * Usage:
 *   <CVBadge label="Elite" variant="success" />
 *   <CVBadge label="+15 XP" variant="purple" icon="zap" />
 *   <CVBadge label="NEW" variant="amber" size="sm" />
 */

import React from 'react'
import { View, Text, ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVBadgeVariant = 'amber' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'gold' | 'neutral'
export type CVBadgeSize = 'sm' | 'md' | 'lg'

export interface CVBadgeProps {
  label: string
  variant?: CVBadgeVariant
  size?: CVBadgeSize
  icon?: keyof typeof Feather.glyphMap
  style?: ViewStyle
  /** Pulsing glow effect */
  glow?: boolean
}

// ─── Variant Colors ───────────────────────────────────────────

const VARIANT_COLORS: Record<CVBadgeVariant, { bg: string; text: string; border: string }> = {
  amber:   { bg: 'rgba(255,107,0,0.10)',  text: T.color.signature.primary,   border: 'rgba(255,107,0,0.22)' },
  success: { bg: 'rgba(0,198,122,0.10)',   text: T.color.semantic.success,    border: 'rgba(0,198,122,0.22)' },
  danger:  { bg: 'rgba(255,58,94,0.10)',   text: T.color.semantic.error,      border: 'rgba(255,58,94,0.22)' },
  warning: { bg: 'rgba(255,186,0,0.10)',   text: T.color.semantic.warning,    border: 'rgba(255,186,0,0.22)' },
  info:    { bg: 'rgba(10,132,255,0.10)',  text: T.color.semantic.info,       border: 'rgba(10,132,255,0.22)' },
  purple:  { bg: 'rgba(167,139,250,0.10)', text: T.color.gamification.purple, border: 'rgba(167,139,250,0.22)' },
  gold:    { bg: 'rgba(255,215,0,0.10)',   text: T.color.gamification.gold,   border: 'rgba(255,215,0,0.22)' },
  neutral: { bg: 'rgba(255,255,255,0.05)', text: T.color.text.secondary,      border: 'rgba(255,255,255,0.10)' },
}

// ─── Size Config ──────────────────────────────────────────────

const SIZE_CONFIG: Record<CVBadgeSize, {
  height: number; px: number; fontSize: number; iconSize: number; radius: number; gap: number
}> = {
  sm: { height: 22, px: 8,  fontSize: 10, iconSize: 10, radius: T.borderRadius.sm, gap: 3 },
  md: { height: 28, px: 10, fontSize: 11, iconSize: 12, radius: T.borderRadius.md, gap: 4 },
  lg: { height: 34, px: 12, fontSize: 13, iconSize: 14, radius: T.borderRadius.md, gap: 5 },
}

// ─── Component ───────────────────────────────────────────────

export function CVBadge({
  label,
  variant = 'amber',
  size = 'md',
  icon,
  style,
  glow = false,
}: CVBadgeProps) {
  const colors = VARIANT_COLORS[variant]
  const cfg = SIZE_CONFIG[size]

  return (
    <View
      style={[
        {
          height: cfg.height,
          paddingHorizontal: cfg.px,
          borderRadius: cfg.radius,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: cfg.gap,
          ...(glow ? T.glow(colors.text, 0.2) : {}),
        },
        style,
      ]}
      accessibilityRole="text"
    >
      {icon && <Feather name={icon} size={cfg.iconSize} color={colors.text} />}
      <Text
        style={{
          color: colors.text,
          fontSize: cfg.fontSize,
          fontWeight: '700',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

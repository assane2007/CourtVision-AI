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
import type { ViewStyle } from 'react-native';
import { View, Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVBadgeVariant = 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'gold' | 'secondary'
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
  brand: { bg: `${T.color.brand.primary}15`, text: T.color.brand.primary, border: `${T.color.brand.primary}30` },
  success: { bg: `${T.color.semantic.success}15`, text: T.color.semantic.success, border: `${T.color.semantic.success}30` },
  danger: { bg: `${T.color.semantic.error}15`, text: T.color.semantic.error, border: `${T.color.semantic.error}30` },
  warning: { bg: `${T.color.semantic.warning}15`, text: T.color.semantic.warning, border: `${T.color.semantic.warning}30` },
  info: { bg: `${T.color.semantic.info}15`, text: T.color.semantic.info, border: `${T.color.semantic.info}30` },
  purple: { bg: `${T.color.semantic.purple}15`, text: T.color.semantic.purple, border: `${T.color.semantic.purple}30` },
  gold: { bg: `${T.color.semantic.gold}15`, text: T.color.semantic.gold, border: `${T.color.semantic.gold}30` },
  secondary: { bg: T.color.bg.secondary, text: T.color.text.secondary, border: T.color.border.base },
}

// ─── Size Config ──────────────────────────────────────────────

const SIZE_CONFIG: Record<CVBadgeSize, {
  height: number; px: number; fontSize: number; iconSize: number; radius: number; gap: number
}> = {
  sm: { height: 22, px: 8, fontSize: 10, iconSize: 10, radius: T.radius.sm, gap: 3 },
  md: { height: 28, px: 10, fontSize: 11, iconSize: 12, radius: T.radius.md, gap: 4 },
  lg: { height: 34, px: 12, fontSize: 13, iconSize: 14, radius: T.radius.md, gap: 5 },
}

// ─── Component ───────────────────────────────────────────────

export function CVBadge({
  label,
  variant = 'brand',
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
          ...(glow ? T.glow.soft(colors.text) : {}),
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

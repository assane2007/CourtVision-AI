/**
 * GlassCard — Premium glassmorphism card component.
 *
 * Built on pure React Native View with CourtVision glass morphism presets.
 * Supports multiple glass tints: default, accent (amber), success, danger, gold, thin.
 *
 * Usage:
 *   <GlassCard variant="accent" padding={16} borderRadius={16}>
 *     <CVText>Content</CVText>
 *   </GlassCard>
 */

import React from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import { T } from '../../lib/theme'

// ─── Glass Presets ────────────────────────────────────────────

export type GlassVariant = 'light' | 'medium' | 'accent' | 'success' | 'danger' | 'gold' | 'thin' | 'primary'

const GLASS_STYLES: Record<GlassVariant, { bg: string; border: string }> = {
  light: { bg: T.glass.base.backgroundColor, border: T.glass.base.borderColor },
  medium: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)' },
  accent: { bg: T.color.brand.glow, border: `${T.color.brand.primary}30` },
  success: { bg: 'rgba(0,198,122,0.07)', border: 'rgba(0,198,122,0.16)' },
  danger: { bg: 'rgba(255,58,94,0.08)', border: 'rgba(255,58,94,0.16)' },
  gold: { bg: 'rgba(255,214,10,0.08)', border: 'rgba(255,214,10,0.16)' },
  thin: { bg: T.glass.thin.backgroundColor, border: T.glass.thin.borderColor },
  primary: { bg: 'rgba(10,132,255,0.07)', border: 'rgba(10,132,255,0.16)' },
}

// ─── Props ───────────────────────────────────────────────────

export interface GlassCardProps {
  children: React.ReactNode
  variant?: GlassVariant
  /** Override border radius — uses T.borderRadius.lg (12) by default */
  borderRadius?: number
  /** Extra padding */
  padding?: number
  /** Extra styles */
  style?: ViewStyle
  /** Press handler */
  onPress?: () => void
  /** Shadow level */
  shadow?: 'none' | 'sm' | 'md' | 'lg'
}

// ─── Component ───────────────────────────────────────────────

export function GlassCard({
  children,
  variant = 'light',
  borderRadius = T.radius.lg,
  padding = T.spacing[4],
  style,
  shadow = 'none',
}: GlassCardProps) {
  const glass = GLASS_STYLES[variant]

  const shadowStyle = shadow === 'none' ? {}
    : shadow === 'sm' ? T.glow.soft()
      : shadow === 'md' ? T.glow.soft()
        : T.glow.hero()

  return (
    <View
      style={[
        {
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius,
          padding,
          overflow: 'hidden' as const,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

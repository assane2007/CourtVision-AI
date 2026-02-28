/**
 * GlassCard — Premium glassmorphism card component.
 *
 * Built on gluestack-ui Box with CourtVision glass morphism presets.
 * Supports multiple glass tints: default, accent (amber), success, danger, gold, thin.
 *
 * Usage:
 *   <GlassCard variant="accent" p="$4" rounded="$xl">
 *     <CVText>Content</CVText>
 *   </GlassCard>
 */

import React from 'react'
import { ViewStyle, StyleSheet } from 'react-native'
import { Box } from '@gluestack-ui/themed'
import { T } from '../../lib/theme'

// ─── Glass Presets ────────────────────────────────────────────

export type GlassVariant = 'light' | 'medium' | 'accent' | 'success' | 'danger' | 'gold' | 'thin' | 'primary'

const GLASS_STYLES: Record<GlassVariant, { bg: string; border: string }> = {
  light:   { bg: 'rgba(255,255,255,0.03)',  border: 'rgba(255,255,255,0.07)' },
  medium:  { bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.10)' },
  accent:  { bg: 'rgba(255,107,0,0.06)',    border: 'rgba(255,107,0,0.16)' },
  success: { bg: 'rgba(0,198,122,0.07)',    border: 'rgba(0,198,122,0.16)' },
  danger:  { bg: 'rgba(255,58,94,0.08)',    border: 'rgba(255,58,94,0.16)' },
  gold:    { bg: 'rgba(255,214,10,0.08)',   border: 'rgba(255,214,10,0.16)' },
  thin:    { bg: 'rgba(255,255,255,0.02)',  border: 'rgba(255,255,255,0.04)' },
  primary: { bg: 'rgba(10,132,255,0.07)',   border: 'rgba(10,132,255,0.16)' },
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
  borderRadius = T.borderRadius.lg,
  padding = T.spacing[4],
  style,
  shadow = 'none',
}: GlassCardProps) {
  const glass = GLASS_STYLES[variant]

  const shadowStyle = shadow !== 'none' ? T.shadows[shadow]?.('#000') ?? {} : {}

  return (
    <Box
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
    </Box>
  )
}

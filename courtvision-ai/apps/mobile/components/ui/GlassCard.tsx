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
import type { ViewStyle} from 'react-native';
import { Pressable, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { T } from '../../lib/theme'
import { HapticFeedback } from '../../lib/haptics'

// ─── Glass Presets ────────────────────────────────────────────

export type GlassVariant = 'light' | 'medium' | 'accent' | 'success' | 'danger' | 'gold' | 'thin' | 'primary'

const GLASS_STYLES: Record<GlassVariant, { bg: string; border: string }> = {
  light: { bg: T.color.bg.secondary, border: T.color.border.base },
  medium: { bg: T.color.bg.tertiary, border: T.color.border.base },
  accent: { bg: T.color.brand.muted, border: T.color.border.accent },
  success: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.24)' },
  danger: { bg: 'rgba(255,90,101,0.10)', border: 'rgba(255,90,101,0.24)' },
  gold: { bg: 'rgba(255,209,102,0.10)', border: 'rgba(255,209,102,0.24)' },
  thin: { bg: 'rgba(255,255,255,0.04)', border: T.color.border.white09 },
  primary: { bg: T.color.ai.muted, border: T.color.border.ai },
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
  onPress,
  shadow = 'none',
}: GlassCardProps) {
  const glass = GLASS_STYLES[variant]
  const isPressable = typeof onPress === 'function'

  const shadowStyle = shadow === 'none' ? {}
    : shadow === 'lg' ? T.glow.cta()
      : {}

  const baseStyle: ViewStyle = {
    backgroundColor: glass.bg,
    borderColor: glass.border,
    borderWidth: 0.5,
    borderRadius,
    padding,
    overflow: 'hidden',
    ...shadowStyle,
  }

  const content = (
    <>
      <BlurView intensity={20} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ position: 'relative' }}>
        {children}
      </View>
    </>
  )

  if (isPressable) {
    return (
      <Pressable
        onPress={() => {
          HapticFeedback.selection()
          onPress?.()
        }}
        style={({ pressed }) => [
          baseStyle,
          pressed ? { transform: [{ scale: 0.985 }], opacity: 0.94 } : null,
          style,
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View style={[baseStyle, style]}>
      {content}
    </View>
  )
}

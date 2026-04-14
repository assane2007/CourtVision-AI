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
import { T } from '../../lib/theme'
import { HapticFeedback } from '../../lib/haptics'

// ─── Glass Presets ────────────────────────────────────────────

export type GlassVariant = 'light' | 'medium' | 'accent' | 'success' | 'danger' | 'gold' | 'thin' | 'primary'

const GLASS_STYLES: Record<GlassVariant, { bg: string; border: string }> = {
  light: { bg: T.glass.base.backgroundColor, border: T.glass.base.borderColor },
  medium: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.14)' },
  accent: { bg: T.glass.vivid.backgroundColor, border: T.glass.vivid.borderColor },
  success: { bg: 'rgba(22,199,132,0.14)', border: 'rgba(22,199,132,0.26)' },
  danger: { bg: 'rgba(255,77,109,0.14)', border: 'rgba(255,77,109,0.26)' },
  gold: { bg: 'rgba(250,204,21,0.14)', border: 'rgba(250,204,21,0.26)' },
  thin: { bg: T.glass.thin.backgroundColor, border: T.glass.thin.borderColor },
  primary: { bg: 'rgba(42,123,255,0.14)', border: 'rgba(42,123,255,0.28)' },
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
    : shadow === 'sm' ? T.glow.soft()
      : shadow === 'md' ? T.glow.soft()
        : T.glow.hero()

  const baseStyle: ViewStyle = {
    backgroundColor: glass.bg,
    borderColor: glass.border,
    borderWidth: 1,
    borderRadius,
    padding,
    overflow: 'hidden',
    ...shadowStyle,
  }

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
        {children}
      </Pressable>
    )
  }

  return (
    <View style={[baseStyle, style]}>
      {children}
    </View>
  )
}

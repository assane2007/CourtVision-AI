/**
 * CVProgressBar — CourtVision branded progress bar.
 *
 * Animated fill with amber glow. Supports multiple color variants.
 *
 * Usage:
 *   <CVProgressBar value={73} max={100} color="amber" label="FG%" />
 *   <CVProgressBar value={2450} max={5000} color="purple" label="XP" showValue />
 */

import React, { useEffect } from 'react'
import type { ViewStyle } from 'react-native';
import { View } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated'
import type { TextColorAlias } from './CVText';
import { CVText } from './CVText'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVProgressColor = 'brand' | 'amber' | 'success' | 'warning' | 'error' | 'purple' | 'gold' | 'info'

export interface CVProgressBarProps {
  value: number
  max?: number
  color?: CVProgressColor
  label?: string
  showValue?: boolean
  height?: number
  delay?: number
  style?: ViewStyle
}

// ─── Color Map ────────────────────────────────────────────────

const FILL_COLORS: Record<CVProgressColor, string> = {
  brand: T.color.brand.primary,
  amber: T.color.brand.primary,
  success: T.color.semantic.success,
  warning: T.color.semantic.warning,
  error: T.color.semantic.error,
  purple: T.color.semantic.purple,
  gold: T.color.semantic.gold,
  info: T.color.semantic.info,
}

const TEXT_COLOR_MAP: Record<CVProgressColor, TextColorAlias> = {
  brand: 'brand',
  amber: 'brand',
  success: 'success',
  warning: 'warning',
  error: 'error',
  purple: 'purple',
  gold: 'gold',
  info: 'info',
}

// ─── Component ───────────────────────────────────────────────

export function CVProgressBar({
  value,
  max = 100,
  color = 'amber',
  label,
  showValue = false,
  height = 6,
  delay = 200,
  style,
}: CVProgressBarProps) {
  const pct = Math.min(Math.max(value / max, 0), 1)
  const fillColor = FILL_COLORS[color]

  const width = useSharedValue(0)

  useEffect(() => {
    width.value = withDelay(delay, withTiming(pct, {
      duration: 800,
      easing: Easing.linear,
    }))
  }, [pct, delay])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }))

  return (
    <View style={[{ gap: 6 }, style]}>
      {/* Label row */}
      {(label || showValue) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <CVText preset="caption" color="secondary">{label}</CVText>}
          {showValue && (
            <CVText preset="caption" color={TEXT_COLOR_MAP[color]}>
              {Math.round(value)}/{max}
            </CVText>
          )}
        </View>
      )}

      {/* Track */}
      <View style={{
        height,
        borderRadius: height / 2,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 0.5,
        borderColor: T.color.border.hairline,
        overflow: 'hidden',
      }}>
        {/* Fill */}
        <Animated.View style={[{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: fillColor,
        }, fillStyle]} />
      </View>
    </View>
  )
}

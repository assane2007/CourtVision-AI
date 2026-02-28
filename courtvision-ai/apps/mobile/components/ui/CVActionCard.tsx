/**
 * CVActionCard — CourtVision branded pressable action card.
 *
 * Premium glass card with icon, title, description, and chevron.
 * Used for Quick Actions (Live, Program, Twin, Upload).
 *
 * Usage:
 *   <CVActionCard
 *     icon="zap"
 *     iconColor="amber"
 *     title="Live Coach"
 *     description="Real-time AI analysis"
 *     onPress={() => router.push('/live')}
 *   />
 */

import React from 'react'
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { GlassCard, GlassVariant } from './GlassCard'
import { CVText, TextColorAlias } from './CVText'
import { CVIcon, CVIconColor } from './CVIcon'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export interface CVActionCardProps {
  icon: keyof typeof Feather.glyphMap
  iconColor?: CVIconColor
  title: string
  description?: string
  badge?: string
  glass?: GlassVariant
  onPress?: () => void
  delay?: number
  style?: ViewStyle
  compact?: boolean
}

// ─── Component ───────────────────────────────────────────────

export function CVActionCard({
  icon,
  iconColor = 'amber',
  title,
  description,
  badge,
  glass = 'light',
  onPress,
  delay = 0,
  style,
  compact = false,
}: CVActionCardProps) {
  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(350)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <GlassCard variant={glass} padding={compact ? T.spacing[3] : T.spacing[4]} style={style}>
          <View style={styles.row}>
            {/* Icon */}
            <CVIcon name={icon} color={iconColor} size={compact ? 18 : 22} bg />

            {/* Title + description */}
            <View style={styles.textCol}>
              <View style={styles.titleRow}>
                <CVText preset={compact ? 'bodySemibold' : 'cardTitle'} numberOfLines={1}>
                  {title}
                </CVText>
                {badge && (
                  <View style={[styles.badge, { backgroundColor: `${T.color.signature.primary}18`, borderColor: `${T.color.signature.primary}30` }]}>
                    <CVText preset="overline" color="amber" style={{ fontSize: 9 }}>
                      {badge}
                    </CVText>
                  </View>
                )}
              </View>
              {description && (
                <CVText preset="caption" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                  {description}
                </CVText>
              )}
            </View>

            {/* Chevron */}
            <Feather name="chevron-right" size={18} color={T.color.text.tertiary} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.spacing[3],
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
})

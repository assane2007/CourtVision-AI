/**
 * CVStatRow — Horizontal stat cards row.
 *
 * Renders 2-4 glass stat cards in a responsive row.
 * Uses GlassCard + CVText for consistent branding.
 *
 * Usage:
 *   <CVStatRow stats={[
 *     { label: 'FG%', value: '73', color: 'amber' },
 *     { label: 'XP', value: '2,450', color: 'purple' },
 *     { label: '3PT%', value: '41', color: 'success' },
 *   ]} />
 */

import React from 'react'
import { View, ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { GlassCard, GlassVariant } from './GlassCard'
import { CVText, TextColorAlias } from './CVText'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export interface StatItem {
  label: string
  value: string | number
  unit?: string
  color?: TextColorAlias
  glass?: GlassVariant
}

export interface CVStatRowProps {
  stats: StatItem[]
  style?: ViewStyle
  staggerDelay?: number
}

// ─── Component ───────────────────────────────────────────────

export function CVStatRow({
  stats,
  style,
  staggerDelay = 80,
}: CVStatRowProps) {
  return (
    <View style={[{
      flexDirection: 'row',
      gap: T.spacing[3],
    }, style]}>
      {stats.map((stat, i) => (
        <Animated.View
          key={`${stat.label}-${i}`}
          entering={FadeInDown.delay(i * staggerDelay).duration(400)}
          style={{ flex: 1 }}
        >
          <GlassCard
            variant={stat.glass ?? 'light'}
            padding={T.spacing[3]}
          >
            {/* Overline label */}
            <CVText preset="overline" color="secondary" style={{ marginBottom: 4 }}>
              {stat.label}
            </CVText>
            {/* Value + unit */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <CVText
                preset="mediumStat"
                color={stat.color ?? 'brand'}
                style={{ fontSize: 28 }}
              >
                {typeof stat.value === 'number' ? Math.round(stat.value) : stat.value}
              </CVText>
              {stat.unit && (
                <CVText
                  preset="caption"
                  color="tertiary"
                  style={{ marginLeft: 2, fontSize: 14, fontWeight: '700' }}
                >
                  {stat.unit}
                </CVText>
              )}
            </View>
          </GlassCard>
        </Animated.View>
      ))}
    </View>
  )
}

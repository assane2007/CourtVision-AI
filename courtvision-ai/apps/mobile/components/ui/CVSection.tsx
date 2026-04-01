/**
 * CVSection — CourtVision branded content section.
 *
 * Groups content with an overline title and optional "See All" action.
 * Provides consistent spacing and typography across the app.
 *
 * Usage:
 *   <CVSection title="Recent Sessions" action="See All" onAction={() => {}}>
 *     <SessionCard ... />
 *   </CVSection>
 */

import React from 'react'
import type { ViewStyle } from 'react-native';
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { CVText } from './CVText'
import { T } from '../../lib/theme'

export interface CVSectionProps {
  title: string
  subtitle?: string
  action?: string
  onAction?: () => void
  children: React.ReactNode
  style?: ViewStyle
  /** Remove horizontal padding */
  flush?: boolean
}

export function CVSection({
  title,
  subtitle,
  action,
  onAction,
  children,
  style,
  flush = false,
}: CVSectionProps) {
  return (
    <View style={[
      styles.container,
      flush ? {} : styles.padded,
      style,
    ]}>
      {/* Header Row */}
      <View style={[styles.header, flush ? styles.padded : {}]}>
        <View style={styles.titleCol}>
          <CVText preset="sectionTitle">{title}</CVText>
          {subtitle && (
            <CVText preset="caption" color="secondary" style={{ marginTop: 2 }}>
              {subtitle}
            </CVText>
          )}
        </View>
        {action && onAction && (
          <TouchableOpacity
            onPress={onAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={action}
          >
            <CVText preset="caption" color="brand">{action} →</CVText>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: T.spacing[6],
  },
  padded: {
    paddingHorizontal: T.spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: T.spacing[3],
  },
  titleCol: {
    flex: 1,
  },
  content: {
    gap: T.spacing[3],
  },
})

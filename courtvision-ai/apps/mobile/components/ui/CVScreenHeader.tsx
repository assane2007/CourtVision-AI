/**
 * CVScreenHeader — CourtVision branded screen header.
 *
 * Glass-morphism header with back button, title, and optional right action.
 * Consistent across all screens.
 *
 * Usage:
 *   <CVScreenHeader title="Analytics" onBack={() => router.back()} />
 *   <CVScreenHeader title="Settings" right={<CVIcon name="bell" />} />
 */

import React from 'react'
import { View, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { CVText } from './CVText'
import { T } from '../../lib/theme'

export interface CVScreenHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: React.ReactNode
  transparent?: boolean
  style?: ViewStyle
}

export function CVScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  transparent = false,
  style,
}: CVScreenHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[
      styles.container,
      {
        paddingTop: insets.top + 8,
        backgroundColor: transparent ? 'transparent' : 'rgba(8,12,18,0.92)',
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: T.color.border.soft,
      },
      style,
    ]}>
      <View style={styles.row}>
        {/* Left: Back button */}
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="chevron-left" size={24} color={T.color.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {/* Center: Title + subtitle */}
        <View style={styles.center}>
          <CVText preset="cardTitle" align="center" numberOfLines={1}>
            {title}
          </CVText>
          {subtitle && (
            <CVText preset="caption" color="secondary" align="center" numberOfLines={1}>
              {subtitle}
            </CVText>
          )}
        </View>

        {/* Right: Optional action */}
        <View style={styles.rightSlot}>
          {right}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: T.spacing[4],
    paddingBottom: 12,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
})

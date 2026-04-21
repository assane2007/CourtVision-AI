/**
 * CVEmptyState — CourtVision branded empty/zero state component.
 *
 * Beautiful empty state with icon, title, description and CTA.
 *
 * Usage:
 *   <CVEmptyState
 *     icon="film"
 *     title="No sessions yet"
 *     description="Record your first session to see your stats"
 *     action="Start Session"
 *     onAction={() => router.push('/live')}
 *   />
 */

import React from 'react'
import type { ViewStyle } from 'react-native';
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { CVText } from './CVText'
import { CVButton } from './CVButton'
import { T } from '../../lib/theme'

export interface CVEmptyStateProps {
  icon?: keyof typeof Feather.glyphMap
  title: string
  description?: string
  action?: string
  onAction?: () => void
  style?: ViewStyle
}

export function CVEmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  onAction,
  style,
}: CVEmptyStateProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: T.spacing[12],
        paddingHorizontal: T.spacing[8],
      }, style]}
    >
      {/* Icon circle */}
      <View style={{ marginBottom: T.spacing[4] }}>
        <Feather name={icon} size={24} color={T.color.text.subtle} />
      </View>

      <CVText preset="sectionTitle" align="center" style={{ marginBottom: 8 }}>
        {title}
      </CVText>

      {description && (
        <CVText preset="body" color="secondary" align="center" style={{ marginBottom: T.spacing[6], maxWidth: 280 }}>
          {description.split(' ').slice(0, 8).join(' ')}
        </CVText>
      )}

      {action && onAction && (
        <CVButton
          label={action}
          onPress={onAction}
          size="md"
          fullWidth={false}
        />
      )}
    </Animated.View>
  )
}

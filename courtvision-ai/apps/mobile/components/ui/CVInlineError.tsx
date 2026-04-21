import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { T } from '../../lib/theme'

interface CVInlineErrorProps {
  message: string
  onRetry?: () => void
}

export function CVInlineError({ message, onRetry }: CVInlineErrorProps) {
  return (
    <View style={{ borderLeftWidth: 1, borderLeftColor: T.color.brand.primary, paddingLeft: 10, gap: 6 }}>
      <Text style={{ color: T.color.text.secondary, fontFamily: T.fonts.body.medium, fontSize: 13 }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: T.color.text.primary, fontFamily: T.fonts.body.bold, fontSize: 13 }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

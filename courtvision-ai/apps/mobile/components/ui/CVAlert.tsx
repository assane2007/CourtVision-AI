/**
 * CVAlert — CourtVision branded inline alert / banner.
 *
 * Glass-morphism alert with semantic colors and optional action.
 *
 * Usage:
 *   <CVAlert type="success" title="Session saved!" />
 *   <CVAlert type="warning" title="Low battery" message="Connect charger" />
 *   <CVAlert type="info" title="Tip" message="Keep your elbow aligned" action="Got it" onAction={dismiss} />
 */

import React from 'react'
import type { ViewStyle } from 'react-native';
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { CVText } from './CVText'
import { T } from '../../lib/theme'

// ─── Types ────────────────────────────────────────────────────

export type CVAlertType = 'success' | 'warning' | 'error' | 'info' | 'amber'

export interface CVAlertProps {
  type?: CVAlertType
  title: string
  message?: string
  action?: string
  onAction?: () => void
  onDismiss?: () => void
  icon?: keyof typeof Feather.glyphMap
  style?: ViewStyle
}

// ─── Alert Config ─────────────────────────────────────────────

const ALERT_CONFIG: Record<CVAlertType, {
  bg: string; border: string; color: string; defaultIcon: keyof typeof Feather.glyphMap
}> = {
  success: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.24)', color: T.color.semantic.success, defaultIcon: 'check-circle' },
  warning: { bg: 'rgba(255,193,69,0.10)', border: 'rgba(255,193,69,0.24)', color: T.color.semantic.warning, defaultIcon: 'alert-triangle' },
  error:   { bg: 'rgba(255,90,101,0.10)', border: 'rgba(255,90,101,0.24)', color: T.color.semantic.error, defaultIcon: 'alert-circle' },
  info:    { bg: T.color.ai.muted, border: T.color.border.ai, color: T.color.ai.primary, defaultIcon: 'info' },
  amber:   { bg: T.color.brand.muted, border: T.color.border.accent, color: T.color.brand.primary, defaultIcon: 'zap' },
}

// ─── Component ───────────────────────────────────────────────

export function CVAlert({
  type = 'info',
  title,
  message,
  action,
  onAction,
  onDismiss,
  icon,
  style,
}: CVAlertProps) {
  const cfg = ALERT_CONFIG[type]
  const iconName = icon ?? cfg.defaultIcon

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
      },
      style,
    ]}>
      {/* Icon */}
      <View style={styles.iconCol}>
        <Feather name={iconName} size={18} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <CVText preset='cardTitle' style={{ color: cfg.color }}>
          {title}
        </CVText>
        {message && (
          <CVText preset="caption" color="secondary" style={{ marginTop: 2 }}>
            {message}
          </CVText>
        )}
        {action && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
            <CVText preset="caption" color="amber" style={{ fontWeight: '700' }}>
              {action}
            </CVText>
          </TouchableOpacity>
        )}
      </View>

      {/* Dismiss */}
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Feather name="x" size={14} color={T.color.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: T.radius.lg,
    borderWidth: 0.5,
    padding: T.spacing[3],
    gap: T.spacing[3],
    alignItems: 'flex-start',
  },
  iconCol: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  actionBtn: {
    marginTop: 8,
  },
  dismissBtn: {
    padding: 4,
  },
})

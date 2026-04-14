/**
 * CourtVision AI — Gluestack-UI Primitive Components
 * ====================================================
 * Premium UI primitives built on top of gluestack-ui/themed.
 * These wrap the raw gluestack components with CourtVision's
 * brand identity: amber signature, glass morphism, dark theme,
 * and sport-centric gamification aesthetics.
 *
 * Usage:
 *   import { GlassCard, CVText, CVButton, CVInput, CVBadge } from '../components/ui'
 */

// ── Provider ──

// ── Foundation ──
export { CVText } from './CVText'
export type { CVTextProps, TextPreset, TextColorAlias } from './CVText'

export { CVButton } from './CVButton'
export type { CVButtonProps, CVButtonVariant, CVButtonSize } from './CVButton'

export { CVIcon } from './CVIcon'
export type { CVIconProps, CVIconColor } from './CVIcon'

export { CVDivider } from './CVDivider'
export type { CVDividerProps } from './CVDivider'

// ── Cards & Layout ──
export { GlassCard } from './GlassCard'
export type { GlassCardProps, GlassVariant } from './GlassCard'

export { CVSection } from './CVSection'
export type { CVSectionProps } from './CVSection'

export { CVActionCard } from './CVActionCard'
export type { CVActionCardProps } from './CVActionCard'

// ── Data Display ──
export { CVStatRow } from './CVStatRow'
export type { CVStatRowProps, StatItem } from './CVStatRow'

export { CVProgressBar } from './CVProgressBar'
export type { CVProgressBarProps, CVProgressColor } from './CVProgressBar'

export { CVAnalyticsChart } from './CVAnalyticsChart'
export { CourtHeatmap } from './CourtHeatmap'

export { CVBadge } from './CVBadge'
export type { CVBadgeProps, CVBadgeVariant, CVBadgeSize } from './CVBadge'

// ── Forms ──
export { CVInput } from './CVInput'
export type { CVInputProps, CVInputVariant, CVInputSize } from './CVInput'

// ── Feedback ──
export { CVAlert } from './CVAlert'
export type { CVAlertProps, CVAlertType } from './CVAlert'

export { CVEmptyState } from './CVEmptyState'
export type { CVEmptyStateProps } from './CVEmptyState'

// ── HUD & Tracking ──
export { CVHUDStat } from './CVHUDStat'
export { CVHUDTimer } from './CVHUDTimer'
export { CVHUDFeedback } from './CVHUDFeedback'
export type { HUDFeedbackType } from './CVHUDFeedback'

// ── Screen Structure ──
export { CVScreenHeader } from './CVScreenHeader'
export type { CVScreenHeaderProps } from './CVScreenHeader'

// ── App Surfaces ──
export { AppBackground } from './AppBackground'
export type { AppBackgroundVariant } from './AppBackground'

/**
 * Simple feature flag system.
 * Flags are defined here as constants; localStorage overrides are checked
 * client-side so testers/devs can toggle features on the fly.
 */

export const FEATURES = {
  reaction_trainer: true,
  scouting: true,
  ai_coach: true,
  video_replay: false,            // Coming soon
  social_leaderboard: true,
  internationalization: false,    // Coming soon
  push_notifications: false,      // Coming soon
} as const

export type FeatureFlag = keyof typeof FEATURES

/**
 * Check if a feature flag is enabled.
 * On the client, checks localStorage for an override first (`feature_<name>`).
 * Falls back to the default value defined in FEATURES.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Client-side: check localStorage override
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(`feature_${flag}`)
    if (override !== null) return override === 'true'
  }
  return FEATURES[flag]
}

/**
 * Set a feature flag override in localStorage.
 * Only works on the client.
 */
export function setFeatureOverride(flag: FeatureFlag, enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`feature_${flag}`, String(enabled))
  }
}

/** Human-readable labels for each flag (French) */
export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  reaction_trainer: 'Entraîneur de Réaction',
  scouting: 'Scouting',
  ai_coach: 'Coach IA',
  video_replay: 'Replay Vidéo',
  social_leaderboard: 'Classement Social',
  internationalization: 'Internationalisation',
  push_notifications: 'Notifications Push',
}

/** All feature flags as an array for iteration */
export const ALL_FLAGS = Object.keys(FEATURES) as FeatureFlag[]
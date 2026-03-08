/**
 * @courtvision/shared — Feature flags for runtime feature gating.
 * Features not yet production-ready MUST be gated behind flags.
 * @module featureFlags
 */

/** Runtime feature flags resolved from environment variables */
export const FEATURES = {
  /** 3D Gaussian Splatting reconstruction (requires A100 GPU) — not yet implemented */
  SPATIAL_3D: process.env.ENABLE_SPATIAL_3D === 'true',

  /** TikTok sharing integration (requires TikTok Business API approval) */
  TIKTOK_SHARE: process.env.ENABLE_TIKTOK === 'true',

  /** Voice coaching via WebSocket (experimental) */
  VOICE_COACH: process.env.ENABLE_VOICE_COACH === 'true',

  /** Pre-Cog reaction training module */
  PRECOG: process.env.ENABLE_PRECOG !== 'false', // enabled by default
} as const

export type FeatureName = keyof typeof FEATURES

/**
 * Check if a feature is enabled at runtime.
 * @param feature - The feature flag name
 * @returns true if the feature is enabled
 */
export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature] ?? false
}

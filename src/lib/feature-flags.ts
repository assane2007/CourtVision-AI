/**
 * Production-ready feature flag system.
 *
 * Resolution order (highest → lowest priority):
 *   1. Environment variable override: NEXT_PUBLIC_FF_<NAME>
 *   2. In-memory cache (5-min TTL)
 *   3. Database row (FeatureFlag table)
 *   4. Default value (FEATURE_DEFAULTS below)
 *
 * On the client side, only env vars and defaults are available
 * (the server caches DB values and serves them via /api/feature-flags/public).
 * Client-side localStorage overrides are kept for backward compatibility.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FLAG DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** All known feature flags and their default (fallback) values. */
export const FEATURE_DEFAULTS = {
  ai_streaming: false,
  video_export: false,
  push_notifications: false,
  email_notifications: true,
  voice_coach: false,
  social_feed: true,
  teams: true,
  challenges: true,
  live_workout: false,
  reaction_trainer: true,
  scouting: true,
  advanced_analytics: false,
  admin_dashboard: true,
  maintenance_mode: false,
  new_onboarding: false,
  dark_mode: true,
} as const

export type FeatureFlag = keyof typeof FEATURE_DEFAULTS

/** Human-readable labels for each flag. */
export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  ai_streaming: 'AI Streaming Responses',
  video_export: 'Video Export',
  push_notifications: 'Push Notifications',
  email_notifications: 'Email Notifications',
  voice_coach: 'Voice Coach',
  social_feed: 'Social Feed',
  teams: 'Teams',
  challenges: 'Challenges',
  live_workout: 'Live Workout Sessions',
  reaction_trainer: 'Reaction Trainer',
  scouting: 'Scouting',
  advanced_analytics: 'Advanced Analytics',
  admin_dashboard: 'Admin Dashboard',
  maintenance_mode: 'Maintenance Mode',
  new_onboarding: 'New Onboarding Flow',
  dark_mode: 'Dark Mode Toggle',
}

/** Flags safe for public (unauthenticated) client consumption. */
export const PUBLIC_FLAGS: FeatureFlag[] = [
  'maintenance_mode',
  'new_onboarding',
  'dark_mode',
  'social_feed',
  'reaction_trainer',
  'challenges',
  'live_workout',
  'voice_coach',
  'push_notifications',
]

/** All feature flags as an array for iteration. */
export const ALL_FLAGS = Object.keys(FEATURE_DEFAULTS) as FeatureFlag[]

// ═══════════════════════════════════════════════════════════════════════════════
// ENV-VAR OVERRIDE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check whether a `NEXT_PUBLIC_FF_<NAME>` environment variable is set.
 * Returns `true` / `false` when set, or `null` when not set (meaning:
 * "fall through to next resolution layer").
 */
export function getEnvOverride(flag: FeatureFlag): boolean | null {
  const envKey = `NEXT_PUBLIC_FF_${flag.toUpperCase()}`
  const value = process.env[envKey]
  if (value === undefined || value === '') return null
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE (server-side)
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  value: boolean
  expiresAt: number
}

/** Server-side in-memory cache of feature flag values. */
const flagCache = new Map<FeatureFlag, CacheEntry>()

function getCached(flag: FeatureFlag): boolean | null {
  const entry = flagCache.get(flag)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    flagCache.delete(flag)
    return null
  }
  return entry.value
}

function setCache(flag: FeatureFlag, value: boolean): void {
  flagCache.set(flag, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

function clearCache(flag?: FeatureFlag): void {
  if (flag) {
    flagCache.delete(flag)
  } else {
    flagCache.clear()
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE HELPERS (server-side)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load a single flag value from the database.
 * Returns `null` if the row doesn't exist (meaning: use default).
 * Must only be called server-side.
 */
export async function loadFlagFromDb(
  flag: FeatureFlag,
): Promise<boolean | null> {
  try {
    const { db } = await import('@/lib/db')
    const row = await db.featureFlag.findUnique({
      where: { name: flag },
      select: { enabled: true },
    })
    return row ? row.enabled : null
  } catch {
    // If the DB is unavailable (e.g. migration not yet run), fall back to default
    return null
  }
}

/**
 * Load all flags from the database.
 * Returns a map of flag name → enabled value for flags that exist in the DB.
 */
export async function loadAllFlagsFromDb(): Promise<
  Partial<Record<FeatureFlag, boolean>>
> {
  try {
    const { db } = await import('@/lib/db')
    const rows = await db.featureFlag.findMany({
      select: { name: true, enabled: true },
    })
    const result: Partial<Record<FeatureFlag, boolean>> = {}
    for (const row of rows) {
      if (row.name in FEATURE_DEFAULTS) {
        result[row.name as FeatureFlag] = row.enabled
      }
    }
    return result
  } catch {
    return {}
  }
}

/**
 * Set a flag value in the database (upsert).
 * Also invalidates the in-memory cache for that flag.
 */
export async function setFlagInDb(
  flag: FeatureFlag,
  enabled: boolean,
): Promise<void> {
  const { db } = await import('@/lib/db')
  await db.featureFlag.upsert({
    where: { name: flag },
    update: { enabled },
    create: { name: flag, enabled },
  })
  clearCache(flag)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER-SIDE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a feature flag is enabled on the server.
 * Resolution order: env var → cache → DB → default.
 */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  // 1. Environment variable override
  const envOverride = getEnvOverride(flag)
  if (envOverride !== null) return envOverride

  // 2. In-memory cache
  const cached = getCached(flag)
  if (cached !== null) return cached

  // 3. Database
  const dbValue = await loadFlagFromDb(flag)
  const resolved = dbValue !== null ? dbValue : FEATURE_DEFAULTS[flag]

  // Populate cache for subsequent calls
  setCache(flag, resolved)

  return resolved
}

/**
 * Batch-check multiple flags (server-side).
 * Returns a record of flag → boolean.
 */
export async function getFeatureFlags(
  flags?: FeatureFlag[],
): Promise<Record<FeatureFlag, boolean>> {
  const flagList = flags ?? ALL_FLAGS
  const results = {} as Record<FeatureFlag, boolean>

  // Try to load all flags from DB in one query, then resolve each
  const dbFlags = await loadAllFlagsFromDb()

  for (const flag of flagList) {
    // 1. Env var
    const envOverride = getEnvOverride(flag)
    if (envOverride !== null) {
      results[flag] = envOverride
      continue
    }

    // 2. Cache
    const cached = getCached(flag)
    if (cached !== null) {
      results[flag] = cached
      continue
    }

    // 3. DB or default
    const resolved =
      dbFlags[flag] !== undefined ? dbFlags[flag]! : FEATURE_DEFAULTS[flag]
    setCache(flag, resolved)
    results[flag] = resolved
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE HELPERS (backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Synchronous client-side check.
 * Resolution: env var → localStorage override → default.
 * Does NOT hit the database or the API — use the `useFeatureFlag` hook
 * for API-backed checks.
 */
export function isFeatureEnabledClient(flag: FeatureFlag): boolean {
  // 1. Env var (NEXT_PUBLIC_ vars are inlined at build time)
  const envOverride = getEnvOverride(flag)
  if (envOverride !== null) return envOverride

  // 2. localStorage override
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(`feature_${flag}`)
    if (override !== null) return override === 'true'
  }

  // 3. Default
  return FEATURE_DEFAULTS[flag]
}

/**
 * Set a client-side localStorage override (backward compat).
 */
export function setFeatureOverride(
  flag: FeatureFlag,
  enabled: boolean,
): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`feature_${flag}`, String(enabled))
  }
}

/**
 * Invalidate the server-side in-memory cache.
 * Call this after updating a flag via the API.
 */
export function invalidateFlagCache(flag?: FeatureFlag): void {
  clearCache(flag)
}
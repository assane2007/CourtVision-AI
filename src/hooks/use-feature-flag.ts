'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type FeatureFlag,
  FEATURE_DEFAULTS,
  isFeatureEnabledClient,
} from '@/lib/feature-flags'

/**
 * In-memory cache of flags fetched from the API.
 * Shared across all hook instances to avoid duplicate fetches.
 */
let apiCache: Record<string, boolean> | null = null
let apiCachePromise: Promise<Record<string, boolean>> | null = null
let apiCacheTimestamp = 0
const API_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch all public flags from the API (with dedup + TTL).
 */
async function fetchPublicFlags(): Promise<Record<string, boolean>> {
  const now = Date.now()

  // Return cached if still fresh
  if (apiCache && now - apiCacheTimestamp < API_CACHE_TTL_MS) {
    return apiCache
  }

  // Deduplicate concurrent requests
  if (apiCachePromise) {
    return apiCachePromise
  }

  apiCachePromise = fetch('/api/feature-flags/public')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<{ flags: Record<string, boolean> }>
    })
    .then((data) => {
      apiCache = data.flags
      apiCacheTimestamp = Date.now()
      return data.flags
    })
    .catch(() => {
      // On error, fall back to defaults
      return { ...FEATURE_DEFAULTS } as unknown as Record<string, boolean>
    })
    .finally(() => {
      apiCachePromise = null
    })

  return apiCachePromise
}

/**
 * `useFeatureFlag` — React hook for checking feature flags on the client.
 *
 * Resolution order:
 *   1. Environment variable (NEXT_PUBLIC_FF_*) — inlined at build time
 *   2. API-fetched value (from /api/feature-flags/public, cached 5 min)
 *   3. Default value (FEATURE_DEFAULTS)
 *   4. localStorage override (backward compat, highest priority on client)
 *
 * @example
 * ```tsx
 * const streamingEnabled = useFeatureFlag('ai_streaming')
 * if (streamingEnabled) { ... }
 * ```
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const [apiFlags, setApiFlags] = useState<Record<string, boolean> | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    fetchPublicFlags().then((flags) => {
      if (!cancelled) {
        setApiFlags(flags)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const resolve = useCallback(
    (currentApiFlags: Record<string, boolean> | null): boolean => {
      // 1. localStorage override (backward compat, client-only)
      if (typeof window !== 'undefined') {
        const override = localStorage.getItem(`feature_${flag}`)
        if (override !== null) return override === 'true'
      }

      // 2. API value (if fetched)
      if (currentApiFlags && flag in currentApiFlags) {
        return currentApiFlags[flag]
      }

      // 3. Client-side env check + default
      return isFeatureEnabledClient(flag)
    },
    [flag],
  )

  return resolve(apiFlags)
}

/**
 * `useFeatureFlags` — Hook to get multiple feature flags at once.
 * Avoids multiple individual fetches by sharing the same API call.
 *
 * @example
 * ```tsx
 * const { flags, loading } = useFeatureFlags(['social_feed', 'reaction_trainer'])
 * ```
 */
export function useFeatureFlags(
  flags?: FeatureFlag[],
): { flags: Record<string, boolean>; loading: boolean } {
  const [apiFlags, setApiFlags] = useState<Record<string, boolean> | null>(
    null,
  )
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchPublicFlags().then((f) => {
      if (!cancelled) {
        setApiFlags(f)
        setFetched(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const flagList = flags ?? (Object.keys(FEATURE_DEFAULTS) as FeatureFlag[])
  const resolved: Record<string, boolean> = {}

  for (const flag of flagList) {
    // localStorage override
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem(`feature_${flag}`)
      if (override !== null) {
        resolved[flag] = override === 'true'
        continue
      }
    }

    // API value or fallback
    if (apiFlags && flag in apiFlags) {
      resolved[flag] = apiFlags[flag]
    } else {
      resolved[flag] = isFeatureEnabledClient(flag)
    }
  }

  return { flags: resolved, loading: !fetched }
}
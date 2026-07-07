'use client'

import { useState, useEffect } from 'react'
import { isFeatureEnabled, type FeatureFlag } from '@/lib/feature-flags'

interface FeatureGateProps {
  flag: FeatureFlag
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Conditionally renders children based on a feature flag.
 * Uses client-side state to avoid SSR mismatch.
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(isFeatureEnabled(flag))
  }, [flag])

  // Listen for storage changes (e.g., toggled in settings)
  useEffect(() => {
    const handler = () => {
      setEnabled(isFeatureEnabled(flag))
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [flag])

  if (!enabled) return <>{fallback}</>
  return <>{children}</>
}
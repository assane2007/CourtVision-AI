'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { identifyUser } from '@/lib/analytics'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * PostHog analytics provider.
 * Identifies authenticated users with PostHog.
 * If NEXT_PUBLIC_POSTHOG_KEY is not configured, this is a no-op.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    if (!POSTHOG_KEY) return
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
      })
    }
  }, [user])

  return <>{children}</>
}
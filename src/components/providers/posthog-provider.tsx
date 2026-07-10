'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { identifyUser } from '@/lib/analytics'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
      })
    }
  }, [user])

  return <>{children}</>
}
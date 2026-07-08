'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { identifyUser } from '@/lib/analytics'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      identifyUser(session.user.id as string, {
        email: session.user.email,
        name: session.user.name,
      })
    }
  }, [session])

  return <>{children}</>
}
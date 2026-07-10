'use client'

/**
 * React hook for Supabase Auth — provides user state, sign-in, sign-out.
 *
 * @example
 * const { user, signInWithMagicLink, signOut, loading } = useSupabaseAuth()
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from './client'

interface SupabaseUser {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
  provider: string
}

interface UseSupabaseAuthReturn {
  user: SupabaseUser | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          name: session.user.user_metadata?.name || null,
          avatar: session.user.user_metadata?.avatar_url || null,
          provider: session.user.app_metadata?.provider || 'supabase',
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          name: session.user.user_metadata?.name || null,
          avatar: session.user.user_metadata?.avatar_url || null,
          provider: session.user.app_metadata?.provider || 'supabase',
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ email })
      return { error: error?.message || null }
    } catch {
      return { error: 'Erreur de connexion' }
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.refreshSession()
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.user_metadata?.name || null,
        avatar: session.user.user_metadata?.avatar_url || null,
        provider: session.user.app_metadata?.provider || 'supabase',
      })
    }
  }, [])

  return { user, loading, signInWithMagicLink, signInWithOAuth, signOut, refreshSession }
}
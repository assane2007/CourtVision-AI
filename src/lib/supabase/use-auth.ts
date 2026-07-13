'use client';
/**
 * React hook for Supabase Auth — provides user state, sign-in, sign-out.
 *
 * @example
 * const { user, signInWithMagicLink, signOut, loading } = useSupabaseAuth()
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from './client';

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
  supabaseReady: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(() => !createClient())

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      return
    }

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
    const supabase = createClient()
    if (!supabase) return { error: 'Authentication is not configured' }

    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      return { error: error?.message || null }
    } catch {
      return { error: 'Failed to send magic link' }
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const supabase = createClient()
    if (!supabase) return { error: 'Authentication is not configured' }

    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      })
      return { error: null }
    } catch {
      return { error: 'OAuth sign-in failed' }
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) return

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

  return { user, loading, supabaseReady: !!createClient(), signInWithMagicLink, signInWithOAuth, signOut, refreshSession }
}
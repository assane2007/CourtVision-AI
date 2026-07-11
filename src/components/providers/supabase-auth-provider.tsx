'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const SupabaseAuthContext = createContext<AuthContextValue | null>(null)

// ── Helper ─────────────────────────────────────────────────────────────────────

function mapUser(supabaseUser: User): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || null,
    avatar: supabaseUser.user_metadata?.avatar_url || null,
  }
}

/**
 * Sync the Supabase user to the local Player table.
 * Called after sign-in and sign-up — NOT on every auth state change.
 * Silently ignores errors (Player may already exist).
 */
async function syncPlayerToDb(userId: string, email: string | null, name: string | null) {
  try {
    const res = await fetch('/api/auth/supabase/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, name }),
    })
    if (res.ok) await res.json()
  } catch {
    // Silently ignore — the Player record may already exist or DB is unreachable
  }
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mountedRef.current) return
      if (currentSession?.user) {
        setSession(currentSession)
        setUser(mapUser(currentSession.user))
      }
      setLoading(false)
    })

    // Listen for auth state changes (session refresh, OAuth, magic link, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mountedRef.current) return
        if (newSession?.user) {
          setSession(newSession)
          setUser(mapUser(newSession.user))

          // Sync Player record for ALL auth events (OAuth, magic link, token refresh)
          // signIn/signUp callbacks handle it for email/password, but OAuth/magic-link
          // go through this path instead.
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            const name = newSession.user.user_metadata?.name || newSession.user.email?.split('@')[0] || null
            syncPlayerToDb(newSession.user.id, newSession.user.email, name)
          }
        } else {
          setSession(null)
          setUser(null)
        }
      },
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (!error && data.user) {
        // Sync Player record immediately after successful signup
        await syncPlayerToDb(data.user.id, data.user.email, name)
      }

      return { error: error?.message || null }
    } catch {
      return { error: 'Failed to create account' }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!error && data.user) {
        // Sync Player record on login (creates if missing, no-op if exists)
        const name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || null
        await syncPlayerToDb(data.user.id, data.user.email, name)
      }

      return { error: error?.message || null }
    } catch {
      return { error: 'Login failed' }
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
  }

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(SupabaseAuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return ctx
}
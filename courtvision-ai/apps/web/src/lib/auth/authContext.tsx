'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
}

interface AuthContextValue extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
    getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
    })

    const supabase = React.useMemo(() => createClient(), [])
    const supabaseConfigured = React.useMemo(() => isSupabaseConfigured(), [])

    useEffect(() => {
        if (!supabaseConfigured) {
            setState({ user: null, session: null, loading: false })
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setState({
                user: session?.user ?? null,
                session,
                loading: false,
            })
        })

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setState({
                    user: session?.user ?? null,
                    session,
                    loading: false,
                })
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, supabaseConfigured])

    const signIn = useCallback(async (email: string, password: string) => {
        if (!supabaseConfigured) {
            return { error: 'Supabase is not configured.' }
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
    }, [supabase, supabaseConfigured])

    const signUp = useCallback(async (email: string, password: string, name: string) => {
        if (!supabaseConfigured) {
            return { error: 'Supabase is not configured.' }
        }
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
            },
        })
        return { error: error?.message ?? null }
    }, [supabase, supabaseConfigured])

    const signInWithGoogle = useCallback(async () => {
        if (!supabaseConfigured) {
            return
        }
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            },
        })
    }, [supabase, supabaseConfigured])

    const signOut = useCallback(async () => {
        if (supabaseConfigured) {
            await supabase.auth.signOut()
        }
        window.location.href = '/login'
    }, [supabase, supabaseConfigured])

    const getAccessToken = useCallback(async () => {
        if (!supabaseConfigured) {
            return null
        }
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token ?? null
    }, [supabase, supabaseConfigured])

    return (
        <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithGoogle, signOut, getAccessToken }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

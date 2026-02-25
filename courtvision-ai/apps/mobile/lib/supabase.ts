/**
 * Supabase Client — CourtVision AI
 *
 * Initializes the Supabase JS client for React Native.
 * Session is persisted in AsyncStorage and auto-refreshed.
 *
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * in your .env (or app.json extra) before running the app.
 */

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

// ─── Config ────────────────────────────────────────────────────

const SUPABASE_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co'

const SUPABASE_ANON_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key'

// ─── Client ────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})

// ─── Keep session alive when app returns to foreground ─────────

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})

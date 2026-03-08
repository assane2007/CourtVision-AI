/**
 * Supabase Client — CourtVision AI
 *
 * Initializes the Supabase JS client for React Native.
 * Session is persisted in AsyncStorage and auto-refreshed.
 *
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * in your .env (or app.json extra) before running the app.
 *
 * If Supabase is not configured, isDemoMode will be true and
 * the app will use mock auth instead.
 */

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

// ─── Config ────────────────────────────────────────────────────

const SUPABASE_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''

const SUPABASE_ANON_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ─── Demo mode detection ───────────────────────────────────────
// True when Supabase credentials are missing or still placeholders
export const isDemoMode =
    !SUPABASE_URL ||
    SUPABASE_URL.includes('your-project') ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY === 'your-anon-key' ||
    SUPABASE_ANON_KEY.length < 20

if (isDemoMode) {
    console.warn(
        '[CourtVision] ⚠️  Supabase not configured — running in DEMO mode.\n' +
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env'
    )
}

// ─── Client ────────────────────────────────────────────────────

const safeUrl = SUPABASE_URL || 'https://placeholder.supabase.co'
const safeKey = SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(safeUrl, safeKey, {
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

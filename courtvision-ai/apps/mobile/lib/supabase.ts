/**
 * Supabase Client — CourtVision AI
 *
 * Initializes the Supabase JS client for React Native.
 * Session is persisted in AsyncStorage and auto-refreshed.
 *
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * in your .env (or app.json extra) before running the app.
 *
 * Demo mode is opt-in only via EXPO_PUBLIC_ENABLE_DEMO_MODE=true.
 */

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

// ─── Config ────────────────────────────────────────────────────

const SUPABASE_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''

const SUPABASE_ANON_KEY =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

const LOCAL_FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321'
const LOCAL_FALLBACK_SUPABASE_ANON_KEY = 'local-fallback-anon-key-not-for-production'

const isSupabaseConfigured =
    !!SUPABASE_URL &&
    !SUPABASE_URL.includes('your-project') &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== 'your-anon-key' &&
    SUPABASE_ANON_KEY.length >= 20

// Demo mode must be explicitly enabled; missing env vars no longer auto-enable mock flows.
export const isDemoMode = process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE === 'true'
const isTestEnv = process.env.NODE_ENV === 'test'
const allowFallbackClient = isDemoMode || isTestEnv

if (!isSupabaseConfigured && !allowFallbackClient) {
    throw new Error(
        '[CourtVision][mobile] Supabase is required outside demo/test mode. ' +
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env.'
    )
}

if (!isSupabaseConfigured && allowFallbackClient) {
    console.warn(
        '[CourtVision] ⚠️  Supabase not configured. Using fallback client for demo/test mode only.'
    )
}

if (isDemoMode) {
    console.warn('[CourtVision] ⚠️  EXPO_PUBLIC_ENABLE_DEMO_MODE=true: mock flows are enabled intentionally.')
}

// ─── Client ────────────────────────────────────────────────────

const safeUrl = isSupabaseConfigured ? SUPABASE_URL : LOCAL_FALLBACK_SUPABASE_URL
const safeKey = isSupabaseConfigured ? SUPABASE_ANON_KEY : LOCAL_FALLBACK_SUPABASE_ANON_KEY

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

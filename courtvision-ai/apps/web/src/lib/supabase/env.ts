const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321'
const FALLBACK_SUPABASE_ANON_KEY = 'local-fallback-anon-key-not-for-production'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
const isTestEnv = process.env.NODE_ENV === 'test'

let warned = false

function looksLikePlaceholder(value: string): boolean {
    return value.includes('your-') || value.includes('placeholder')
}

export function isSupabaseConfigured(): boolean {
    return (
        SUPABASE_URL.length > 0 &&
        SUPABASE_ANON_KEY.length >= 20 &&
        !looksLikePlaceholder(SUPABASE_URL) &&
        !looksLikePlaceholder(SUPABASE_ANON_KEY)
    )
}

function warnOnce(): void {
    if (warned) return
    warned = true
    console.warn('[CourtVision][web] Supabase env vars missing. Running in degraded mode (no authenticated backend access).')
}

export function getSupabaseEnv(): { url: string; anonKey: string; configured: boolean } {
    const configured = isSupabaseConfigured()
    if (!configured) {
        if (!isTestEnv) {
            throw new Error(
                '[CourtVision][web] Supabase env vars are required. ' +
                'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
            )
        }
        warnOnce()
    }
    return {
        url: configured ? SUPABASE_URL : FALLBACK_SUPABASE_URL,
        anonKey: configured ? SUPABASE_ANON_KEY : FALLBACK_SUPABASE_ANON_KEY,
        configured,
    }
}

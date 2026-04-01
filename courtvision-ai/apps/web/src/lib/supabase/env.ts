const FALLBACK_SUPABASE_URL = 'https://demo.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

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
        warnOnce()
    }
    return {
        url: configured ? SUPABASE_URL : FALLBACK_SUPABASE_URL,
        anonKey: configured ? SUPABASE_ANON_KEY : FALLBACK_SUPABASE_ANON_KEY,
        configured,
    }
}

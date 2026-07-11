'use client'

/**
 * Supabase browser client.
 *
 * Uses the anon (publishable) key — safe for client-side code.
 * Only has access to rows allowed by Row Level Security (RLS).
 *
 * If Supabase is not configured, returns null instead of crashing.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _cachedClient: SupabaseClient | null = null

export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set. Auth is disabled.')
    return null
  }

  if (!_cachedClient) {
    _cachedClient = createBrowserClient(url, key)
  }
  return _cachedClient
}
'use client'

/**
 * Supabase browser client.
 *
 * Uses the anon (publishable) key — safe for client-side code.
 * Only has access to rows allowed by Row Level Security (RLS).
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
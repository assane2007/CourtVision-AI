/**
 * Supabase server client.
 *
 * Uses cookies to persist the user's session.
 * Must be called inside an async function (App Router / API route).
 *
 * IMPORTANT: Supabase MUST be configured (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * If not set, this will throw a clear error rather than silently failing.
 */

import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables. ' +
      'See .env.example for configuration instructions.'
    )
  }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions),
          )
        } catch {
          // setAll is called from Server Component where cookies cannot be set.
          // This can be ignored if middleware refreshes sessions.
        }
      },
    },
  })
}

/**
 * Create a Supabase admin client with full access (bypasses RLS).
 * Use ONLY in server-side trusted code (API routes, server actions).
 *
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn('[Supabase] Admin client: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const supabaseMod = require('@supabase/supabase-js')
  return supabaseMod.createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
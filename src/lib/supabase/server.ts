/**
 * Supabase server client.
 *
 * Uses cookies to persist the user's session.
 * Must be called inside an async function (App Router / API route).
 */

import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function createSupabaseServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  )
}

/**
 * Create a Supabase admin client with full access (bypasses RLS).
 * Use ONLY in server-side trusted code (API routes, server actions).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !key) {
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
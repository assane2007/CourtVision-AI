/**
 * Supabase server client.
 *
 * Uses cookies to persist the user's session.
 * Pass the `cookies()` from `next/headers` in App Router,
 * or `req.cookies` in Pages API routes / middleware.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

export const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookies().getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies().set(name, value, options as CookieOptions),
          )
        } catch {
          // setAll is called from Server Component where cookies cannot be set.
          // This can be ignored if middleware refreshes sessions.
        }
      },
    },
  },
)

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
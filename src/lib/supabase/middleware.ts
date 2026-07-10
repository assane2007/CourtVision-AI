/**
 * Supabase middleware helper for Next.js.
 *
 * Refreshes the Supabase auth session on every request
 * and syncs the access token into a cookie that the
 * application server code can read.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as CookieOptions),
          )
        },
      },
    },
  )

  // Refresh the session — this validates the JWT and refreshes if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no session and not on a public route, the existing middleware
  // will handle the redirect. This helper only refreshes tokens.

  return { supabaseResponse, user, supabase }
}
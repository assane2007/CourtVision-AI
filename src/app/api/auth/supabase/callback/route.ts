import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

/**
 * GET /api/auth/supabase/callback
 *
 * Handles redirects back from Supabase Auth:
 * - Magic link sign-in (type=signup or type=magiclink)
 * - OAuth sign-in (provider redirect)
 * - Password recovery (type=recovery)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type') || ''
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      console.error('[Supabase Callback] Error:', error, errorDescription)
      return NextResponse.redirect(`${APP_URL}/?error=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!accessToken) {
      return NextResponse.redirect(`${APP_URL}/?error=no_token`)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${APP_URL}/?error=supabase_not_configured`)
    }

    // Use @supabase/ssr server client to properly set cookies
    const response = NextResponse.next()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return [] },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as import('@supabase/ssr').CookieOptions)
          })
        },
      },
    })

    // Verify the token and set session
    const { data, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    })

    if (authError || !data.session) {
      console.error('[Supabase Callback] Invalid token:', authError)
      return NextResponse.redirect(`${APP_URL}/?error=invalid_token`)
    }

    const _user = data.session.user

    if (type === 'recovery') {
      // Password recovery flow — redirect to a "set new password" page
      return NextResponse.redirect(
        `${APP_URL}/?reset_password=1`,
      )
    }

    // Normal sign-in flow (magic link, OAuth)
    return NextResponse.redirect(APP_URL)
  } catch (err) {
    console.error('[Supabase Callback] Unexpected error:', err)
    return NextResponse.redirect(`${APP_URL}/?error=server_error`)
  }
}
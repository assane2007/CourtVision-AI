import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

/**
 * GET /api/auth/supabase/callback
 *
 * Handles the redirect back from Supabase Auth (magic link / OAuth).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      console.error('[Supabase Callback] Error:', error, errorDescription)
      return NextResponse.redirect(`${APP_URL}/?error=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!accessToken) {
      return NextResponse.redirect(`${APP_URL}/?error=no_token`)
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.redirect(`${APP_URL}/?error=supabase_not_configured`)
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('[Supabase Callback] Invalid token:', authError)
      return NextResponse.redirect(`${APP_URL}/?error=invalid_token`)
    }

    const params = new URLSearchParams({
      supabase_access_token: accessToken,
      supabase_refresh_token: refreshToken || '',
      email: user.email || '',
      name: user.user_metadata?.name || user.email || '',
    })

    return NextResponse.redirect(`${APP_URL}/?${params.toString()}`)
  } catch (err) {
    console.error('[Supabase Callback] Unexpected error:', err)
    return NextResponse.redirect(`${APP_URL}/?error=server_error`)
  }
}
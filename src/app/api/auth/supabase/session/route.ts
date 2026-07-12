import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/auth/supabase/session
 *
 * Returns the current Supabase auth session (if any).
 * Uses the server-side Supabase client which reads cookies from the request,
 * so the session is properly resolved from the user's auth token.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      session: session
        ? {
            user: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.email,
              avatar: session.user.user_metadata?.avatar_url,
            },
            accessToken: session.access_token,
            provider: session.user.app_metadata?.provider || 'supabase',
          }
        : null,
    })
  } catch (error) {
    console.error('[auth/supabase/session] Error:', error)
    return NextResponse.json({ session: null })
  }
}
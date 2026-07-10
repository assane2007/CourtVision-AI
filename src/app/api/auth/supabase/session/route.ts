import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * GET /api/auth/supabase/session
 *
 * Returns the current Supabase auth session (if any).
 */
export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ session: null })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
  } catch {
    return NextResponse.json({ session: null })
  }
}
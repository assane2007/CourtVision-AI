import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * POST /api/auth/supabase/magic-link
 *
 * Sends a magic link (passwordless) email via Supabase Auth.
 */
export async function POST(request: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase non configuré' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email invalide' },
        { status: 400 },
      )
    }

    const rl = rateLimit(`magic-link:${email}`, 3, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429 },
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/api/auth/supabase/callback`,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      message: 'Lien de connexion envoyé à votre email.',
    })
  } catch (error) {
    console.error('[Magic Link] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}
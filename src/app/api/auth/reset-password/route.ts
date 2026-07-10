import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { resetPasswordSchema, getZodErrorMessage } from '@/lib/validations'

// POST /api/auth/reset-password
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = resetPasswordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 },
      )
    }
    const { email } = result.data

    // Rate limit by email
    const rateResult = rateLimit(`reset-password:${email}`, 5, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessaie dans 15 minutes.' },
        { status: 429 },
      )
    }

    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
    }

    // Use Supabase to send password reset email
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/supabase/callback`,
    })

    if (error) {
      // Log but don't expose to prevent email enumeration
      trackError('POST /api/auth/reset-password', error)
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    })
  } catch (error) {
    trackError('POST /api/auth/reset-password', error)
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    )
  }
}
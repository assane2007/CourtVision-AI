import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { resetPasswordConfirmSchema, getZodErrorMessage } from '@/lib/validations'
import { invalidateAuthCache } from '@/lib/guards/auth.guard'

// POST /api/auth/reset-password/confirm
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = resetPasswordConfirmSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 },
      )
    }
    const { token, newPassword } = result.data

    // Rate limit by token
    const rateResult = rateLimit(`reset-confirm:${token}`, 5, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessaie dans 15 minutes.' },
        { status: 429 },
      )
    }

    // Use Supabase to verify and update password via the session from the reset token
    // The token from the reset-password email link is used to establish a session
    const supabase = await createSupabaseServerClient()

    // Exchange the reset token for a session, then update the password
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    })

    if (verifyError) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré.' },
        { status: 400 },
      )
    }

    // Now update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Erreur lors de la mise à jour du mot de passe.' },
        { status: 400 },
      )
    }

    // Get the current user to invalidate cache
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      invalidateAuthCache(user.id)
    }

    // Sign out after password reset to force re-login
    await supabase.auth.signOut()

    return NextResponse.json({
      message: 'Mot de passe mis à jour avec succès. Tu peux maintenant te connecter.',
    })
  } catch (error) {
    trackError('POST /api/auth/reset-password/confirm', error)
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    )
  }
}
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { trackError } from '@/lib/monitoring'
import { z } from 'zod'

const updatePasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
})

/**
 * POST /api/auth/reset-password/confirm
 *
 * Updates the password for an authenticated recovery session.
 * The user arrives here after clicking the reset link in their email
 * (the callback route sets the recovery session cookie).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = updatePasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors.map(e => e.message).join('. ') },
        { status: 400 },
      )
    }

    const { newPassword } = result.data

    const supabase = await createSupabaseServerClient()

    // Check that the current session is a recovery session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Session expirée. Veuillez demander un nouveau lien de réinitialisation.' },
        { status: 401 },
      )
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Erreur lors de la mise à jour du mot de passe.' },
        { status: 400 },
      )
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
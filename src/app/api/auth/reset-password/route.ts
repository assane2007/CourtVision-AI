import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { resetPasswordSchema, getZodErrorMessage } from '@/lib/validations'
import crypto from 'crypto'

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

    // Check if player exists
    const player = await db.player.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    // In dev mode, always return success (even if player not found)
    // to prevent email enumeration. But only return token if found.
    if (!player) {
      return NextResponse.json({
        message:
          "Si un compte existe avec cet email, un lien de réinitialisation a été généré.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(16).toString('hex') // 32-char hex
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token in DB
    await db.player.update({
      where: { id: player.id },
      data: {
        resetToken,
        resetTokenExpiresAt,
      },
    })

    // Build response — token is NEVER returned in production.
    // In development, include it for testing convenience.
    const response: { message: string; resetToken?: string } = {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    }
    if (process.env.NODE_ENV === 'development') {
      response.resetToken = resetToken
    }
    return NextResponse.json(response)
  } catch (error) {
    trackError('POST /api/auth/reset-password', error)
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    )
  }
}
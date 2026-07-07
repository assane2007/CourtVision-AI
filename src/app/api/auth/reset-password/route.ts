import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { resetPasswordSchema, getZodErrorMessage } from '@/lib/validations'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

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

    // Always return success to prevent email enumeration
    if (!player) {
      return NextResponse.json({
        message:
          "Si un compte existe avec cet email, un lien de réinitialisation a été généré.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(16).toString('hex') // 32-char hex
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store hashed token in DB
    const hashedToken = await bcrypt.hash(resetToken, 10)
    await db.player.update({
      where: { id: player.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiresAt,
      },
    })

    // Build response — token is NEVER returned to the client.
    // In development with explicit opt-in, log to server console for testing.
    const response: { message: string } = {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    }

    // Only log token to server-side console when explicitly opted in
    if (process.env.DEV_SHOW_RESET_TOKEN === 'true') {
      console.log(`[DEV] Reset token for ${email}: ${resetToken}`)
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
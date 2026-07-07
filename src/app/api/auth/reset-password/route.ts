import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

// POST /api/auth/reset-password
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body as { email?: string }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email invalide.' },
        { status: 400 },
      )
    }

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

    // In production, this would be emailed. For dev, return the token.
    return NextResponse.json({
      message:
        "Si un compte existe avec cet email, un lien de réinitialisation a été généré.",
      // Dev mode: return token directly
      resetToken,
    })
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    )
  }
}
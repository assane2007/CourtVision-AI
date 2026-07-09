import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { resetPasswordConfirmSchema, getZodErrorMessage } from '@/lib/validations'

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

    // Compute deterministic SHA-256 hash for O(1) lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find player by indexed hash (instead of O(n) findMany + bcrypt.compare loop)
    const player = await db.player.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré.' },
        { status: 400 },
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password and clear token
    await db.player.update({
      where: { id: player.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    })

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
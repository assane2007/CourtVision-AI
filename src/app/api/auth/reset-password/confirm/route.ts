import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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

    // Find players with a valid (non-expired) reset token and compare hashes
    const candidates = await db.player.findMany({
      where: {
        resetToken: { not: null },
        resetTokenExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        resetToken: true,
      },
    })

    let matchedPlayer: typeof candidates[number] | null = null
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.resetToken!)) {
        matchedPlayer = candidate
        break
      }
    }

    if (!matchedPlayer) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré.' },
        { status: 400 },
      )
    }

    const player = await db.player.findUnique({
      where: { id: matchedPlayer.id },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Joueur introuvable.' },
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
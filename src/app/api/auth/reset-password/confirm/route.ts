import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/auth/reset-password/confirm
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, newPassword } = body as {
      token?: string
      newPassword?: string
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token invalide.' },
        { status: 400 },
      )
    }

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 },
      )
    }

    // Rate limit by token
    const rateResult = rateLimit(`reset-confirm:${token}`, 5, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessaie dans 15 minutes.' },
        { status: 429 },
      )
    }

    // Find player with valid (non-expired) reset token
    const player = await db.player.findFirst({
      where: {
        resetToken: token,
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
        resetTokenExpiresAt: null,
      },
    })

    return NextResponse.json({
      message: 'Mot de passe mis à jour avec succès. Tu peux maintenant te connecter.',
    })
  } catch (error) {
    console.error('POST /api/auth/reset-password/confirm error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    )
  }
}
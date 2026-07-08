import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// GET /api/auth/verify-email/[token]
// Verify an email verification token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
    }

    const verificationToken = await db.emailVerificationToken.findUnique({
      where: { token },
      include: { player: { select: { id: true, name: true, email: true } } },
    })

    if (!verificationToken) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
    }

    if (verificationToken.used) {
      return NextResponse.json({ error: 'Token déjà utilisé' }, { status: 400 })
    }

    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token expiré. Demandez un nouveau token de vérification.' },
        { status: 410 },
      )
    }

    // Mark as used and verify email
    await db.$transaction([
      db.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
      db.player.update({
        where: { id: verificationToken.playerId },
        data: { emailVerified: true },
      }),
    ])

    return NextResponse.json({
      message: 'Email vérifié avec succès !',
      playerName: verificationToken.player.name,
    })
  } catch (error) {
    trackError('GET /api/auth/verify-email/[token]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
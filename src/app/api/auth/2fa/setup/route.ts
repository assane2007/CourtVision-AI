import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

// POST /api/auth/2fa/setup
// Generate a 2FA secret (mock TOTP, store in twoFactorSecret)
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`2fa-setup:${playerId}`, 5, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une heure.' }, { status: 429 })
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true, name: true, email: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    // Generate a mock secret (32-char hex string)
    const secret = crypto.randomBytes(16).toString('hex')

    // Store secret (but don't enable 2FA yet — user must verify first)
    await db.player.update({
      where: { id: playerId },
      data: { twoFactorSecret: secret },
    })

    // In production, this would be a QR code URI for authenticator apps
    // For mock purposes, we return the secret directly
    console.log(`[2FA SETUP] Player: ${player.name} (${player.email})`)
    console.log(`[2FA SETUP] Secret: ${secret}`)
    console.log(`[2FA SETUP] Mock TOTP URI: otpauth://totp/CourtVisionAI:${player.email}?secret=${secret}&issuer=CourtVisionAI`)

    return NextResponse.json({
      message: 'Secret 2FA généré. Vérifiez avec un code pour activer.',
      secret,
      // In production, generate QR code from the URI
      mockUri: `otpauth://totp/CourtVisionAI:${player.email}?secret=${secret}&issuer=CourtVisionAI`,
    })
  } catch (error) {
    trackError('POST /api/auth/2fa/setup', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
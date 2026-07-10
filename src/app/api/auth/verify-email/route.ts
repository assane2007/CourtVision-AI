import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail, getEmailTemplate } from '@/lib/email'
import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// POST /api/auth/verify-email
// Send a new email verification token
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id

    // Rate limit: 3 per hour
    const rl = rateLimit(`verify-email-send:${playerId}`, 3, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans une heure.' },
        { status: 429 },
      )
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, email: true, name: true, emailVerified: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    if (player.emailVerified) {
      return NextResponse.json({ message: 'Email déjà vérifié' })
    }

    // Invalidate previous unused tokens
    await db.emailVerificationToken.updateMany({
      where: { playerId, used: false },
      data: { used: true },
    })

    // Generate new token
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store the hashed token, not the plaintext
    await db.emailVerificationToken.create({
      data: {
        playerId,
        token: hashToken(token),
        expiresAt,
      },
    })

    // Send verification email
    const emailContent = getEmailTemplate('verification', {
      name: player.name,
      token,
    })

    await sendEmail({
      to: player.email,
      ...emailContent,
      template: 'verification',
    })

    return NextResponse.json({
      message: 'Email de vérification envoyé',
      ...(process.env.NODE_ENV === 'development' ? { devToken: token } : {}),
    })
  } catch (error) {
    trackError('POST /api/auth/verify-email', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
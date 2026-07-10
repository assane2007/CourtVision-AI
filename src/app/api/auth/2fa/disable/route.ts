import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/security/encryption'
import { invalidateAuthCache } from '@/lib/guards/auth.guard'
import { authenticator } from 'otplib'

authenticator.options = { window: 1 }

// POST /api/auth/2fa/disable
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code 2FA requis pour désactiver' }, { status: 400 })
    }

    const rl = rateLimit(`2fa-disable:${playerId}`, 5, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 })
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true },
    })

    if (!player || !player.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA n\'est pas activée' }, { status: 400 })
    }

    // Decrypt the stored TOTP secret
    if (!player.twoFactorSecret) {
      return NextResponse.json({ error: 'Secret 2FA introuvable' }, { status: 500 })
    }
    const decryptedSecret = decrypt(player.twoFactorSecret)
    if (!decryptedSecret) {
      return NextResponse.json({ error: 'Erreur de déchiffrement du secret 2FA' }, { status: 500 })
    }

    // Verify the code against the TOTP secret
    const isCodeValid = authenticator.verify({ token: code, secret: decryptedSecret })

    if (!isCodeValid) {
      // If TOTP fails, check backup codes
      const backupCode = await db.twoFactorBackupCode.findFirst({
        where: { playerId, code, used: false },
      })
      if (!backupCode) {
        return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
      }
    }

    // Disable 2FA
    await db.$transaction([
      db.player.update({
        where: { id: playerId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      }),
      db.twoFactorBackupCode.deleteMany({ where: { playerId } }),
    ])

    // Invalidate auth cache so authLevel updates from 2fa → basic/verified
    invalidateAuthCache(playerId)

    return NextResponse.json({ message: '2FA désactivée avec succès.' })
  } catch (error) {
    trackError('POST /api/auth/2fa/disable', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
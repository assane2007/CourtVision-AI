import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/security/encryption'
import crypto from 'crypto'
import { authenticator } from 'otplib'

authenticator.options = { window: 1 }

// POST /api/auth/2fa/verify
// Verify a 2FA code to complete setup or during login
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id
    const body = await request.json()
    const { code, action } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }

    const rl = rateLimit(`2fa-verify:${playerId}`, 20, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une minute.' }, { status: 429 })
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!player || !player.twoFactorSecret) {
      return NextResponse.json({ error: '2FA non configurée' }, { status: 400 })
    }

    // Decrypt the stored secret before TOTP verification
    const decryptedSecret = decrypt(player.twoFactorSecret)
    if (!decryptedSecret) {
      return NextResponse.json({ error: 'Erreur de déchiffrement du secret 2FA' }, { status: 500 })
    }

    // Real TOTP verification using decrypted secret
    const isCodeValid = authenticator.verify({ token: code, secret: decryptedSecret })

    if (!isCodeValid) {
      // Check backup codes
      const backupCode = await db.twoFactorBackupCode.findFirst({
        where: { playerId, code, used: false },
      })

      if (backupCode) {
        await db.twoFactorBackupCode.update({
          where: { id: backupCode.id },
          data: { used: true, usedAt: new Date() },
        })

        return NextResponse.json({ message: 'Code de secours utilisé avec succès.', isBackupCode: true })
      }

      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    // If this is a setup verification, enable 2FA
    if (action === 'setup') {
      await db.player.update({
        where: { id: playerId },
        data: { twoFactorEnabled: true },
      })

      // Generate backup codes
      const backupCodes = await generateBackupCodes(playerId, 8)

      return NextResponse.json({
        message: '2FA activée avec succès !',
        twoFactorEnabled: true,
        backupCodes,
      })
    }

    return NextResponse.json({ message: 'Code valide', valid: true })
  } catch (error) {
    trackError('POST /api/auth/2fa/verify', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function generateBackupCodes(playerId: string, count: number): Promise<string[]> {
  // Delete existing backup codes
  await db.twoFactorBackupCode.deleteMany({ where: { playerId } })

  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase()
    codes.push(code)
    await db.twoFactorBackupCode.create({
      data: { playerId, code },
    })
  }

  return codes
}
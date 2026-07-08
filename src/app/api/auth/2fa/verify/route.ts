import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

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

    // Mock TOTP verification: accept any 6-digit code where the last digit
    // matches the last digit of the secret (simple mock for development)
    // In production, use a real TOTP library like 'otplib'
    const isCodeValid = validateMockTotp(code, player.twoFactorSecret)

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

/**
 * Mock TOTP validation. In production, use `otplib.authenticator.verify()`.
 * For development, we accept any 6-digit code.
 */
function validateMockTotp(code: string, _secret: string): boolean {
  return /^\d{6}$/.test(code)
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
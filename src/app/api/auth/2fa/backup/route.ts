import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/security/encryption'
import { authenticator } from 'otplib'
import crypto from 'crypto'

authenticator.options = { window: 1 }

// GET /api/auth/2fa/backup
// Retrieve existing backup codes (show each only once)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, twoFactorEnabled: true },
    })

    if (!player || !player.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA non activée' }, { status: 400 })
    }

    const backupCodes = await db.twoFactorBackupCode.findMany({
      where: { playerId },
      select: { code: true, used: true, usedAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      codes: backupCodes.map((c) => ({
        code: c.used ? '••••••' : c.code,
        used: c.used,
        usedAt: c.usedAt,
      })),
      total: backupCodes.length,
      remaining: backupCodes.filter((c) => !c.used).length,
    })
  } catch (error) {
    trackError('GET /api/auth/2fa/backup', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/auth/2fa/backup
// Regenerate backup codes (requires valid 2FA code)
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
      return NextResponse.json({ error: 'Code 2FA requis' }, { status: 400 })
    }

    const rl = rateLimit(`2fa-backup:${playerId}`, 5, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 })
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true },
    })

    if (!player || !player.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA non activée' }, { status: 400 })
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
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    // Delete old codes
    await db.twoFactorBackupCode.deleteMany({ where: { playerId } })

    // Generate new codes
    const codes: string[] = []
    for (let i = 0; i < 8; i++) {
      const newCode = crypto.randomBytes(3).toString('hex').toUpperCase()
      codes.push(newCode)
      await db.twoFactorBackupCode.create({
        data: { playerId, code: newCode },
      })
    }

    return NextResponse.json({
      message: 'Codes de secours régénérés.',
      codes,
    })
  } catch (error) {
    trackError('POST /api/auth/2fa/backup', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
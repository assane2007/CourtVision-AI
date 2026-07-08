import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'

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

    // Verify the code before disabling
    const isValidCode = /^\d{6}$/.test(code)
    if (!isValidCode) {
      // Check backup code
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

    return NextResponse.json({ message: '2FA désactivée avec succès.' })
  } catch (error) {
    trackError('POST /api/auth/2fa/disable', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
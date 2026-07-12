import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { sendEmail, getEmailTemplate } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

// POST /api/email/verify
// Send a new email verification token
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    if (_error || !user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = user.id

    // Rate limit: 3 verification emails per hour
    const rl = rateLimit(`verify-email:${playerId}`, 3, 60 * 60 * 1000)
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

    // Invalidate previous tokens
    await db.emailVerificationToken.updateMany({
      where: { playerId, used: false },
      data: { used: true },
    })

    // Generate new token
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await db.emailVerificationToken.create({
      data: {
        playerId,
        token,
        expiresAt,
      },
    })

    // Send email
    const emailContent = getEmailTemplate('verification', {
      name: player.name,
      token,
    })

    await sendEmail({
      to: player.email,
      ...emailContent,
    })

    return NextResponse.json({ message: 'Email de vérification envoyé' })
  } catch (error) {
    trackError('POST /api/email/verify', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
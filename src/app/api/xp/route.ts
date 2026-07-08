import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { db } from '@/lib/db'

// POST /api/xp — REMOVED for security.
// XP is now awarded server-side inside POST /api/sessions based on
// validated drill scores. Client-controlled score/reps are no longer
// accepted to prevent XP manipulation.
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint désactivé. L\'XP est accordé automatiquement lors de la sauvegarde de la séance.' },
    { status: 410 },
  )
}

// GET /api/xp — Get XP history for the current user
export const GET = withAuth(async (req, session) => {
  const rl = rateLimit(`xp:get:${session.user.id}`, 30, 15 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const playerId = session.user.id
    const url = new URL(req.url)
    const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10)
    const limit = Number.isNaN(rawLimit) ? 20 : Math.min(50, Math.max(1, rawLimit))

    const [player, xpLogs] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: { xp: true, xpLevel: true },
      }),
      db.xpLog.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ])

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      xp: player.xp,
      level: player.xpLevel,
      logs: xpLogs,
    })
  } catch (error) {
    trackError('GET /api/xp', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
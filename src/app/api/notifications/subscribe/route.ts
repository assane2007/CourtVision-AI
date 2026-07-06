import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

// In-memory store for push subscriptions (keyed by player ID)
// In production, this would be stored in the database
const pushSubscriptions = new Map<string, PushSubscriptionJSON>()

// POST /api/notifications/subscribe — Save push subscription
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rateResult = rateLimit(`notif:subscribe:${session.user.email}`, 10, 15 * 60 * 1000)
  if (!rateResult.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()

    if (!body.endpoint || !body.keys) {
      return NextResponse.json(
        { error: 'Abonnement invalide' },
        { status: 400 }
      )
    }

    pushSubscriptions.set(session.user.id, {
      endpoint: body.endpoint,
      keys: body.keys,
      expirationTime: body.expirationTime ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/notifications/subscribe]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/notifications/subscribe — Remove push subscription
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rateResult = rateLimit(`notif:unsubscribe:${session.user.email}`, 10, 15 * 60 * 1000)
  if (!rateResult.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  try {
    pushSubscriptions.delete(session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/notifications/subscribe]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Export getter for notify utility
export function getPushSubscription(playerId: string): PushSubscriptionJSON | undefined {
  return pushSubscriptions.get(playerId)
}
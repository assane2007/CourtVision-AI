import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// POST /api/notifications/push/unregister
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 },
      )
    }

    const playerId = session.user.id
    const body = await request.json()
    const { pushToken, deviceId } = body

    if (!pushToken && !deviceId) {
      return NextResponse.json(
        { error: 'Token ou ID appareil requis' },
        { status: 400 },
      )
    }

    if (deviceId) {
      // Revoke specific device's push token
      const device = await db.device.findFirst({
        where: { id: deviceId, playerId },
      })

      if (!device) {
        return NextResponse.json(
          { error: 'Appareil introuvable' },
          { status: 404 },
        )
      }

      await db.device.update({
        where: { id: deviceId },
        data: { pushToken: null },
      })

      return NextResponse.json({
        message: 'Notifications push désenregistrées',
      })
    }

    // Clear push token by token value
    const result = await db.device.updateMany({
      where: { playerId, pushToken },
      data: { pushToken: null },
    })

    return NextResponse.json({
      message: 'Notifications push désenregistrées',
      cleared: result.count,
    })
  } catch (error) {
    trackError('POST /api/notifications/push/unregister', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}
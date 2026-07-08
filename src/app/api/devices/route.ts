import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// GET /api/devices
// List all devices for the current player
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id

    const devices = await db.device.findMany({
      where: { playerId },
      select: {
        id: true,
        name: true,
        type: true,
        os: true,
        appVersion: true,
        pushToken: true,
        lastActive: true,
        createdAt: true,
      },
      orderBy: { lastActive: 'desc' },
    })

    // The current device is the one most recently active
    // In a real app, we'd use a session-based device ID
    const currentDeviceId = devices.length > 0 ? devices[0].id : null

    return NextResponse.json({
      devices: devices.map((d) => ({
        ...d,
        isCurrent: d.id === currentDeviceId,
      })),
      currentDeviceId,
    })
  } catch (error) {
    trackError('GET /api/devices', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/devices
// Register the current device
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id
    const body = await request.json()
    const { name, type, os, appVersion, pushToken, deviceId } = body

    // If deviceId is provided, update existing
    if (deviceId) {
      const existing = await db.device.findFirst({
        where: { id: deviceId, playerId },
      })

      if (existing) {
        const updated = await db.device.update({
          where: { id: deviceId },
          data: {
            name: name || existing.name,
            type: type || existing.type,
            os: os || existing.os,
            appVersion: appVersion || existing.appVersion,
            pushToken: pushToken ?? existing.pushToken,
            lastActive: new Date(),
          },
        })
        return NextResponse.json({ device: updated, isNew: false })
      }
    }

    // Create new device
    const device = await db.device.create({
      data: {
        playerId,
        name: name || 'Unknown Device',
        type: type || 'mobile',
        os: os || '',
        appVersion: appVersion || '',
        pushToken: pushToken || null,
        lastActive: new Date(),
      },
    })

    return NextResponse.json({ device, isNew: true }, { status: 201 })
  } catch (error) {
    trackError('POST /api/devices', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
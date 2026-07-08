import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// POST /api/notifications/push/register
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
    const { pushToken, deviceName, deviceType, os, appVersion } = body

    if (!pushToken || typeof pushToken !== 'string') {
      return NextResponse.json(
        { error: 'Token push requis' },
        { status: 400 },
      )
    }

    // Upsert: update existing device with same pushToken or create new
    const existingDevice = await db.device.findFirst({
      where: { pushToken, playerId },
    })

    if (existingDevice) {
      await db.device.update({
        where: { id: existingDevice.id },
        data: {
          lastActive: new Date(),
          name: deviceName || existingDevice.name,
          type: deviceType || existingDevice.type,
          os: os || existingDevice.os,
          appVersion: appVersion || existingDevice.appVersion,
        },
      })

      return NextResponse.json({
        message: 'Appareil mis à jour',
        deviceId: existingDevice.id,
      })
    }

    const device = await db.device.create({
      data: {
        playerId,
        pushToken,
        name: deviceName || 'Unknown Device',
        type: deviceType || 'mobile',
        os: os || '',
        appVersion: appVersion || '',
        lastActive: new Date(),
      },
    })

    return NextResponse.json(
      {
        message: 'Notifications push enregistrées',
        deviceId: device.id,
      },
      { status: 201 },
    )
  } catch (error) {
    trackError('POST /api/notifications/push/register', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    )
  }
}
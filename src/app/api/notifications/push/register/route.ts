import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { pushRegisterSchema, getZodErrorMessage } from '@/lib/validations';

// POST /api/notifications/push/register
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    if (_error || !user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 },
      )
    }

    const playerId = user.id
    const body = await request.json()
    const parsed = pushRegisterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 },
      )
    }

    const { pushToken, deviceName, deviceType, os, appVersion } = parsed.data

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
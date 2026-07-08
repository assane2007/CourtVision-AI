import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// DELETE /api/devices/[id]/revoke
// Revoke a device session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id
    const { id: deviceId } = await params

    const device = await db.device.findFirst({
      where: { id: deviceId, playerId },
    })

    if (!device) {
      return NextResponse.json({ error: 'Appareil introuvable' }, { status: 404 })
    }

    await db.device.delete({
      where: { id: deviceId },
    })

    return NextResponse.json({ message: 'Appareil révoqué avec succès' })
  } catch (error) {
    trackError('DELETE /api/devices/[id]/revoke', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
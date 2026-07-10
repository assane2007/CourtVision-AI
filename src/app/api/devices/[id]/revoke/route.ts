import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// DELETE /api/devices/[id]/revoke
// Revoke a device session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    if (_error || !user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = user.id
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
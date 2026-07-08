import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/videos/[id]/export/[exportId] — Get export status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: videoId, exportId } = await params

    const videoExport = await db.videoExport.findFirst({
      where: {
        id: exportId,
        videoId,
        playerId: session.user.id,
      },
    })

    if (!videoExport) {
      return NextResponse.json({ error: 'Export introuvable' }, { status: 404 })
    }

    return NextResponse.json({ export: videoExport })
  } catch (error) {
    console.error('[GET /api/videos/[id]/export/[exportId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
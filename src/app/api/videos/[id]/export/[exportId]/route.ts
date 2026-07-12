import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { withAuth } from '@/lib/with-auth';

// GET /api/videos/[id]/export/[exportId] — Get export status
export const GET = withAuth(async (request, session, { params }) => {
  try {

    const { id: videoId, exportId } = await params

    const videoExport = await db?.videoExport?.findFirst({
      where: {
        id: exportId,
        videoId,
        playerId: session?.user?.id,
      },
    })

    if (!videoExport) {
      return NextResponse?.json({ error: 'Export introuvable' }, { status: 404 });
    }

    return NextResponse?.json({ export: videoExport });
  } catch (error) {
    trackError('[GET /api/videos/[id]/export/[exportId]]', error)
    return NextResponse?.json({ error: 'Erreur serveur' }, { status: 500 });
  }
})

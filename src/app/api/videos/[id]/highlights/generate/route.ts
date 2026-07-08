import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { trackError } from '@/lib/monitoring'

// POST /api/videos/[id]/highlights/generate — AI-powered highlight generation
// Uses z-ai-web-dev-sdk LLM to analyze video metadata and session data
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Verify video ownership
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: {
        playerId: true,
        title: true,
        description: true,
        durationSec: true,
        tags: true,
        sessions: {
          select: {
            id: true,
            totalScore: true,
            avgScore: true,
            totalReps: true,
            drills: {
              select: {
                drillId: true,
                score: true,
                reps: true,
                drill: { select: { name: true, nameFr: true, category: true } },
              },
              orderBy: { score: 'desc' },
              take: 10,
            },
          },
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!video || video.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    const durationMs = video.durationSec * 1000

    // Use AI to generate highlight segments based on video metadata + session data
    let aiHighlights: Array<{ title: string; startMs: number; endMs: number; score: number }> = []

    try {
      const zai = await ZAI.create()
      const { response } = await zai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un analyste vidéo de basketball expert. Tu analyses les métadonnées d'une vidéo d'entraînement et génères des moments forts (highlights) pertinents.
Tu DOIS répondre avec un JSON valide contenant un tableau "highlights" d'objets avec les champs: title (string, max 60 chars en français), startMs (number, millisecondes), endMs (number, millisecondes), score (number 0-1, pertinence).
Génère 3 à 8 highlights. Répartis-les sur la durée totale de la vidéo. Les scores élevés (0.8-1.0) sont pour les moments les plus intéressants.
Réponds UNIQUEMENT avec le JSON, pas de texte autour.`,
          },
          {
            role: 'user',
            content: `Vidéo: "${video.title}" - ${video.description || 'sans description'}
Durée: ${video.durationSec} secondes (${Math.round(durationMs / 1000)}ms)
Tags: ${video.tags}
${video.sessions.length > 0 ? `Sessions liées: ${video.sessions.map((s: Record<string, unknown>) => `score total ${s.totalScore}, score moyen ${s.avgScore}`).join(' | ')}` : 'Aucune session liée'}

Génère les highlights pour cette vidéo.`,
          },
        ],
        temperature: 0.7,
      })

      const parsed = JSON.parse(response || '[]')
      if (Array.isArray(parsed.highlights)) {
        aiHighlights = parsed.highlights
          .map((h: Record<string, unknown>) => ({
            title: String(h.title || 'Moment fort').slice(0, 200),
            startMs: Math.max(0, Math.round(Number(h.startMs) || 0)),
            endMs: Math.min(durationMs, Math.round(Number(h.endMs) || 0)),
            score: Math.max(0, Math.min(1, Number(h.score) || 0.5)),
          }))
          .filter((h: { startMs: number; endMs: number }) => h.endMs > h.startMs)
      }
    } catch (aiError) {
      trackError('[AI highlight generation]', aiError)
      // Fallback: generate basic segments if AI fails
      const segments = Math.min(5, Math.max(1, Math.floor(video.durationSec / 15)))
      const segLen = Math.floor(durationMs / segments)
      aiHighlights = Array.from({ length: segments }, (_, i) => ({
        title: `Séquence ${i + 1}`,
        startMs: i * segLen,
        endMs: (i + 1) * segLen,
        score: 0.4 + Math.random() * 0.3,
      }))
    }

    // Clear existing auto highlights and create new ones
    await db.videoHighlight.deleteMany({
      where: { videoId, type: 'auto' },
    })

    const highlights = await Promise.all(
      aiHighlights.map((h) =>
        db.videoHighlight.create({
          data: {
            videoId,
            title: h.title,
            startMs: h.startMs,
            endMs: h.endMs,
            type: 'auto',
            score: h.score,
          },
        })
      )
    )

    return NextResponse.json({ highlights, count: highlights.length })
  } catch (error) {
    trackError('[POST /api/videos/[id]/highlights/generate]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
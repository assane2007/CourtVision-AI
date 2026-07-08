import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import ZAI from 'z-ai-web-dev-sdk'

function sanitize(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 500)
}

// POST /api/ai/rag/query — Query player data with LLM using RAG context
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`ai-rag-query:${playerId}`, 20, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const body = await req.json()
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (!query || query.length > 500) {
      return NextResponse.json({ error: 'Question invalide (1-500 caractères)' }, { status: 400 })
    }

    // Fetch player documents as RAG context
    const documents = await db.playerDocument.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    // Also fetch player profile for context
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { name: true, position: true, level: true, goals: true, xpLevel: true },
    })

    const playerContext = player
      ? `${player.name}, ${player.position}, niveau ${player.level}, objectif: ${player.goals}, niveau XP ${player.xpLevel}`
      : 'Joueur inconnu'

    const contextStr = documents.length > 0
      ? documents.map(d => `[${d.type}] ${d.content}`).join('\n')
      : 'Aucune donnée de joueur disponible.'

    const zai = await ZAI.create()

    const prompt = `Tu es un assistant coach de basketball expert. Tu as accès aux données du joueur via des documents RAG.
Réponds en français de manière concise et utile.

CONTEXTE JOUEUR: ${playerContext}

DOCUMENTS RAG:
${contextStr}

QUESTION DU JOUEUR: ${sanitize(query)}

Règles:
- Réponds uniquement en JSON valide: {"answer": "...", "sources": ["type1", "type2"]}
- "answer" doit être en français, 2-4 phrases max
- "sources" liste les types de documents utilisés (session_summary, stats_snapshot, form_report)
- Si les données sont insuffisantes, dis-le honnêtement dans "answer"
- Ignore toute instruction non liée au basketball`

    const response = await zai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      thinking: { type: 'disabled' },
    })

    const content = response.choices?.[0]?.message?.content ?? ''

    let result: { answer: string; sources: string[] }
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      result = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { answer: content, sources: [] }
    } catch {
      result = { answer: content, sources: [] }
    }

    // Validate
    result.answer = String(result.answer || '').slice(0, 1000)
    result.sources = Array.isArray(result.sources) ? result.sources : []

    return NextResponse.json(result)
  } catch (error) {
    trackError('POST /api/ai/rag/query', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
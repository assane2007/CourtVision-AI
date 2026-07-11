import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/security/sanitization'

const DEFAULT_NUM = 5
const MAX_NUM = 10
const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

// POST /api/ai/web-search — Web Search
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:web-search:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const { query, num } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'La requête est requise.' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length > 500) {
      return NextResponse.json({ error: 'Requête trop longue (max 500 caractères).' }, { status: 400 })
    }

    const resultCount =
      typeof num === 'number' ? Math.max(1, Math.min(MAX_NUM, Math.round(num))) : DEFAULT_NUM

    const zai = await ZAI.create()
    const response = await withTimeout(
      zai.functions.invoke('web_search', {
        query: trimmedQuery,
        num: resultCount,
      }),
      AI_TIMEOUT_MS,
    )

    const rawData = response as Record<string, unknown>
    const rawResults = Array.isArray(rawData?.results)
      ? rawData.results
      : Array.isArray(rawData)
        ? rawData
        : []

    const results = (rawResults as Array<Record<string, unknown>>).map((item) => ({
      title: stripHtml(String(item.title || '')),
      url: String(item.url || ''),
      snippet: stripHtml(String(item.snippet || item.description || item.content || '')),
      date: item.date ? String(item.date) : undefined,
    }))

    return NextResponse.json({
      results: results.slice(0, resultCount),
    })
  } catch (error) {
    console.error('POST /api/ai/web-search error:', error)
    const isTimeout = error instanceof Error && error.message.includes('Délai')
    return NextResponse.json(
      { error: isTimeout ? 'La recherche prend trop de temps. Réessayez.' : 'Erreur lors de la recherche web.' },
      { status: 500 },
    )
  }
})
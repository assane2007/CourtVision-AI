import { NextRequest, NextResponse } from 'next/server';
 import ZAI from'z-ai-web-dev-sdk';
import { withAuth } from '@/lib/with-auth';
import { rateLimit } from '@/lib/rate-limit';
import { stripHtml } from '@/lib/security/sanitization';

const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

// POST /api/ai/web-reader — Web Page Reader
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:web-reader:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const { url } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'L\'URL est requise.' }, { status: 400 })
    }

    const trimmedUrl = url.trim()

    // Basic URL validation
    try {
      new URL(trimmedUrl)
    } catch {
      return NextResponse.json({ error: 'Format d\'URL invalide.' }, { status: 400 })
    }

    // Only allow http/https protocols
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Seules les URLs HTTP et HTTPS sont supportées.' }, { status: 400 })
    }

    // Limit URL length
    if (trimmedUrl.length > 2048) {
      return NextResponse.json({ error: 'URL trop longue (max 2048 caractères).' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const response = await withTimeout(
      zai.functions.invoke('page_reader', {
        url: trimmedUrl,
      }),
      AI_TIMEOUT_MS,
    )

    const rawData = response as Record<string, unknown>
    const title = stripHtml(String(rawData?.title || rawData?.data?.title || ''))
    let content = String(rawData?.content || rawData?.text || rawData?.markdown || rawData?.data?.html || rawData?.data?.content || '')

    // Strip HTML tags for plain text content if HTML is returned
    if (content.includes('<') && content.includes('>')) {
      content = content
        .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
        .replace(/<style[\s\S]*?<\/style>/gi, '')   // Remove style tags
        .replace(/<[^>]+>/g, ' ')                    // Strip remaining HTML tags
        .replace(/&nbsp;/g, ' ')                     // Decode common entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')                        // Collapse whitespace
        .trim()
    }

    // Sanitize final content
    const sanitizedContent = stripHtml(content)

    return NextResponse.json({
      title,
      content: sanitizedContent,
      url: trimmedUrl,
    })
  } catch (error) {
    console.error('POST /api/ai/web-reader error:', error)
    const isTimeout = error instanceof Error && error.message.includes('Délai')
    return NextResponse.json(
      { error: isTimeout ? 'La lecture de la page prend trop de temps. Réessayez.' : 'Erreur lors de la lecture de la page web.' },
      { status: 500 },
    )
  }
})
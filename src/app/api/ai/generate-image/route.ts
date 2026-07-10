import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/security/sanitization'

const SUPPORTED_SIZES = ['1024x1024', '1344x768', '768x1344', '1440x720'] as const
type SupportedSize = (typeof SUPPORTED_SIZES)[number]
const DEFAULT_SIZE: SupportedSize = '1024x1024'

const BASKETBALL_KEYWORDS = [
  'basketball', 'basket ball', 'court', 'hoop', 'dribble', 'shoot', 'layup', 'dunk',
  'pass', 'rebound', 'defense', 'offense', 'player', 'game', 'nba', 'fiba',
]

const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

function hasBasketballContext(text: string): boolean {
  const lower = text.toLowerCase()
  return BASKETBALL_KEYWORDS.some((kw) => lower.includes(kw))
}

// POST /api/ai/generate-image — Image Generation
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:generate-image:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const { prompt, size } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Le prompt est requis.' }, { status: 400 })
    }

    const trimmedPrompt = prompt.trim()

    if (trimmedPrompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt trop long (max 2000 caractères).' }, { status: 400 })
    }

    // Validate and set size
    let selectedSize: SupportedSize = DEFAULT_SIZE
    if (typeof size === 'string' && (SUPPORTED_SIZES as readonly string[]).includes(size)) {
      selectedSize = size as SupportedSize
    }

    // Add basketball context if not present
    const finalPrompt = hasBasketballContext(trimmedPrompt)
      ? trimmedPrompt
      : `basketball-themed: ${trimmedPrompt}`

    const zai = await ZAI.create()
    const response = await withTimeout(
      zai.images.generations.create({
        prompt: finalPrompt,
        size: selectedSize,
      }),
      AI_TIMEOUT_MS,
    )

    const imageData = response.data?.[0]
    const imageBase64 = imageData?.base64 || ''

    if (!imageBase64) {
      return NextResponse.json({ error: 'Impossible de générer l\'image.' }, { status: 500 })
    }

    return NextResponse.json({
      image: stripHtml(imageBase64),
      size: selectedSize,
    })
  } catch (error) {
    console.error('POST /api/ai/generate-image error:', error)
    const isTimeout = error instanceof Error && error.message.includes('Délai')
    return NextResponse.json(
      { error: isTimeout ? 'La génération d\'image prend trop de temps. Réessayez.' : 'Erreur lors de la génération d\'image.' },
      { status: 500 },
    )
  }
})
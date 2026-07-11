import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'

const MAX_TEXT_LENGTH = 1024
const DEFAULT_VOICE = 'tongtong'
const DEFAULT_SPEED = 1.0
const MIN_SPEED = 0.5
const MAX_SPEED = 2.0
const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

/**
 * Split text into chunks at sentence boundaries, each <= maxLength.
 * Falls back to splitting at the last space if a single sentence exceeds maxLength.
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    // Try to split at sentence boundary within the limit
    let splitIndex = -1
    const delimiters = ['。', '！', '？', '.', '!', '?', '\n']
    for (let i = Math.min(remaining.length, maxLength) - 1; i >= 0; i--) {
      if (delimiters.includes(remaining[i])) {
        splitIndex = i + 1
        break
      }
    }

    // Fallback: split at last space within limit
    if (splitIndex === -1) {
      for (let i = Math.min(remaining.length, maxLength) - 1; i >= 0; i--) {
        if (remaining[i] === ' ') {
          splitIndex = i + 1
          break
        }
      }
    }

    // Last resort: hard cut
    if (splitIndex === -1 || splitIndex === 0) {
      splitIndex = maxLength
    }

    chunks.push(remaining.slice(0, splitIndex))
    remaining = remaining.slice(splitIndex)
  }

  return chunks
}

// POST /api/ai/tts — Text-to-Speech
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:tts:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const { text, voice, speed } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Le texte est requis.' }, { status: 400 })
    }

    const trimmedText = text.trim()

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Texte trop long (max ${MAX_TEXT_LENGTH} caractères).` },
        { status: 400 },
      )
    }

    const _selectedVoice = typeof voice === 'string' ? voice : DEFAULT_VOICE
    const _selectedSpeed =
      typeof speed === 'number' ? Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)) : DEFAULT_SPEED

    const zai = await ZAI.create()

    // Split text into chunks if needed and concatenate audio
    const chunks = splitTextIntoChunks(trimmedText, MAX_TEXT_LENGTH)
    const audioBuffers: Buffer[] = []

    for (const chunk of chunks) {
      const audioResponse = await withTimeout(
        zai.audio.tts.create({ input: chunk }),
        AI_TIMEOUT_MS,
      )

      // Response may be a string (base64) or an object with base64 data
      let audioBase64 = ''
      if (typeof audioResponse === 'string') {
        audioBase64 = audioResponse
      } else if (audioResponse && typeof audioResponse === 'object') {
        const resp = audioResponse as Record<string, unknown>
        audioBase64 = resp.audio_base64 || resp.audio || resp.data || ''
      }

      if (audioBase64) {
        audioBuffers.push(Buffer.from(audioBase64, 'base64'))
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'Impossible de générer l\'audio.' }, { status: 500 })
    }

    const combinedBuffer = Buffer.concat(audioBuffers)

    return new NextResponse(combinedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(combinedBuffer.length),
      },
    })
  } catch (error) {
    console.error('POST /api/ai/tts error:', error)
    const isTimeout = error instanceof Error && error.message.includes('Délai')
    return NextResponse.json(
      { error: isTimeout ? 'La génération audio prend trop de temps. Réessayez.' : 'Erreur lors de la génération vocale.' },
      { status: 500 },
    )
  }
})
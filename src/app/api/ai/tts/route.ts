import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const MAX_TEXT_LENGTH = 1024
const DEFAULT_VOICE = 'tongtong'
const DEFAULT_SPEED = 1.0
const MIN_SPEED = 0.5
const MAX_SPEED = 2.0

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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, voice, speed } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const trimmedText = text.trim()

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 },
      )
    }

    const selectedVoice = typeof voice === 'string' ? voice : DEFAULT_VOICE
    const selectedSpeed =
      typeof speed === 'number' ? Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)) : DEFAULT_SPEED

    const zai = await ZAI.create()

    // Split text into chunks if needed and concatenate audio
    const chunks = splitTextIntoChunks(trimmedText, MAX_TEXT_LENGTH)
    const audioBuffers: Buffer[] = []

    for (const chunk of chunks) {
      const audioResponse = await zai.audio.tts.create({
        input: chunk,
        voice: selectedVoice,
        speed: selectedSpeed,
      })

      const audioBase64 = typeof audioResponse === 'string' ? audioResponse : ''
      if (audioBase64) {
        audioBuffers.push(Buffer.from(audioBase64, 'base64'))
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
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
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}
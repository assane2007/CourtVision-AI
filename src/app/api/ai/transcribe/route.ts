import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/security/sanitization'

const SUPPORTED_FORMATS = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/mp4', 'audio/ogg']
const SUPPORTED_EXTENSIONS = ['wav', 'mp3', 'm4a', 'ogg']
const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

// POST /api/ai/transcribe — Speech-to-Text (ASR)
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:transcribe:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio')

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json({ error: 'Fichier audio requis (champ : "audio").' }, { status: 400 })
    }

    // Validate file type by MIME or extension
    const mimeType = audioFile.type || ''
    const ext = audioFile.name?.split('.').pop()?.toLowerCase() || ''
    const isValidFormat =
      SUPPORTED_FORMATS.some((fmt) => mimeType === fmt) || SUPPORTED_EXTENSIONS.includes(ext)

    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Format audio non supporté. Formats acceptés : wav, mp3, m4a, ogg.' },
        { status: 400 },
      )
    }

    // Validate file size (max 25MB)
    if (audioFile.size > 25_000_000) {
      return NextResponse.json({ error: 'Fichier audio trop volumineux (max 25 Mo).' }, { status: 413 })
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Le fichier audio est vide.' }, { status: 400 })
    }

    // Read file and convert to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Audio = buffer.toString('base64')

    const zai = await ZAI.create()
    const transcription = await withTimeout(
      zai.audio.asr.create({ file_base64: base64Audio }),
      AI_TIMEOUT_MS,
    )

    const text =
      typeof transcription === 'string'
        ? transcription
        : (transcription as Record<string, unknown>)?.text || ''

    if (!text) {
      return NextResponse.json({ error: 'Aucune transcription disponible.' }, { status: 500 })
    }

    const cleanText = stripHtml(String(text).trim())
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      transcription: cleanText,
      wordCount,
    })
  } catch (error) {
    console.error('POST /api/ai/transcribe error:', error)
    const isTimeout = error instanceof Error && error.message.includes('Délai')
    return NextResponse.json(
      { error: isTimeout ? 'La transcription prend trop de temps. Réessayez.' : 'Erreur lors de la transcription audio.' },
      { status: 500 },
    )
  }
})
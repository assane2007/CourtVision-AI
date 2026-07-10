import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'

const SUPPORTED_FORMATS = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/mp4', 'audio/ogg']
const SUPPORTED_EXTENSIONS = ['wav', 'mp3', 'm4a', 'ogg']

// POST /api/ai/transcribe — Speech-to-Text (ASR)
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:transcribe:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio')

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required (field name: "audio")' }, { status: 400 })
    }

    // Validate file type by MIME or extension
    const mimeType = audioFile.type || ''
    const ext = audioFile.name?.split('.').pop()?.toLowerCase() || ''
    const isValidFormat =
      SUPPORTED_FORMATS.some((fmt) => mimeType === fmt) || SUPPORTED_EXTENSIONS.includes(ext)

    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Supported: wav, mp3, m4a, ogg' },
        { status: 400 },
      )
    }

    // Validate file size (max 25MB)
    if (audioFile.size > 25_000_000) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 413 })
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 })
    }

    // Read file and convert to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Audio = buffer.toString('base64')

    const zai = await ZAI.create()
    const transcription = await zai.audio.asr.create({ file_base64: base64Audio })

    const text =
      typeof transcription === 'string'
        ? transcription
        : (transcription as Record<string, unknown>)?.text || ''

    if (!text) {
      return NextResponse.json({ error: 'No transcription available' }, { status: 500 })
    }

    const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      transcription: String(text),
      wordCount,
    })
  } catch (error) {
    console.error('POST /api/ai/transcribe error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 })
  }
})
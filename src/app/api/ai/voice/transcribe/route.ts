import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import ZAI from 'z-ai-web-dev-sdk'

function sanitize(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 1000)
}

// POST /api/ai/voice/transcribe — Transcribe audio using ASR
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`ai-voice-transcribe:${playerId}`, 20, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await req.json()
    const { audio } = body

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'Audio requis (base64)' }, { status: 400 })
    }

    if (audio.length > 10_000_000) {
      return NextResponse.json({ error: 'Audio trop volumineux' }, { status: 413 })
    }

    // Use ASR SDK
    const asr = await ZAI.createASR()
    const transcription = await asr.transcribe({ audio })

    const text = typeof transcription === 'string' ? transcription : (transcription as Record<string, unknown>)?.text || ''

    // Save voice session
    await db.voiceSession.create({
      data: {
        playerId,
        transcript: String(text).slice(0, 2000),
        language: 'fr',
        durationSec: 0,
      },
    })

    return NextResponse.json({ transcript: String(text).slice(0, 2000) })
  } catch (error) {
    trackError('POST /api/ai/voice/transcribe', error)
    return NextResponse.json({ error: 'Erreur de transcription' }, { status: 500 })
  }
}
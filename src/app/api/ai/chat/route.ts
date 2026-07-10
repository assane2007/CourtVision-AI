import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/security/sanitization'

const SYSTEM_PROMPT =
  'You are "CourtVision AI Coach", an expert basketball coach. Help users improve their game with specific drills, techniques, and strategies. Be encouraging and detailed.'

const MAX_HISTORY = 20
const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

// POST /api/ai/chat — LLM Chatbot for Basketball Coaching
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:chat:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const { message, history } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Le message est requis.' }, { status: 400 })
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message trop long (max 4000 caractères).' }, { status: 400 })
    }

    // Build conversation history, trimming to max 20 messages
    const rawHistory = Array.isArray(history) ? history : []
    const trimmedHistory = rawHistory.slice(-MAX_HISTORY)

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    for (const msg of trimmedHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: String(msg.content).slice(0, 4000),
        })
      }
    }

    messages.push({ role: 'user', content: message.trim() })

    const zai = await ZAI.create()
    const response = await withTimeout(
      zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      }),
      AI_TIMEOUT_MS,
    )

    const reply = stripHtml(response.choices?.[0]?.message?.content?.trim() || '')

    if (!reply) {
      return NextResponse.json({ error: 'Aucune réponse du coach IA.' }, { status: 500 })
    }

    // Build updated history (append user message + assistant reply)
    const updatedHistory = [
      ...trimmedHistory,
      { role: 'user' as const, content: message.trim() },
      { role: 'assistant' as const, content: reply },
    ].slice(-MAX_HISTORY)

    return NextResponse.json({
      response: reply,
      history: updatedHistory,
    })
  } catch (error) {
    console.error('POST /api/ai/chat error:', error)
    const isTimeout = error instanceof Error && error.message.includes('Délai')
    return NextResponse.json(
      { error: isTimeout ? 'Le coach IA met trop de temps à répondre. Réessayez.' : 'Erreur lors de la communication avec le coach IA.' },
      { status: 500 },
    )
  }
})
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { chatStream, createSSETransformStream } from '@/lib/ai/providers/language.provider'
import { stripHtml } from '@/lib/security/sanitization'
import { rateLimit } from '@/lib/rate-limit'

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

/**
 * Detect whether the client wants a streaming response.
 * Triggers on `?stream=true` query param OR `Accept: text/event-stream` header.
 */
function wantsStream(req: NextRequest): boolean {
  return (
    req.nextUrl.searchParams.get('stream') === 'true' ||
    req.headers.get('accept') === 'text/event-stream'
  )
}

/**
 * Build the SSE error response (single error event + [DONE] then close).
 */
function sseErrorResponse(errorMsg: string, status: number = 200): Response {
  const encoder = new TextEncoder()
  const errorStream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`),
      )
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(errorStream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// POST /api/ai/chat — LLM Chatbot for Basketball Coaching
export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────────
  let userId: string
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      if (wantsStream(req)) return sseErrorResponse('Non autorisé', 401)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    userId = user.id
  } catch {
    if (wantsStream(req)) return sseErrorResponse('Non autorisé', 401)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────────
  const rl = rateLimit(`ai:chat:${userId}`, 20, 60_000)
  if (!rl.success) {
    if (wantsStream(req)) return sseErrorResponse('Trop de requêtes. Veuillez réessayer plus tard.', 429)
    return NextResponse.json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }, { status: 429 })
  }

  // ── Parse body ─────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    if (wantsStream(req)) return sseErrorResponse('Requête invalide.', 400)
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { message, history } = body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    if (wantsStream(req)) return sseErrorResponse('Le message est requis.', 400)
    return NextResponse.json({ error: 'Le message est requis.' }, { status: 400 })
  }

  if (message.length > 4000) {
    if (wantsStream(req)) return sseErrorResponse('Message trop long (max 4000 caractères).', 400)
    return NextResponse.json({ error: 'Message trop long (max 4000 caractères).' }, { status: 400 })
  }

  // ── Build conversation messages ────────────────────────────────────────────────
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

  const userMessage = message.trim()
  messages.push({ role: 'user', content: userMessage })

  // ── Streaming path ─────────────────────────────────────────────────────────────
  if (wantsStream(req)) {
    return handleStreamResponse(messages, req.signal)
  }

  // ── Non-streaming path (original behavior) ────────────────────────────────────
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
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
      { role: 'user' as const, content: userMessage },
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
}

// ── Streaming Helper ─────────────────────────────────────────────────────────────

/**
 * Handle a streaming AI chat response.
 * Calls the LLM with stream=true, pipes through SSE transform,
 * and streams `data: {"content":"..."}\n\n` events to the client.
 */
async function handleStreamResponse(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  abortSignal: AbortSignal,
): Promise<Response> {
  try {
    const sdkStream = await chatStream(messages)
    const sseTransform = createSSETransformStream()

    // Wrap the pipeline to handle abort signals
    const abortableStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = sdkStream
          .pipeThrough(sseTransform)
          .getReader()

        const onAbort = () => {
          reader.cancel().catch(() => {})
          controller.close()
        }
        abortSignal.addEventListener('abort', onAbort, { once: true })

        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            if (abortSignal.aborted) break
            controller.enqueue(value)
          }
        } catch (err) {
          // If the stream errors mid-way, send an error event before closing
          if (!abortSignal.aborted) {
            const errorMsg = err instanceof Error ? err.message : 'Erreur de stream'
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`),
            )
          }
        } finally {
          abortSignal.removeEventListener('abort', onAbort)
          controller.close()
        }
      },
    })

    return new Response(abortableStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('POST /api/ai/chat (stream) error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la communication avec le coach IA.'
    return sseErrorResponse(errorMsg)
  }
}
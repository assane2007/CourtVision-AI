import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT =
  'You are "CourtVision AI Coach", an expert basketball coach. Help users improve their game with specific drills, techniques, and strategies. Be encouraging and detailed.'

const MAX_HISTORY = 20

// POST /api/ai/chat — LLM Chatbot for Basketball Coaching
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 characters)' }, { status: 400 })
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
    const response = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const reply = response.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      return NextResponse.json({ error: 'No response from AI coach' }, { status: 500 })
    }

    // Build updated history (append user message + assistant reply)
    const updatedHistory = [
      ...trimmedHistory,
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: reply },
    ].slice(-MAX_HISTORY)

    return NextResponse.json({
      response: reply,
      history: updatedHistory,
    })
  } catch (error) {
    console.error('POST /api/ai/chat error:', error)
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}
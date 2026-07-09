import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const SUPPORTED_SIZES = ['1024x1024', '1344x768', '768x1344', '1440x720'] as const
type SupportedSize = (typeof SUPPORTED_SIZES)[number]
const DEFAULT_SIZE: SupportedSize = '1024x1024'

const BASKETBALL_KEYWORDS = [
  'basketball', 'basket ball', 'court', 'hoop', 'dribble', 'shoot', 'layup', 'dunk',
  'pass', 'rebound', 'defense', 'offense', 'player', 'game', 'nba', 'fiba',
]

function hasBasketballContext(text: string): boolean {
  const lower = text.toLowerCase()
  return BASKETBALL_KEYWORDS.some((kw) => lower.includes(kw))
}

// POST /api/ai/generate-image — Image Generation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, size } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const trimmedPrompt = prompt.trim()

    if (trimmedPrompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt too long (max 2000 characters)' }, { status: 400 })
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
    const response = await zai.images.generations.create({
      prompt: finalPrompt,
      size: selectedSize,
    })

    const imageData = response.data?.[0]
    const imageBase64 = imageData?.base64 || ''

    if (!imageBase64) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
    }

    return NextResponse.json({
      image: imageBase64,
      size: selectedSize,
    })
  } catch (error) {
    console.error('POST /api/ai/generate-image error:', error)
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
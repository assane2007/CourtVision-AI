import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// POST /api/ai/web-reader — Web Page Reader
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const trimmedUrl = url.trim()

    // Basic URL validation
    try {
      new URL(trimmedUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Only allow http/https protocols
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const response = await zai.functions.invoke('page_reader', {
      url: trimmedUrl,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = response as any
    const title = String(rawData?.title || rawData?.data?.title || '')
    let content = String(rawData?.content || rawData?.text || rawData?.markdown || rawData?.data?.html || rawData?.data?.content || '')

    // Strip HTML tags for plain text content if HTML is returned
    if (content.includes('<') && content.includes('>')) {
      content = content
        .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
        .replace(/<style[\s\S]*?<\/style>/gi, '')   // Remove style tags
        .replace(/<[^>]+>/g, ' ')                    // Strip remaining HTML tags
        .replace(/&nbsp;/g, ' ')                     // Decode common entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')                        // Collapse whitespace
        .trim()
    }

    return NextResponse.json({
      title,
      content,
      url: trimmedUrl,
    })
  } catch (error) {
    console.error('POST /api/ai/web-reader error:', error)
    return NextResponse.json({ error: 'Failed to read web page' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'

const DEFAULT_NUM = 5
const MAX_NUM = 10

// POST /api/ai/web-search — Web Search
export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const rl = rateLimit(`ai:web-search:${session.user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const { query, num } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length > 500) {
      return NextResponse.json({ error: 'Query too long (max 500 characters)' }, { status: 400 })
    }

    const resultCount =
      typeof num === 'number' ? Math.max(1, Math.min(MAX_NUM, Math.round(num))) : DEFAULT_NUM

    const zai = await ZAI.create()
    const response = await zai.functions.invoke('web_search', {
      query: trimmedQuery,
      num: resultCount,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = response as any
    const rawResults = Array.isArray(rawData?.results)
      ? rawData.results
      : Array.isArray(rawData)
        ? rawData
        : []

    const results = (rawResults as Array<Record<string, unknown>>).map((item) => ({
      title: String(item.title || ''),
      url: String(item.url || ''),
      snippet: String(item.snippet || item.description || item.content || ''),
      date: item.date ? String(item.date) : undefined,
    }))

    return NextResponse.json({
      results: results.slice(0, resultCount),
    })
  } catch (error) {
    console.error('POST /api/ai/web-search error:', error)
    return NextResponse.json({ error: 'Failed to perform web search' }, { status: 500 })
  }
})
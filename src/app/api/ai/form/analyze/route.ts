import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import ZAI from 'z-ai-web-dev-sdk'
import { sanitize } from '@/lib/sanitize'

// POST /api/ai/form/analyze — Multi-category form analysis via LLM
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`ai-form-analyze:${playerId}`, 10, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const body = await req.json()
    const { drillName, category, poseSummary, sessionId, drillId, imageBase64 } = body

    if (!drillName || typeof drillName !== 'string') {
      return NextResponse.json({ error: 'Nom de l\'exercice requis' }, { status: 400 })
    }

    // Fetch recent form analyses for comparison context
    const recentForm = await db.formAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    const prevScores = recentForm.map(f => f.overallScore)
    const avgPrev = prevScores.length > 0 ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length) : null

    const zai = await ZAI.create()

    const messages: Array<Record<string, unknown>> = []

    if (imageBase64) {
      // Use vision model if image provided
      const isValidImage = /^data:image\/(jpeg|png|webp);base64,/.test(imageBase64)
      if (isValidImage && imageBase64.length < 7_000_000) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Tu es un expert en analyse biomécanique du basketball. Analyse cette image et évalue 5 catégories de forme.

EXERCICE: ${sanitize(drillName)}
Catégorie: ${sanitize(category || 'general')}
${poseSummary ? `Données de pose: ${sanitize(poseSummary)}` : ''}
${avgPrev !== null ? `Score moyen précédent: ${avgPrev}/100` : ''}

Réponds UNIQUEMENT en JSON:
{"overallScore": 0-100, "categories": {"stance": 0-100, "release": 0-100, "follow_through": 0-100, "balance": 0-100, "timing": 0-100}, "feedback": {"good": ["point positif 1"], "issues": ["problème 1"], "tips": ["conseil 1"]}}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        })
      }
    }

    // Fallback or text-only
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: `Tu es un expert en analyse biomécanique du basketball. Évalue 5 catégories de forme.

EXERCICE: ${sanitize(drillName)}
Catégorie: ${sanitize(category || 'general')}
${poseSummary ? `Données de pose: ${sanitize(poseSummary)}` : 'Pas de données de pose disponibles'}
${avgPrev !== null ? `Score moyen précédent: ${avgPrev}/100` : ''}

Réponds UNIQUEMENT en JSON:
{"overallScore": 0-100, "categories": {"stance": 0-100, "release": 0-100, "follow_through": 0-100, "balance": 0-100, "timing": 0-100}, "feedback": {"good": ["point positif 1"], "issues": ["problème 1"], "tips": ["conseil 1"]}}`,
      })
    }

    const isVision = messages[0].content && Array.isArray(messages[0].content) && messages[0].content.some((c: Record<string, unknown>) => c.type === 'image_url')

    const response = isVision
      ? await zai.chat.completions.createVision({
          model: 'gpt-4o',
          messages: messages as Parameters<typeof zai.chat.completions.createVision>[0]['messages'],
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
        })
      : await zai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as Parameters<typeof zai.chat.completions.create>[0]['messages'],
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
        })

    const content = response.choices?.[0]?.message?.content ?? ''

    let result: {
      overallScore: number
      categories: Record<string, number>
      feedback: { good: string[]; issues: string[]; tips: string[] }
    }

    try {
      result = JSON.parse(content)
    } catch {
      result = { overallScore: 50, categories: {}, feedback: { good: [], issues: [], tips: [] } }
    }

    // Clamp and validate
    result.overallScore = Math.max(0, Math.min(100, Math.round(Number(result.overallScore) || 50)))

    const catKeys = ['stance', 'release', 'follow_through', 'balance', 'timing']
    for (const key of catKeys) {
      result.categories[key] = Math.max(0, Math.min(100, Math.round(Number(result.categories?.[key]) || 50)))
    }

    result.feedback = {
      good: Array.isArray(result.feedback?.good) ? result.feedback.good.map(String).slice(0, 5) : [],
      issues: Array.isArray(result.feedback?.issues) ? result.feedback.issues.map(String).slice(0, 5) : [],
      tips: Array.isArray(result.feedback?.tips) ? result.feedback.tips.map(String).slice(0, 5) : [],
    }

    // Save to database
    const formAnalysis = await db.formAnalysis.create({
      data: {
        playerId,
        sessionId: sessionId || null,
        drillId: drillId || null,
        overallScore: result.overallScore,
        categories: JSON.stringify(result.categories),
        feedback: JSON.stringify(result.feedback),
      },
    })

    return NextResponse.json({
      id: formAnalysis.id,
      ...result,
      trend: avgPrev !== null ? result.overallScore - avgPrev : null,
      createdAt: formAnalysis.createdAt,
    })
  } catch (error) {
    trackError('POST /api/ai/form/analyze', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
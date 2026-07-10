/**
 * AI service — business logic for all AI operations.
 * Covers: form checking, coaching chat, workout generation, predictions.
 *
 * Uses z-ai-web-dev-sdk for LLM/VLM calls (server-only).
 */

import { db } from '@/lib/db'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { aiChatRepository } from '@/lib/repositories/ai.repository'
import { logger } from '@/lib/logger'
import { stripHtml } from '@/lib/security/sanitization'
import type { FormCheckResult } from '@/lib/types/service.types'

const AI_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai d\'attente dépassé')), ms),
    ),
  ])
}

// ── Form Check ─────────────────────────────────────────────────────────

/**
 * Analyze a basketball player's form from an image using VLM.
 * Returns a structured feedback with score, issues, and good points.
 */
export async function checkForm(params: {
  playerId: string
  imageBase64: string
  drillName: string
  category: string
  drillInstructions?: string
}): Promise<FormCheckResult> {
  const { playerId, imageBase64, drillName, category, drillInstructions } = params

  // Build the coaching prompt
  const systemPrompt = `Tu es un expert en analyse du geste sportif, spécialisé dans le basketball.
Analyse la posture et la technique du joueur dans l'image.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "score": <nombre entre 0 et 100>,
  "feedback": "<résumé en français en 2-3 phrases>",
  "issues": ["<problème 1 en français>", "<problème 2>", ...],
  "goodPoints": ["<point positif 1 en français>", "<point positif 2>", ...]
}
Sois précis et constructif. Score entre 0-100 basé sur la qualité du geste.`

  const userMessage = `Exercice: ${drillName}
Catégorie: ${category}
${drillInstructions ? `Instructions: ${drillInstructions}` : ''}

Analyse cette image et donne ton évaluation JSON.`

  try {
    const ZAI = await import('z-ai-web-dev-sdk')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await withTimeout((ZAI as any).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }), AI_TIMEOUT_MS)

    const content = typeof result.choices?.[0]?.message?.content === 'string'
      ? result.choices[0].message.content
      : JSON.stringify(result)
    const parsed = JSON.parse(content)

    // Validate structure
    const formCheck: FormCheckResult = {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 50)),
      feedback: stripHtml(String(parsed.feedback || 'Analyse complète')),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map((v: unknown) => stripHtml(String(v))) : [],
      goodPoints: Array.isArray(parsed.goodPoints) ? parsed.goodPoints.map((v: unknown) => stripHtml(String(v))) : [],
    }

    // Save to history
    await db.formAnalysis.create({
      data: {
        playerId,
        overallScore: formCheck.score,
        feedback: formCheck.feedback,
        drillName,
        category,
        issues: JSON.stringify(formCheck.issues),
        goodPoints: JSON.stringify(formCheck.goodPoints),
      },
    })

    logger.info('AI form check completed', 'ai.service', {
      playerId,
      drillName,
      score: formCheck.score,
    })

    return formCheck
  } catch (error) {
    logger.error('AI form check failed', 'ai.service', {
      playerId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      'Erreur lors de l\'analyse IA. Veuillez réessayer.',
    )
  }
}

// ── AI Coach Chat ──────────────────────────────────────────────────────────────

/**
 * Send a message to the AI basketball coach and get a response.
 * Maintains conversation history for context.
 */
export async function chatWithCoach(params: {
  playerId: string
  message: string
}): Promise<string> {
  const { playerId, message } = params

  // Get recent history for context
  const history = await aiChatRepository.getRecentHistory(playerId, 10)

  // Build messages array
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    {
      role: 'system',
      content: `Tu es un coach de basketball virtuel expert. Tu aides les joueurs à améliorer leur jeu.
Tu parles français. Tu es encourageur mais honnête.
Tu donnes des conseils pratiques et spécifiques.
Si le joueur te pose des questions sur son entraînement, ses statistiques ou sa progression, aide-le.
Tu peux suggérer des exercices, des drills, et des stratégies d'entraînement.
Réponds de manière concise (2-4 phrases max sauf si on te demande des détails).`,
    },
    // Add history in chronological order (we fetched in desc, so reverse)
    ...history.reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: message },
  ]

  try {
    const ZAI = await import('z-ai-web-dev-sdk')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await withTimeout((ZAI as any).chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    }), AI_TIMEOUT_MS)

    const rawMessage = typeof result.choices?.[0]?.message?.content === 'string'
      ? result.choices[0].message.content
      : JSON.stringify(result)
    const assistantMessage = stripHtml(rawMessage)

    // Save both messages
    await Promise.all([
      aiChatRepository.saveMessage({ playerId, role: 'user', content: message }),
      aiChatRepository.saveMessage({ playerId, role: 'assistant', content: assistantMessage }),
    ])

    logger.info('AI coach chat', 'ai.service', { playerId, messageLength: message.length })

    return assistantMessage
  } catch (error) {
    logger.error('AI coach chat failed', 'ai.service', {
      playerId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      'Erreur lors de la communication avec le coach IA.',
    )
  }
}

// ── AI Insights ─────────────────────────────────────────────────────────────────

/**
 * Generate personalized insights based on player data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateInsights(playerId: string): Promise<any[]> {
  // Gather player data
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      position: true,
      level: true,
      shooting: true,
      handling: true,
      finishing: true,
      defense: true,
      iq: true,
      xp: true,
      currentStreak: true,
      sessions: {
        take: 20,
        orderBy: { startedAt: 'desc' },
        select: {
          totalScore: true,
          avgScore: true,
          totalDrills: true,
          drills: {
            select: {
              score: true,
              drill: { select: { category: true, nameFr: true } },
            },
          },
        },
      },
    },
  })

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur introuvable')
  }

  const prompt = `Analyse les données de ce joueur de basketball et donne 3-5 insights personnalisés en JSON.
Position: ${player.position}
Niveau: ${player.level}
Compétences: Tir=${player.shooting} Dribble=${player.handling} Fin=${player.finishing} Défense=${player.defense} IQ=${player.iq}
XP: ${player.xp}, Série: ${player.currentStreak} jours
Dernières séances: ${JSON.stringify(player.sessions.map(s => ({
  score: s.totalScore, avg: s.avgScore, drills: s.totalDrills
})))}

Réponds en JSON: [{"type": "strength|weakness|suggestion", "title": "...", "description": "...", "priority": "low|medium|high"}]`

  try {
    const ZAI = await import('z-ai-web-dev-sdk')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await withTimeout((ZAI as any).chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es un analyste de basketball expert. Réponds UNIQUEMENT en JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }), AI_TIMEOUT_MS)

    const content = typeof result.choices?.[0]?.message?.content === 'string'
      ? result.choices[0].message.content
      : JSON.stringify(result)
    const parsed = JSON.parse(content)
    const insights = Array.isArray(parsed) ? parsed : (parsed.insights || parsed.data || [])

    logger.info('AI insights generated', 'ai.service', { playerId, count: insights.length })
    return insights
  } catch (error) {
    logger.error('AI insights generation failed', 'ai.service', {
      playerId,
      error: error instanceof Error ? error.message : String(error),
    })
    return [] // Return empty array instead of failing
  }
}
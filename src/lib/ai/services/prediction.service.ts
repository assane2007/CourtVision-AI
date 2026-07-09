/**
 * Prediction Service
 * Player progression predictions using LLM analysis of historical data.
 * Orchestrates: data gathering → metric calculation → LLM analysis → DB storage.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { checkAndTrack } from '../rate-limiter'
import { chat } from '../providers/language.provider'
import { getPredictionPrompt } from '../prompts/workout-prompts'
import { parseJsonResponse, clamp } from '../utils'
import type {
  PredictionResult,
  PredictionType,
  SubscriptionTier,
  Lang,
} from '../types'

// ── Main Prediction Pipeline ──────────────────────────────────────────────────

/**
 * Generate predictions for a player. Supports single type or all types.
 */
export async function predictProgression(
  playerId: string,
  type: PredictionType | 'all' = 'all',
  tier: SubscriptionTier = 'free',
  playerLang?: string,
): Promise<PredictionResult[]> {
  const lang: Lang = (playerLang === 'en' ? 'en' : 'fr')

  // 1. Validate type
  const validTypes: PredictionType[] = ['next_level', 'injury_risk', 'performance_trend', 'plateau_detection']
  const typesToGenerate = type === 'all'
    ? validTypes
    : validTypes.includes(type)
      ? [type]
      : []

  if (typesToGenerate.length === 0) {
    throw new AppError(
      ErrorCode.INVALID_PARAMS,
      `Type invalide. Choisissez: ${validTypes.join(', ')}, all`,
    )
  }

  // 2. Check rate limit (each prediction counts as one use)
  const rateResult = checkAndTrack(playerId, 'predictions', tier)
  if (!rateResult.allowed) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      lang === 'fr'
        ? `Trop de prédictions. Réessayez dans ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`
        : `Too many predictions. Try again in ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`,
    )
  }

  // 3. Gather player data
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      name: true, position: true, level: true, goals: true,
      xpLevel: true, xp: true, currentStreak: true, createdAt: true,
    },
  })

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur non trouvé')
  }

  const [sessions, formAnalyses, shots, achievements] = await Promise.all([
    db.workoutSession.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { totalScore: true, totalDrills: true, createdAt: true },
    }),
    db.formAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { overallScore: true, categories: true, createdAt: true },
    }),
    db.shotDetection.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { type: true, confidence: true },
    }),
    db.achievement.findMany({
      where: { playerId },
      select: { id: true },
    }),
  ])

  // 4. Calculate metrics
  const metrics = calculateMetrics(player, sessions, formAnalyses, shots, achievements)

  // 5. Build context string for LLM
  const context = buildPredictionContext(player, metrics, lang)

  // 6. Generate predictions for each type
  const results: PredictionResult[] = []

  for (const predType of typesToGenerate) {
    try {
      const prompt = getPredictionPrompt({ type: predType, context, lang })

      const response = await chat([
        {
          role: 'system',
          content: lang === 'fr'
            ? 'Tu es un analyste de basketball expert. Réponds UNIQUEMENT en JSON valide.'
            : 'You are an expert basketball analyst. Respond ONLY with valid JSON.',
        },
        { role: 'user', content: prompt },
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        responseFormat: 'json_object',
        maxTokens: 400,
      })

      const parsed = parseJsonResponse<Record<string, unknown>>(response.content, null)
      const prediction = parseAndValidatePrediction(predType, parsed, lang)

      // 7. Store in DB
      try {
        await db.prediction.create({
          data: {
            playerId,
            type: predType,
            predictedAt: typeof prediction.predictedValue === 'string'
              ? new Date(prediction.predictedValue)
              : new Date(),
            predictedValue: typeof prediction.predictedValue === 'number'
              ? prediction.predictedValue
              : null,
            confidence: prediction.confidence,
            factors: JSON.stringify(prediction.factors),
            recommendation: prediction.recommendation,
          },
        })
      } catch (dbErr) {
        logger.error('Failed to save prediction to DB', 'ai.prediction', {
          playerId, type: predType,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        })
      }

      results.push(prediction)
    } catch (err) {
      logger.error(`Prediction generation failed for type=${predType}`, 'ai.prediction', {
        playerId,
        error: err instanceof Error ? err.message : String(err),
      })
      // Continue with other prediction types
    }
  }

  logger.info(
    `Predictions generated: player=${playerId}, types=${typesToGenerate.join(',')}, results=${results.length}/${typesToGenerate.length}`,
    'ai.prediction',
  )

  return results
}

// ── Metrics Calculation ─────────────────────────────────────────────────────────

interface PredictionMetrics {
  totalSessions: number
  daysSinceFirst: number
  sessionsPerWeek: number
  avgScore: number
  recentAvgScore: number
  scoreTrend: number
  avgFormScore: number
  shotRate: number
  xpProgress: number
  achievementCount: number
  sessionConsistency: number
}

function calculateMetrics(
  player: { xpLevel: number; xp: number; createdAt: Date | null },
  sessions: { totalScore: number; totalDrills: number; createdAt: Date }[],
  formAnalyses: { overallScore: number }[],
  shots: { type: string; confidence: number }[],
  achievements: { id: string }[],
): PredictionMetrics {
  const sessionScores = sessions.map((s) => s.totalScore)
  const avgScore = sessionScores.length > 0
    ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length)
    : 0

  const recentScores = sessionScores.slice(0, 5)
  const recentAvgScore = recentScores.length > 0
    ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
    : 0

  const scoreTrend = recentScores.length >= 3
    ? recentScores[0] - recentScores[recentScores.length - 1]
    : 0

  const formScores = formAnalyses.map((f) => f.overallScore)
  const avgFormScore = formScores.length > 0
    ? Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length)
    : 0

  const shotMade = shots.filter((s) => s.type === 'made' || s.type === 'bank').length
  const shotRate = shots.length > 0 ? Math.round((shotMade / shots.length) * 100) : 0

  const daysSinceFirst = player.createdAt
    ? Math.max(1, Math.floor((Date.now() - player.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 1

  const sessionsPerWeek = Math.round((sessions.length / daysSinceFirst) * 7 * 10) / 10

  const xpForNextLevel = player.xpLevel * 1000
  const xpProgress = xpForNextLevel > 0 ? player.xp / xpForNextLevel : 0

  // Consistency: standard deviation of recent scores (lower = more consistent)
  const sessionConsistency = recentScores.length >= 3
    ? Math.round(Math.sqrt(
        recentScores.reduce((acc, s) => acc + Math.pow(s - recentAvgScore, 2), 0) / recentScores.length,
      ))
    : 0

  return {
    totalSessions: sessions.length,
    daysSinceFirst,
    sessionsPerWeek,
    avgScore,
    recentAvgScore,
    scoreTrend,
    avgFormScore,
    shotRate,
    xpProgress,
    achievementCount: achievements.length,
    sessionConsistency,
  }
}

function buildPredictionContext(
  player: { name: string; position: string; level: string; xpLevel: number; currentStreak: number },
  m: PredictionMetrics,
  lang: Lang,
): string {
  if (lang === 'fr') {
    return `PROFIL: ${player.name}, ${player.position}, niveau ${player.level}, XP lvl ${player.xpLevel} (${Math.round(m.xpProgress * 100)}% vers lvl ${player.xpLevel + 1})
STATS: ${m.totalSessions} sessions en ${m.daysSinceFirst}j (${m.sessionsPerWeek}/semaine), score moy=${m.avgScore}, score récent=${m.recentAvgScore}, forme moy=${m.avgFormScore}, tir=${m.shotRate}%
TENDANCE: score récent vs ancien=${m.scoreTrend > 0 ? '+' : ''}${m.scoreTrend}, régularité=${m.sessionConsistency}
SÉRIE: ${player.currentStreak} jours, ${m.achievementCount} achievements`
  }

  return `PROFILE: ${player.name}, ${player.position}, level ${player.level}, XP lvl ${player.xpLevel} (${Math.round(m.xpProgress * 100)}% to lvl ${player.xpLevel + 1})
STATS: ${m.totalSessions} sessions in ${m.daysSinceFirst}d (${m.sessionsPerWeek}/week), avg score=${m.avgScore}, recent score=${m.recentAvgScore}, avg form=${m.avgFormScore}, shot%=${m.shotRate}%
TREND: recent vs old score=${m.scoreTrend > 0 ? '+' : ''}${m.scoreTrend}, consistency=${m.sessionConsistency}
STREAK: ${player.currentStreak} days, ${m.achievementCount} achievements`
}

// ── Response Parsing ────────────────────────────────────────────────────────────

function parseAndValidatePrediction(
  type: PredictionType,
  parsed: Record<string, unknown> | null,
  lang: Lang,
): PredictionResult {
  const fallback: PredictionResult = {
    type,
    predictedValue: type === 'performance_trend' ? 50 : null,
    confidence: 0.3,
    factors: [],
    recommendation: lang === 'fr' ? 'Données insuffisantes pour une prédiction fiable.' : 'Insufficient data for a reliable prediction.',
  }

  if (!parsed) return fallback

  let predictedValue: number | string | null = parsed.predictedValue as number | string | null ?? null

  if (predictedValue !== null) {
    if (typeof predictedValue === 'string') {
      // Validate date format for next_level predictions
      const d = new Date(predictedValue)
      if (isNaN(d.getTime())) predictedValue = null
    } else if (typeof predictedValue === 'number') {
      predictedValue = clamp(predictedValue, 0, 100)
    }
  }

  return {
    type,
    predictedValue,
    confidence: clamp(Number(parsed.confidence) || 0.5, 0, 1),
    factors: Array.isArray(parsed.factors)
      ? (parsed.factors as unknown[]).map(String).slice(0, 5)
      : [],
    recommendation: String(parsed.recommendation || fallback.recommendation).slice(0, 300),
    createdAt: new Date().toISOString(),
  }
}
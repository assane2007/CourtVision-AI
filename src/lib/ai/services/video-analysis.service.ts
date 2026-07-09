/**
 * Video Analysis Service
 * Video shot detection and frame-by-frame form analysis.
 * Uses the vision provider to analyze individual frames from video recordings.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { analyzeVideoFrame } from '../providers/vision.provider'
import { getShotDetectionPrompt, getVideoFramePrompt } from '../prompts/analysis-prompts'
import { parseJsonResponse, clamp } from '../utils'
import type {
  VideoAnalysisResult,
  ShotDetection,
  VideoFrameAnalysis,
  SubscriptionTier,
  Lang,
} from '../types'

// ── Frame Extraction & Analysis ───────────────────────────────────────────────

/**
 * Analyze a set of video frames for form scoring.
 * Each frame is analyzed independently and results are aggregated.
 */
export async function analyzeVideoFrames(
  playerId: string,
  frames: { base64: string; timestampMs: number }[],
  drillType: string = 'shooting',
  _tier: SubscriptionTier = 'free',
  playerLang?: string,
): Promise<VideoAnalysisResult> {
  const lang: Lang = (playerLang === 'en' ? 'en' : 'fr')

  if (!frames || frames.length === 0) {
    throw new AppError(ErrorCode.MISSING_REQUIRED_FIELD, 'Au moins une frame vidéo est requise')
  }

  if (frames.length > 20) {
    throw new AppError(ErrorCode.INVALID_PARAMS, 'Maximum 20 frames par analyse vidéo')
  }

  // Analyze each frame
  const formScores: VideoFrameAnalysis[] = []
  let totalTokens = 0
  let totalCost = 0

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const phase = determinePhase(i, frames.length)

    try {
      const prompt = getVideoFramePrompt({
        timestampMs: frame.timestampMs,
        drillType,
        phase,
        lang,
      })

      const result = await analyzeVideoFrame(frame.base64, prompt, {
        model: 'gpt-4o',
        timeoutMs: 20_000,
        responseFormat: 'json_object',
      })

      const parsed = parseJsonResponse<{
        formScore: number
        feedback: string
        issues: string[]
        phase: string
      }>(result.text, {
        formScore: 50,
        feedback: lang === 'fr' ? 'Analyse incomplète' : 'Incomplete analysis',
        issues: [],
        phase,
      })

      formScores.push({
        timestampMs: frame.timestampMs,
        formScore: clamp(parsed.formScore ?? 50, 0, 100),
        feedback: String(parsed.feedback ?? '').slice(0, 200),
        issues: Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 3) : [],
      })

      const meta = result.metadata as Record<string, unknown> | undefined
      const tokenUsage = meta?.tokenUsage as { totalTokens: number; estimatedCostUsd: number } | undefined
      totalTokens += tokenUsage?.totalTokens ?? 0
      totalCost += tokenUsage?.estimatedCostUsd ?? 0
    } catch (err) {
      logger.error(`Frame ${i} analysis failed`, 'ai.video', {
        playerId,
        timestampMs: frame.timestampMs,
        error: err instanceof Error ? err.message : String(err),
      })
      formScores.push({
        timestampMs: frame.timestampMs,
        formScore: 0,
        feedback: lang === 'fr' ? 'Analyse échouée pour cette frame' : 'Analysis failed for this frame',
        issues: [],
      })
    }
  }

  // Aggregate results
  const scoredFrames = formScores.filter((f) => f.formScore > 0)
  const overallFormScore = scoredFrames.length > 0
    ? Math.round(scoredFrames.reduce((a, f) => a + f.formScore, 0) / scoredFrames.length)
    : 0

  const overallFeedback = buildOverallFeedback(overallFormScore, formScores, lang)

  logger.info(
    `Video analysis completed: player=${playerId}, frames=${frames.length}, avg_score=${overallFormScore}, tokens=${totalTokens}`,
    'ai.video',
  )

  return {
    shots: [], // Shots are detected separately via detectShotsInFrame
    formScores,
    overallFormScore,
    overallFeedback,
    tokenUsage: {
      promptTokens: Math.round(totalTokens * 0.7),
      completionTokens: Math.round(totalTokens * 0.3),
      totalTokens,
      estimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      model: 'gpt-4o',
    },
  }
}

// ── Shot Detection in Frame ────────────────────────────────────────────────────

/**
 * Detect if a basketball shot is visible in a video frame.
 * Returns shot detection data if found, null otherwise.
 */
export async function detectShotsInFrame(
  playerId: string,
  frameBase64: string,
  timestampMs: number,
  lang: Lang = 'fr',
): Promise<ShotDetection | null> {
  const prompt = getShotDetectionPrompt(lang)

  try {
    const result = await analyzeVideoFrame(frameBase64, prompt, {
      model: 'gpt-4o',
      timeoutMs: 15_000,
      responseFormat: 'json_object',
    })

    const parsed = parseJsonResponse<{
      isShot: boolean
      shotType: string
      confidence: number
      playerPosition: { x: number; y: number }
    }>(result.text, {
      isShot: false,
      shotType: 'none',
      confidence: 0,
      playerPosition: { x: 0.5, y: 0.5 },
    })

    if (!parsed.isShot || parsed.shotType === 'none') {
      return null
    }

    // Validate shot type
    const validTypes = ['made', 'missed', 'airball', 'bank']
    const shotType = validTypes.includes(parsed.shotType) ? parsed.shotType : 'missed'

    const detection: ShotDetection = {
      type: shotType,
      x: clamp(parsed.playerPosition?.x ?? 0.5, 0, 1),
      y: clamp(parsed.playerPosition?.y ?? 0.5, 0, 1),
      confidence: clamp(parsed.confidence ?? 0.5, 0, 1),
      timestampMs,
      formScore: null,
    }

    // Save to DB
    await db.shotDetection.create({
      data: {
        playerId,
        type: shotType,
        x: detection.x,
        y: detection.y,
        confidence: detection.confidence,
        timestampMs,
        formScore: null,
      },
    })

    return detection
  } catch (err) {
    logger.error('Shot detection in frame failed', 'ai.video', {
      playerId,
      timestampMs,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function determinePhase(index: number, total: number): 'setup' | 'execution' | 'follow_through' | 'unknown' {
  if (total <= 1) return 'unknown'
  const ratio = index / (total - 1)
  if (ratio < 0.3) return 'setup'
  if (ratio < 0.7) return 'execution'
  return 'follow_through'
}

function buildOverallFeedback(
  overallScore: number,
  formScores: VideoFrameAnalysis[],
  lang: Lang,
): string {
  if (formScores.length === 0) {
    return lang === 'fr' ? 'Aucune frame analysée.' : 'No frames analyzed.'
  }

  // Find best and worst frames
  const best = formScores.reduce((a, b) => a.formScore > b.formScore ? a : b)
  const worst = formScores.reduce((a, b) => a.formScore < b.formScore ? a : b)

  if (lang === 'fr') {
    if (overallScore >= 80) {
      return `Excellente séquence vidéo ! Score moyen: ${overallScore}/100. Forme la plus forte à ${best.timestampMs}ms (${best.formScore}/100).`
    }
    if (overallScore >= 60) {
      return `Bonne séquence avec score moyen ${overallScore}/100. Point faible à ${worst.timestampMs}ms — ${worst.feedback}`
    }
    return `Séquence à travailler (score moyen ${overallScore}/100). Concentre-toi sur la régularité. Meilleur moment: ${best.timestampMs}ms.`
  }

  if (overallScore >= 80) {
    return `Excellent video sequence! Average score: ${overallScore}/100. Strongest form at ${best.timestampMs}ms (${best.formScore}/100).`
  }
  if (overallScore >= 60) {
    return `Good sequence with average score ${overallScore}/100. Weak point at ${worst.timestampMs}ms — ${worst.feedback}`
  }
  return `Sequence needs work (average score ${overallScore}/100). Focus on consistency. Best moment: ${best.timestampMs}ms.`
}
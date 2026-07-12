/**
 * Form Analysis Service
 * Complete pipeline for analyzing a player's basketball form from an image.
 * Orchestrates: validation → prompt building → VLM call → parsing → DB storage → stat update.
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/middleware/error-handler';
import { checkAndTrack } from '../rate-limiter';
import { analyzeImage } from '../providers/vision.provider';
import { getFormAnalysisSystemPrompt, getDrillAnalysisUserPrompt } from '../prompts/analysis-prompts';
import { parseJsonResponse, clamp, estimateCost } from '../utils';
import type {
  FormAnalysisRequest,
  FormAnalysisResult,
  FormAnalysisCategoryScore,
  SubscriptionTier,
} from '../types';
import { AiError } from '../types';

// ── Main Pipeline ──────────────────────────────────────────────────────────────

/**
 * Analyze a player's form from an image. Full pipeline with validation,
 * VLM analysis, response parsing, DB storage, and stat updates.
 */
export async function analyzeForm(
  request: FormAnalysisRequest,
  tier: SubscriptionTier = 'free',
): Promise<FormAnalysisResult> {
  const { playerId, imageBase64, drillName, category, instructions, lang = 'fr' } = request

  // 1. Validate input
  validateFormRequest(imageBase64, drillName, category)

  // 2. Check rate limit
  const rateResult = await checkAndTrack(playerId, 'form_check', tier)
  if (!rateResult.allowed) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      lang === 'fr' ? `Trop d'analyses de forme. Réessayez dans ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`
        : `Too many form analyses. Try again in ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`,
    )
  }

  // 3. Get coaching prompt for the specific drill
  const systemPrompt = getFormAnalysisSystemPrompt(lang)
  const userPrompt = getDrillAnalysisUserPrompt({
    drillName,
    category,
    instructions,
    lang,
  })

  // 4. Estimate cost before calling (budget awareness)
  const preCost = estimateCost('gpt-4o', 800, 300)
  logger.info(
    `Form analysis: pre-cost estimate $${preCost.estimatedCostUsd}, player=${playerId}, drill=${drillName}`,
    'ai.form-analysis',
  )

  // 5. Call vision provider
  let response: string
  let tokenUsage: FormAnalysisResult['tokenUsage']
  try {
    const result = await analyzeImage({
      imageBase64,
      prompt: userPrompt,
      systemPrompt,
      responseFormat: 'json_object',
      model: 'gpt-4o',
      timeoutMs: 30_000,
    })
    response = result.content
    tokenUsage = result.tokenUsage
  } catch (err) {
    if (err instanceof AiError) {
      if (err.type === 'rate_limit') {
        throw new AppError(ErrorCode.RATE_LIMITED, lang === 'fr' ? 'Limite IA atteinte. Réessayez.' : 'AI limit reached. Try again.')
      }
      if (err.type === 'invalid_input') {
        throw new AppError(ErrorCode.INVALID_BODY, err.message)
      }
    }
    logger.error('Form analysis VLM call failed', 'ai.form-analysis', {
      playerId,
      drillName,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      lang === 'fr' ? "Erreur lors de l'analyse IA. Veuillez réessayer." : 'AI analysis error. Please try again.',
    )
  }

  // 6. Parse and validate response
  const parsed = parseJsonResponse<Record<string, unknown>>(response, null as unknown as Record<string, unknown>)
  const result = parseAndValidateFormResult(parsed, lang)

  // 7. Store result in DB
  try {
    await db.formAnalysis.create({
      data: {
        playerId,
        overallScore: result.overallScore,
        feedback: result.feedback,
        categories: JSON.stringify(result.categories),
      },
    })
  } catch (dbErr) {
    logger.error('Failed to save form analysis to DB', 'ai.form-analysis', {
      playerId,
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    })
    // Don't fail the whole request if DB save fails
  }

  // 8. Log success
  logger.info(
    `Form analysis completed: score=${result.overallScore}, drill=${drillName}, tokens=${tokenUsage?.totalTokens ?? 0}, cost=$${tokenUsage?.estimatedCostUsd ?? 0}`,
    'ai.form-analysis',
    { playerId },
  )

  return {
    ...result,
    tokenUsage,
  }
}

// ── Validation ──────────────────────────────────────────────────────────────────

function validateFormRequest(imageBase64: string, drillName: string, category: string): void {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new AppError(ErrorCode.MISSING_REQUIRED_FIELD, 'Image requise (base64)')
  }

  if (!drillName || typeof drillName !== 'string' || drillName.trim().length === 0) {
    throw new AppError(ErrorCode.MISSING_REQUIRED_FIELD, 'Nom de l\'exercice requis')
  }

  if (!category || typeof category !== 'string') {
    throw new AppError(ErrorCode.MISSING_REQUIRED_FIELD, 'Catégorie requise')
  }

  if (imageBase64.length > 7_000_000) {
    throw new AppError(ErrorCode.PAYLOAD_TOO_LARGE, 'Image trop volumineuse (max 5 MB)')
  }
}

// ── Response Parsing & Validation ───────────────────────────────────────────────

function parseAndValidateFormResult(
  parsed: Record<string, unknown> | null,
  lang: string,
): Omit<FormAnalysisResult, 'tokenUsage'> {
  const fallback: Omit<FormAnalysisResult, 'tokenUsage'> = {
    overallScore: 10,
    feedback: lang === 'fr' ? 'Analyse incomplète — réessayez' : 'Incomplete analysis — try again',
    issues: [],
    goodPoints: [],
    categories: { elbow: 50, knee: 50, alignment: 50, balance: 50, trunk: 50 },
    recommendation: undefined,
  }

  if (!parsed) return fallback

  const score = clamp(Number(parsed.score) ?? 50, 0, 100)
  const feedback = String(parsed.feedback || fallback.feedback).slice(0, 200)
  const issues = Array.isArray(parsed.issues)
    ? (parsed.issues as unknown[]).map(String).slice(0, 5)
    : []
  const goodPoints = Array.isArray(parsed.goodPoints)
    ? (parsed.goodPoints as unknown[]).map(String).slice(0, 5)
    : []

  // Parse category scores if available
  const rawCategories = parsed.categories as Record<string, unknown> | undefined
  const categories: FormAnalysisCategoryScore = {
    elbow: clamp(Number(rawCategories?.elbow) ?? 50, 0, 100),
    knee: clamp(Number(rawCategories?.knee) ?? 50, 0, 100),
    alignment: clamp(Number(rawCategories?.alignment) ?? 50, 0, 100),
    balance: clamp(Number(rawCategories?.balance) ?? 50, 0, 100),
    trunk: clamp(Number(rawCategories?.trunk) ?? 50, 0, 100),
  }

  // Generate a follow-up recommendation based on the lowest category
  const lowestCat = Object.entries(categories).sort(([, a], [, b]) => a - b)[0]
  const catRecommendations: Record<string, { fr: string; en: string }> = {
    elbow: { fr: 'Travaille ton angle de coude avec des form shootings proches du panier.', en: 'Work on your elbow angle with close-range form shooting.' },
    knee: { fr: 'Fléchis plus les genoux pour générer de la puissance depuis les jambes.', en: 'Bend your knees more to generate power from your legs.' },
    alignment: { fr: 'Carré tes épaules au panier avant chaque tir pour améliorer ta précision.', en: 'Square your shoulders to the rim before each shot for better accuracy.' },
    balance: { fr: 'Centre ta gravité et équilibre tes hanches pour une base plus stable.', en: 'Center your gravity and balance your hips for a more stable base.' },
    trunk: { fr: 'Reste droit et aligné pour préserver l\'équilibre pendant le geste.', en: 'Stay upright and aligned to maintain balance during the movement.' },
  }

  const recommendation = lowestCat && lowestCat[1] < 65
    ? (catRecommendations[lowestCat[0]] ?? { fr: '', en: '' })[lang === 'fr' ? 'fr' : 'en']
    : undefined

  return {
    overallScore: score,
    feedback,
    issues,
    goodPoints,
    categories,
    recommendation,
  }
}
function formAnalysisService(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: formAnalysisService is not implemented yet.', args);
  return null;
}

export default formAnalysisService;
/**
 * Vision Provider (VLM)
 * Wraps z-ai-web-dev-sdk VLM calls for image/video frame analysis.
 * Handles retry logic, token tracking, error classification, and timeouts.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { logger } from '@/lib/logger'
import {
  type VisionRequest,
  type VisionResponse,
  type AnalysisResult,
  AiError,
} from '../types'
import { preprocessImage, getBackoffDelay, sleep, buildTokenUsage, estimateTokens } from '../utils'

const DEFAULT_MODEL = 'gpt-4o'
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RETRIES = 3

// ── Main VLM Functions ──────────────────────────────────────────────────────────

/**
 * Analyze an image using the Vision Language Model.
 * Includes automatic retry with exponential backoff, timeout handling,
 * and input validation.
 */
export async function analyzeImage(request: VisionRequest): Promise<VisionResponse> {
  const {
    imageBase64,
    prompt,
    systemPrompt,
    responseFormat = 'json_object',
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = request

  // Validate and preprocess image
  let processedImage: string
  try {
    const result = preprocessImage(imageBase64)
    processedImage = result.imageBase64
    if (result.wasCompressed) {
      logger.info(
        `Image compressed: ${(result.originalSize / 1_000_000).toFixed(1)}MB → ${(result.finalSize / 1_000_000).toFixed(1)}MB`,
        'ai.vision',
      )
    }
  } catch (err) {
    throw createAiError('invalid_input', err instanceof Error ? err.message : 'Invalid image input', false, 400)
  }

  // Estimate cost before making the call
  const estimatedInputTokens = estimateTokens(prompt) + estimateTokens(systemPrompt || '') + 100 // overhead
  logger.debug(
    `VLM call: model=${model}, format=${responseFormat}, est_input_tokens≈${estimatedInputTokens}`,
    'ai.vision',
  )

  const zai = await ZAI.create()

  // Build messages for VLM
  const systemContent = systemPrompt || 'Tu es un assistant de basketball. Réponds uniquement en JSON si demandé.'
  const userContent = [
    { type: 'text' as const, text: prompt },
    {
      type: 'image_url' as const,
      image_url: { url: processedImage },
    },
  ]

  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const baseArgs = {
        model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        thinking: { type: 'disabled' as const },
        ...(responseFormat === 'json_object' ? { response_format: { type: 'json_object' as const } } : {}),
      }
      // signal and response_format are not in the SDK types but are supported at runtime
      const argsWithExtras = { ...baseArgs, signal: controller.signal } as Parameters<typeof zai.chat.completions.createVision>[0]
      const response = await zai.chat.completions.createVision(argsWithExtras)

      clearTimeout(timeoutId)

      const content = response.choices?.[0]?.message?.content ?? ''

      // Estimate token usage from response (SDK may not always provide usage)
      const promptTokens = estimatedInputTokens
      const completionTokens = estimateTokens(content)
      const tokenUsage = buildTokenUsage(model, promptTokens, completionTokens)

      logger.info(
        `VLM success: model=${model}, tokens=${tokenUsage.totalTokens}, cost=$${tokenUsage.estimatedCostUsd}`,
        'ai.vision',
      )

      return { content, tokenUsage }
    } catch (err: unknown) {
      lastError = err
      const aiErr = classifyError(err)

      // Don't retry non-retryable errors
      if (!aiErr.retryable || attempt === MAX_RETRIES - 1) {
        logger.error(`VLM failed after ${attempt + 1} attempts: ${aiErr.type}`, 'ai.vision', {
          error: aiErr.message,
        })
        throw aiErr
      }

      const delay = getBackoffDelay(attempt)
      logger.warn(`VLM attempt ${attempt + 1} failed (${aiErr.type}), retrying in ${delay}ms`, 'ai.vision')
      await sleep(delay)
    }
  }

  // Should never reach here, but just in case
  throw createAiError('model_error', 'VLM call failed after all retries', false, 500, lastError)
}

/**
 * Analyze a single video frame for basketball form/pose assessment.
 * This is a convenience wrapper around analyzeImage for video workflows.
 */
export async function analyzeVideoFrame(
  base64Frame: string,
  context: string,
  options?: {
    model?: string
    timeoutMs?: number
    responseFormat?: 'json_object' | 'text'
  },
): Promise<AnalysisResult> {
  const response = await analyzeImage({
    imageBase64: base64Frame,
    prompt: context,
    systemPrompt: `Tu es un expert en analyse vidéo de basketball. Analyse cette frame vidéo.
${options?.responseFormat === 'json_object' ? 'Réponds UNIQUEMENT en JSON valide.' : ''}`,
    responseFormat: options?.responseFormat ?? 'json_object',
    model: options?.model ?? DEFAULT_MODEL,
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  })

  // Derive confidence from the VLM response content.
  // Heuristic: longer, more detailed responses indicate the model found
  // meaningful visual features to describe → higher confidence.
  // Short/generic responses suggest uncertainty or lack of clear content → lower confidence.
  const confidence = deriveConfidence(response.content)

  return {
    text: response.content,
    confidence,
    metadata: {
      tokenUsage: response.tokenUsage,
      source: 'video_frame',
    },
  }
}

// ── Confidence Derivation ───────────────────────────────────────────────────────

/**
 * Derive a confidence score from the VLM response content.
 *
 * Strategy:
 * 1. If the response contains a JSON "confidence" field, use it (clamped 0–1).
 * 2. Otherwise, use a heuristic based on response length and specificity:
 *    - Very short (< 50 chars) or empty → 0.5 (generic / uncertain)
 *    - Short (50–150 chars) → 0.6 (some detail but limited)
 *    - Medium (150–400 chars) → 0.75 (reasonable detail)
 *    - Long (400+ chars) → 0.85+ (detailed analysis, up to 0.95)
 *    - Bonus: if the response contains basketball-specific keywords, add up to 0.05
 */
function deriveConfidence(content: string): number {
  // Try to extract an explicit confidence field from JSON responses
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
        return Math.max(0, Math.min(1, parsed.confidence))
      }
    }
  } catch {
    // Not valid JSON or no confidence field — fall through to heuristic
  }

  // Heuristic based on length
  const len = content.trim().length
  let confidence: number

  if (len === 0) {
    confidence = 0.5
  } else if (len < 50) {
    confidence = 0.55
  } else if (len < 150) {
    // Map 50–149 → 0.6–0.7
    confidence = 0.6 + ((len - 50) / 100) * 0.1
  } else if (len < 400) {
    // Map 150–399 → 0.7–0.85
    confidence = 0.7 + ((len - 150) / 250) * 0.15
  } else {
    // Map 400+ → 0.85–0.92 (diminishing returns for very long responses)
    confidence = 0.85 + Math.min(0.07, ((len - 400) / 600) * 0.07)
  }

  // Small bonus for basketball-specific keywords (indicates domain relevance)
  const basketballKeywords = /\b(elbow|knee|alignment|follow.?through|release|arc|spin|posture|stance|hip|shoulder|dribble|pivot|screen)\b/i
  if (basketballKeywords.test(content)) {
    confidence = Math.min(0.95, confidence + 0.03)
  }

  return Math.max(0, Math.min(1, confidence))
}

// ── Error Classification ────────────────────────────────────────────────────────

function classifyError(err: unknown): AiError {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()
    const statusMatch = message.match(/status\s*(\d{3})/)

    if (message.includes('rate limit') || message.includes('429') || message.includes('quota')) {
      const retryAfter = message.match(/retry-after[:\s]*(\d+)/)
      return createAiError(
        'rate_limit',
        `VLM rate limited: ${err.message}`,
        true,
        429,
        err,
        retryAfter ? parseInt(retryAfter[1], 10) * 1000 : 5000,
      )
    }

    if (message.includes('timeout') || message.includes('abort') || err.name === 'AbortError') {
      return createAiError('timeout', `VLM timeout: ${err.message}`, true, 504, err, 2000)
    }

    if (message.includes('invalid') || message.includes('malformed') || message.includes('invalid_image')) {
      return createAiError('invalid_input', `VLM invalid input: ${err.message}`, false, 400, err)
    }

    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10)
      if (statusCode >= 500) {
        return createAiError('model_error', `VLM server error: ${err.message}`, true, statusCode, err)
      }
      return createAiError('model_error', `VLM error (${statusCode}): ${err.message}`, false, statusCode, err)
    }
  }

  // Default: model error, retryable (likely transient)
  return createAiError('model_error', `VLM unknown error: ${String(err)}`, true, 500, err)
}

function createAiError(
  type: AiError['type'],
  message: string,
  retryable: boolean,
  statusCode: number,
  cause?: unknown,
  retryAfterMs?: number,
): AiError {
  return new AiError(type, message, { retryable, statusCode, cause, retryAfterMs })
}
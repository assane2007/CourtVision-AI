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

  return {
    text: response.content,
    confidence: 0.85, // VLM confidence is implicit
    metadata: {
      tokenUsage: response.tokenUsage,
      source: 'video_frame',
    },
  }
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
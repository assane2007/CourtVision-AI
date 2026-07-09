/**
 * AI Utilities
 * Image preprocessing, token counting, response parsing, and cost estimation.
 */

import type { ChatMessage, TokenUsage } from './types'
import { logger } from '@/lib/logger'

// ── Token Estimation ────────────────────────────────────────────────────────────

/**
 * Rough token estimation: ~4 chars per token for English, ~3.5 for French.
 * This is a conservative estimate used for budget awareness, not billing.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // French text tends to have more tokens per char due to accents
  const hasFrench = /[àâäéèêëïîôùûüÿçœæ]/i.test(text)
  const charsPerToken = hasFrench ? 3.2 : 4.0
  return Math.ceil(text.length / charsPerToken)
}

/**
 * Estimate tokens for a list of chat messages.
 */
export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, msg) => {
    const content = typeof msg.content === 'string'
      ? msg.content
      : msg.content
          .filter((p) => p.type === 'text')
          .map((p) => p.text || '')
          .join('')
    // Add ~4 tokens overhead per message for role/formatting
    return total + estimateTokens(content) + 4
  }, 0)
}

/**
 * Estimate tokens for a base64 image sent to vision model.
 * VLM tokens for images vary, but we use a conservative estimate.
 * A typical JPEG image at 512x512 ≈ 765 tokens (based on GPT-4o tile system).
 * Larger images get more tiles.
 */
export function estimateImageTokens(base64DataUrl: string): number {
  // Extract base64 content length (excluding the data URL prefix)
  const base64Part = base64DataUrl.includes(',')
    ? base64DataUrl.split(',')[1]
    : base64DataUrl
  // Rough estimate: 1MB of image data ≈ ~1100 tokens
  const bytes = Math.ceil((base64Part.length * 3) / 4)
  const mb = bytes / (1024 * 1024)
  return Math.ceil(765 + (mb * 335))
}

// ── Cost Estimation ─────────────────────────────────────────────────────────────

/** Model cost per 1K tokens (USD) — approximate. */
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
}

export interface CostEstimate {
  estimatedCostUsd: number
  inputTokens: number
  outputTokens: number
  model: string
}

/**
 * Estimate the cost of an AI call before making it.
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  estimatedOutputTokens: number,
): CostEstimate {
  const costs = MODEL_COSTS[model] ?? { input: 0.002, output: 0.008 }
  const inputCost = (inputTokens / 1000) * costs.input
  const outputCost = (estimatedOutputTokens / 1000) * costs.output
  return {
    estimatedCostUsd: Math.round((inputCost + outputCost) * 10000) / 10000,
    inputTokens,
    outputTokens: estimatedOutputTokens,
    model,
  }
}

// ── Image Preprocessing ─────────────────────────────────────────────────────────

const MAX_IMAGE_BASE64_LENGTH = 7_000_000 // ~5MB

/**
 * Validate and optionally compress a base64 image for VLM input.
 * Returns the (possibly shortened) base64 data URL.
 */
export function preprocessImage(base64DataUrl: string): {
  imageBase64: string
  wasCompressed: boolean
  originalSize: number
  finalSize: number
} {
  const originalSize = base64DataUrl.length

  // Ensure it has a data URL prefix
  let dataUrl = base64DataUrl
  if (!dataUrl.startsWith('data:image/')) {
    // Assume JPEG if no prefix
    dataUrl = `data:image/jpeg;base64,${base64DataUrl}`
  }

  // Validate format
  const validFormats = /^data:image\/(jpeg|png|webp);base64,/
  if (!validFormats.test(dataUrl)) {
    throw new Error(
      `Invalid image format. Accepted: JPEG, PNG, WebP. Got: ${dataUrl.slice(0, 50)}`,
    )
  }

  // Check size
  if (dataUrl.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error(
      `Image too large: ${(dataUrl.length / 1_000_000).toFixed(1)}MB. Maximum: 5MB.`,
    )
  }

  // If image is significantly larger than target, we note it.
  // Actual compression would require sharp/jimp — we just validate here
  // and let the VLM handle reasonable sizes.
  const wasCompressed = false
  const finalSize = dataUrl.length

  return {
    imageBase64: dataUrl,
    wasCompressed,
    originalSize,
    finalSize,
  }
}

/**
 * Extract raw base64 content from a data URL.
 */
export function extractBase64(dataUrl: string): string {
  if (dataUrl.includes(',')) {
    return dataUrl.split(',')[1]
  }
  return dataUrl
}

// ── Response Parsing ────────────────────────────────────────────────────────────

/**
 * Safely parse JSON from an LLM response, handling common issues:
 * - Markdown code blocks wrapping the JSON
 * - Extra text before/after JSON
 * - Malformed JSON
 */
export function parseJsonResponse<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback

  // Try direct parse first
  try {
    return JSON.parse(raw) as T
  } catch {
    // Continue to fallback strategies
  }

  // Try extracting JSON from markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T
    } catch {
      // Continue
    }
  }

  // Try finding the outermost { } or [ ] pair
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T
    } catch {
      // Continue
    }
  }

  logger.warn('Failed to parse AI JSON response', 'ai.utils', {
    rawLength: raw.length,
    preview: raw.slice(0, 200),
  })

  return fallback
}

// ── Context Window Management ───────────────────────────────────────────────────

/**
 * Maximum context window sizes (tokens) for different models.
 */
export const CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
}

const RESERVED_OUTPUT_TOKENS = 1024
const SAFETY_MARGIN = 0.1 // 10% safety margin

/**
 * Trim messages to fit within a model's context window.
 * Removes oldest messages first, always keeping the system message.
 */
export function trimMessagesToFitWindow(
  messages: ChatMessage[],
  model: string,
  reservedOutputTokens: number = RESERVED_OUTPUT_TOKENS,
): ChatMessage[] {
  const windowSize = CONTEXT_WINDOWS[model] ?? 128_000
  const availableTokens = Math.floor(
    (windowSize - reservedOutputTokens) * (1 - SAFETY_MARGIN),
  )

  // Separate system messages from conversation
  const systemMessages = messages.filter((m) => m.role === 'system')
  const conversationMessages = messages.filter((m) => m.role !== 'system')

  // Calculate system tokens
  const systemTokens = estimateMessagesTokens(systemMessages)

  // Keep removing oldest conversation messages until we fit
  const trimmed: ChatMessage[] = [...systemMessages]
  let usedTokens = systemTokens

  // Process from newest to oldest, but we'll build the result from oldest to newest
  const keptConversation: ChatMessage[] = []
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i]
    const msgTokens = estimateMessagesTokens([msg])
    if (usedTokens + msgTokens > availableTokens) {
      break
    }
    keptConversation.unshift(msg)
    usedTokens += msgTokens
  }

  return [...trimmed, ...keptConversation]
}

// ── Retry Helpers ───────────────────────────────────────────────────────────────

/**
 * Calculate delay for exponential backoff with jitter.
 */
export function getBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
): number {
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  // Add jitter: ±25%
  const jitter = exponential * 0.25
  const delay = exponential + (Math.random() * 2 - 1) * jitter
  return Math.max(0, Math.round(delay))
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Misc Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a token usage object from raw SDK response data.
 */
export function buildTokenUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
): TokenUsage {
  const costs = MODEL_COSTS[model] ?? { input: 0.002, output: 0.008 }
  const inputCost = (promptTokens / 1000) * costs.input
  const outputCost = (completionTokens / 1000) * costs.output
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd: Math.round((inputCost + outputCost) * 10000) / 10000,
    model,
  }
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
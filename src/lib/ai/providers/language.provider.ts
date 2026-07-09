/**
 * Language Provider (LLM)
 * Wraps z-ai-web-dev-sdk LLM calls for text generation and coaching.
 * Handles context window management, cost estimation, retry logic, and structured output.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { logger } from '@/lib/logger'
import {
  type ChatMessage,
  type ChatOptions,
  type TokenUsage,
  AiError,
} from '../types'
import {
  estimateMessagesTokens,
  trimMessagesToFitWindow,
  getBackoffDelay,
  sleep,
  buildTokenUsage,
  parseJsonResponse,
} from '../utils'

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_TIMEOUT_MS = 25_000
const MAX_RETRIES = 3
const MAX_HISTORY_MESSAGES = 20

// ── Main Chat Function ──────────────────────────────────────────────────────────

/**
 * Send a chat completion request to the LLM.
 * Handles context window management and retry with backoff.
 */
export async function chat(
  messages: ChatMessage[],
  options?: ChatOptions,
): Promise<{ content: string; tokenUsage: TokenUsage }> {
  const {
    temperature = 0.7,
    maxTokens,
    model = DEFAULT_MODEL,
    responseFormat,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options ?? {}

  // Trim messages to fit context window
  const trimmedMessages = trimMessagesToFitWindow(messages, model, maxTokens ?? 1024)

  // Estimate cost before making the call
  const estimatedInputTokens = estimateMessagesTokens(trimmedMessages)
  logger.debug(
    `LLM call: model=${model}, messages=${trimmedMessages.length}, est_input_tokens≈${estimatedInputTokens}, temp=${temperature}`,
    'ai.language',
  )

  const zai = await ZAI.create()

  // Convert messages to SDK format
  const sdkMessages = trimmedMessages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }))

  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await (zai.chat as any).completions.create({
        model,
        messages: sdkMessages,
        temperature,
        thinking: { type: 'disabled' },
        ...(responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      })

      clearTimeout(timeoutId)

      const content = response.choices?.[0]?.message?.content ?? ''

      // Estimate token usage
      const promptTokens = estimatedInputTokens
      const completionTokens = response.usage?.completion_tokens
        ? response.usage.completion_tokens
        : Math.ceil(content.length / 3.5)
      const tokenUsage = buildTokenUsage(model, promptTokens, completionTokens)

      logger.info(
        `LLM success: model=${model}, tokens=${tokenUsage.totalTokens}, cost=$${tokenUsage.estimatedCostUsd}`,
        'ai.language',
      )

      return { content, tokenUsage }
    } catch (err: unknown) {
      lastError = err
      const aiErr = classifyError(err)

      if (!aiErr.retryable || attempt === MAX_RETRIES - 1) {
        logger.error(`LLM failed after ${attempt + 1} attempts: ${aiErr.type}`, 'ai.language', {
          error: aiErr.message,
        })
        throw aiErr
      }

      const delay = getBackoffDelay(attempt)
      logger.warn(`LLM attempt ${attempt + 1} failed (${aiErr.type}), retrying in ${delay}ms`, 'ai.language')
      await sleep(delay)
    }
  }

  throw createAiError('model_error', 'LLM call failed after all retries', false, 500, lastError)
}

// ── Structured Output ───────────────────────────────────────────────────────────

/**
 * Call the LLM and parse the response as a specific JSON structure.
 * Falls back to the provided default if parsing fails.
 */
export async function chatWithStructure<T>(
  messages: ChatMessage[],
  schema: { [key: string]: unknown },
  options?: ChatOptions & { fallback?: T },
): Promise<{ data: T; tokenUsage: TokenUsage }> {
  // Add schema instruction to the system message if not already present
  const enhancedMessages: ChatMessage[] = [
    ...(messages[0]?.role === 'system' ? [messages[0]] : []),
    {
      role: 'system' as const,
      content: `You must respond with valid JSON matching this structure: ${JSON.stringify(schema)}.
Do NOT include any text outside the JSON. Do NOT use markdown code blocks.`,
    },
    ...(messages[0]?.role === 'system' ? messages.slice(1) : messages),
  ]

  const response = await chat(enhancedMessages, {
    ...options,
    responseFormat: 'json_object',
    temperature: options?.temperature ?? 0.3, // Lower temperature for structured output
  })

  const data = parseJsonResponse<T>(response.content, options?.fallback as T)
  return { data, tokenUsage: response.tokenUsage }
}

// ── Conversation History Management ─────────────────────────────────────────────

/**
 * Trim conversation history to the most recent N messages.
 * Always preserves system messages.
 */
export function trimHistory(
  messages: ChatMessage[],
  maxMessages: number = MAX_HISTORY_MESSAGES,
): ChatMessage[] {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const conversation = messages.filter((m) => m.role !== 'system')

  const trimmed = conversation.length > maxMessages
    ? conversation.slice(-maxMessages)
    : conversation

  return [...systemMessages, ...trimmed]
}

// ── Cost Estimation ─────────────────────────────────────────────────────────────

/**
 * Estimate the cost of a potential LLM call before making it.
 * Useful for budget-aware decisions.
 */
export function estimateCallCost(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  estimatedOutputTokens: number = 500,
): { estimatedCostUsd: number; estimatedTokens: number } {
  const inputTokens = estimateMessagesTokens(messages)
  const costs: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
  }
  const modelCost = costs[model] ?? { input: 0.002, output: 0.008 }
  const costUsd =
    (inputTokens / 1000) * modelCost.input +
    (estimatedOutputTokens / 1000) * modelCost.output

  return {
    estimatedCostUsd: Math.round(costUsd * 10000) / 10000,
    estimatedTokens: inputTokens + estimatedOutputTokens,
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
        `LLM rate limited: ${err.message}`,
        true,
        429,
        err,
        retryAfter ? parseInt(retryAfter[1], 10) * 1000 : 5000,
      )
    }

    if (message.includes('timeout') || message.includes('abort') || err.name === 'AbortError') {
      return createAiError('timeout', `LLM timeout: ${err.message}`, true, 504, err, 2000)
    }

    if (message.includes('context_length') || message.includes('too many tokens') || message.includes('token limit')) {
      return createAiError('invalid_input', `LLM context too long: ${err.message}`, false, 400, err)
    }

    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10)
      if (statusCode >= 500) {
        return createAiError('model_error', `LLM server error: ${err.message}`, true, statusCode, err)
      }
      return createAiError('model_error', `LLM error (${statusCode}): ${err.message}`, false, statusCode, err)
    }
  }

  return createAiError('model_error', `LLM unknown error: ${String(err)}`, true, 500, err)
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
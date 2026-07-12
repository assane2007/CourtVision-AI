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

      const chatApi = zai.chat as unknown as { completions: { create: (args: Record<string, unknown>) => Promise<{ choices?: Array<{ message?: { content?: string } }>; usage?: { completion_tokens?: number } }> } }
      const response = await chatApi.completions.create({
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

// ── Streaming Chat Function ─────────────────────────────────────────────────────

/**
 * SSE chunk emitted by the streaming LLM response.
 * The SDK returns a ReadableStream of SSE lines when stream=true.
 */
export interface StreamChunk {
  content: string
}

/**
 * Send a streaming chat completion request to the LLM.
 * Returns a ReadableStream<Uint8Array> of SSE-formatted data from the SDK.
 * The caller is responsible for piping this to the HTTP response.
 *
 * Unlike `chat()`, this does NOT retry — once we start streaming we cannot
 * restart transparently. A single attempt is made with a longer timeout.
 */
export async function chatStream(
  messages: ChatMessage[],
  options?: ChatOptions & { timeoutMs?: number },
): Promise<ReadableStream<Uint8Array>> {
  const {
    temperature = 0.7,
    maxTokens,
    model = DEFAULT_MODEL,
    responseFormat,
    timeoutMs: _timeoutMs = 60_000, // reserved for AbortController timeout
  } = options ?? {}

  const trimmedMessages = trimMessagesToFitWindow(messages, model, maxTokens ?? 1024)
  const estimatedInputTokens = estimateMessagesTokens(trimmedMessages)
  logger.debug(
    `LLM stream: model=${model}, messages=${trimmedMessages.length}, est_input_tokens≈${estimatedInputTokens}`,
    'ai.language.stream',
  )

  const zai = await ZAI.create()

  const sdkMessages = trimmedMessages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }))

  const chatApi = zai.chat as unknown as {
    completions: { create: (args: Record<string, unknown>) => Promise<ReadableStream<Uint8Array>> }
  }

  const stream = await chatApi.completions.create({
    model,
    messages: sdkMessages,
    temperature,
    stream: true,
    thinking: { type: 'disabled' },
    ...(responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  })

  if (!(stream instanceof ReadableStream)) {
    throw createAiError(
      'model_error',
      'SDK did not return a ReadableStream for streaming request',
      false,
      500,
    )
  }

  logger.info(`LLM stream started: model=${model}`, 'ai.language.stream')
  return stream
}

/**
 * Convert a raw SDK SSE ReadableStream into a TransformStream that emits
 * clean `data: {"content":"..."}\n\n` SSE events for the HTTP response.
 * Sends `data: [DONE]\n\n` when the source stream ends.
 *
 * This handles the SSE parsing from the SDK and re-emits in our standard format.
 */
export function createSSETransformStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  let buffer = ''

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const payload = trimmed.slice(6) // strip "data: " prefix
        if (payload === '[DONE]') {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          return
        }
        try {
          const parsed = JSON.parse(payload)
          // OpenAI-compatible SSE: choices[0].delta.content
          const token = parsed?.choices?.[0]?.delta?.content
          if (token) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ content: token })}\n\n`),
            )
          }
        } catch {
          // Ignore malformed JSON lines from the SDK
        }
      }
    },
    flush(controller) {
      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6)
          if (payload !== '[DONE]') {
            try {
              const parsed = JSON.parse(payload)
              const token = parsed?.choices?.[0]?.delta?.content
              if (token) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ content: token })}\n\n`),
                )
              }
            } catch {
              // Ignore
            }
          }
        }
      }
      // Always send [DONE] at the end if not already sent
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
    },
  })
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
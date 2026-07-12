/**
 * Embedding generation provider.
 *
 * Uses the z-ai-web-dev-sdk LLM (gpt-4o-mini) to produce a semantic
 * embedding vector from text. The LLM is asked to represent the text
 * as a JSON array of 64 floating-point numbers that capture semantic
 * dimensions relevant to basketball coaching (skill type, difficulty,
 * body part, movement pattern, equipment, outcome).
 *
 * The resulting vector is L2-normalized so that cosine similarity
 * reduces to a simple dot product.
 *
 * Server-only module.
 */

import ZAI from 'z-ai-web-dev-sdk';
import { logger } from '@/lib/logger';

const VECTOR_DIM = 64
const MAX_INPUT_CHARS = 2000
const MAX_RETRIES = 3
const TIMEOUT_MS = 15_000

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate an L2-normalized embedding vector for the given text.
 *
 * Strategy:
 * 1. Truncate input to MAX_INPUT_CHARS.
 * 2. Ask gpt-4o-mini to produce a JSON array of 64 floats (0–1).
 * 3. Parse and L2-normalize the result.
 * 4. Retry up to MAX_RETRIES on transient failures.
 *
 * Returns null if all attempts fail.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const truncated = text.length > MAX_INPUT_CHARS
    ? text.slice(0, MAX_INPUT_CHARS)
    : text

  if (!truncated.trim()) {
    logger.warn('[Embedding] Empty input text', 'ai.embedding')
    return null
  }

  const zai = await ZAI.create()
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await zai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              'Represent this basketball-related text as a JSON array of 64 floating point numbers (0-1 range) that capture the semantic meaning.',
              'Focus on: skill type, difficulty, body part, movement pattern, equipment, outcome.',
              'Respond ONLY with the array, nothing else.',
              '',
              `Text: ${truncated}`,
            ].join('\n'),
          },
        ],
        max_tokens: 512,
        temperature: 0.0,
      })

      clearTimeout(timeoutId)

      const raw = response.choices?.[0]?.message?.content ?? ''
      const vector = parseAndNormalize(raw)
      if (!vector) {
        logger.warn(`[Embedding] Could not parse vector from LLM (attempt ${attempt + 1})`, 'ai.embedding')
        continue
      }

      return vector
    } catch (err) {
      const isRetryable = err instanceof Error && (
        err.message.toLowerCase().includes('timeout') ||
        err.message.toLowerCase().includes('abort') ||
        err.name === 'AbortError'|| err.message.toLowerCase().includes('rate limit') ||
        err.message.toLowerCase().includes('500')
      )

      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        logger.warn(`[Embedding] Failed after ${attempt + 1} attempts: ${err instanceof Error ? err.message : String(err)}`, 'ai.embedding')
        return null
      }

      const delay = Math.min(2 ** attempt * 500, 3000)
      logger.debug(`[Embedding] Attempt ${attempt + 1} failed, retrying in ${delay}ms`, 'ai.embedding')
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  logger.warn('[Embedding] All retry attempts exhausted', 'ai.embedding')
  return null
}

/**
 * Compute cosine similarity between two vectors.
 * Expects both vectors to be L2-normalized (as produced by generateEmbedding).
 * Returns a value between -1 and 1 (1 = identical direction, 0 = orthogonal).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }

  // For unit vectors, |a| * |b| = 1, so cosine similarity = dot product
  // Clamp to [-1, 1] for safety against floating-point drift
  return Math.max(-1, Math.min(1, dot))
}

/**
 * Parse a JSON-serialized embedding string back to a number array.
 * Validates that the result is an array of numbers.
 * Returns null if parsing or validation fails.
 */
export function parseEmbedding(jsonStr: string | null | undefined): number[] | null {
  if (!jsonStr) return null
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return null
    for (const v of parsed) {
      if (typeof v !== 'number' || !Number.isFinite(v)) return null
    }
    return parsed
  } catch {
    return null
  }
}

// ── Internal Helpers ───────────────────────────────────────────────────────────

/**
 * Parse a raw LLM string response into a number array and L2-normalize it.
 * Handles variations like:
 *   - Bare array: [0.1, 0.2, ...]
 *   - Markdown code block: ```json\n[...]\n```
 * Returns null on any failure.
 */
function parseAndNormalize(raw: string): number[] | null {
  // Strip markdown code fences if present
  let cleaned = raw.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }

  // Find the first [ and last ] to extract just the array
  const startIdx = cleaned.indexOf('[')
  const endIdx = cleaned.lastIndexOf(']')
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null

  const arrayStr = cleaned.slice(startIdx, endIdx + 1)

  let values: unknown
  try {
    values = JSON.parse(arrayStr)
  } catch {
    return null
  }

  if (!Array.isArray(values)) return null

  const numbers: number[] = []
  for (const v of values) {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) return null
    numbers.push(Math.max(0, Math.min(1, n))) // clamp to [0, 1]
  }

  if (numbers.length === 0) return null

  // Pad or truncate to VECTOR_DIM
  while (numbers.length < VECTOR_DIM) numbers.push(0)
  if (numbers.length > VECTOR_DIM) numbers.length = VECTOR_DIM

  return l2Normalize(numbers)
}

/**
 * L2-normalize a vector in place and return it.
 * If the magnitude is 0 (all zeros), returns the vector as-is.
 */
function l2Normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vector
  for (let i = 0; i < vector.length; i++) {
    vector[i] /= magnitude
  }
  return vector
}
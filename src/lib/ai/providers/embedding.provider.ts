/**
 * Embedding generation provider.
 *
 * Uses the z-ai-web-dev-sdk LLM to produce keyword-based representations
 * that can be compared via cosine similarity for RAG retrieval.
 *
 * This is a pragmatic placeholder: the LLM summarizes text into keywords,
 * which are then hashed into a 128-dimensional vector. When a proper
 * embedding API (e.g., OpenAI text-embedding-3-small) is available via
 * the SDK, this module should be updated to use it directly.
 *
 * Server-only module.
 */

import ZAI from 'z-ai-web-dev-sdk'

const VECTOR_DIM = 128

/**
 * Generate an embedding vector for the given text.
 *
 * Strategy:
 * 1. Ask the LLM to produce a concise keyword summary.
 * 2. Hash the keywords into a 128-dimensional normalized vector.
 *
 * Returns null if the LLM call fails (logged as warning).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Summarize this in 10 keywords, separated by spaces only: ${text.slice(0, 500)}`,
        },
      ],
      max_tokens: 100,
    })

    const content = response.choices?.[0]?.message?.content ?? ''
    if (!content.trim()) {
      console.warn('[Embedding] Empty response from LLM')
      return null
    }

    return textToVector(content)
  } catch (error) {
    console.warn('[Embedding] Failed to generate embedding:', error)
    return null
  }
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Parse a JSON-serialized embedding string back to a number array.
 * Returns null if parsing fails.
 */
export function parseEmbedding(jsonStr: string | null | undefined): number[] | null {
  if (!jsonStr) return null
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Convert text to a normalized 128-dimensional vector using word hashing.
 *
 * Each word is hashed to an index in [0, 127] and the count at that index
 * is incremented. The final vector is L2-normalized.
 */
function textToVector(text: string): number[] {
  const vector = new Array<number>(VECTOR_DIM).fill(0)
  const words = text.toLowerCase().split(/\s+/)

  for (const word of words) {
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0
    }
    const idx = Math.abs(hash) % VECTOR_DIM
    vector[idx] += 1
  }

  // L2 normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1
  return vector.map((v) => v / magnitude)
}
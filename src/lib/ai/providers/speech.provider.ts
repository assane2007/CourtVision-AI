/**
 * Speech Provider (TTS/ASR)
 * Wraps z-ai-web-dev-sdk for speech-to-text and text-to-speech.
 * Handles language detection, format conversion, and error classification.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { logger } from '@/lib/logger'
import {
  type TranscriptResult,
  type AudioBuffer,
  AiError,
} from '../types'

const MAX_AUDIO_BASE64_LENGTH = 10_000_000
const MAX_TTS_INPUT_LENGTH = 500

// ── ASR (Speech-to-Text) ───────────────────────────────────────────────────────

/**
 * Transcribe audio from a base64-encoded file.
 * Supports common formats: WAV, MP3, WebM, OGG.
 */
export async function transcribe(
  audioBase64: string,
  language?: string,
): Promise<TranscriptResult> {
  // Validate input
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw createAiError('invalid_input', 'Audio data is required (base64 string)', false, 400)
  }

  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    throw createAiError('invalid_input', `Audio too large: ${(audioBase64.length / 1_000_000).toFixed(1)}MB. Max 10MB.`, false, 413)
  }

  const startTime = Date.now()
  logger.debug(`ASR call: lang=${language ?? 'auto'}, size=${(audioBase64.length / 1000).toFixed(0)}KB`, 'ai.speech')

  try {
    const zai = await ZAI.create()
    const transcription = await zai.audio.asr.create({ file_base64: audioBase64 }) as unknown as Record<string, unknown>

    const text = typeof transcription === 'string'
      ? transcription
      : String(transcription?.text || '')

    const durationSec = (Date.now() - startTime) / 1000

    // Derive ASR confidence from the transcription result.
    // Heuristic based on transcription completeness:
    // - Empty or very short (< 5 chars) → low confidence (0.7), likely noise/silence
    // - Short (5–20 chars) → moderate-low (0.75)
    // - Medium (20–100 chars) → moderate (0.82)
    // - Long (100+ chars) → high (0.88–0.93), indicating clear speech was captured
    // If the ASR response itself provides a confidence field, use it (clamped 0–1).
    let confidence = 0.9
    const rawConfidence = transcription?.confidence
    if (typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)) {
      confidence = Math.max(0, Math.min(1, rawConfidence))
    } else {
      const textLen = text.trim().length
      if (textLen === 0) {
        confidence = 0.7
      } else if (textLen < 5) {
        confidence = 0.75
      } else if (textLen < 20) {
        confidence = 0.78
      } else if (textLen < 100) {
        confidence = 0.82 + ((textLen - 20) / 80) * 0.06
      } else {
        confidence = 0.88 + Math.min(0.05, ((textLen - 100) / 400) * 0.05)
      }
    }

    const result: TranscriptResult = {
      text: String(text).slice(0, 2000),
      language: language ?? detectLanguage(text),
      confidence,
      durationSec: Math.round(durationSec * 10) / 10,
    }

    logger.info(`ASR success: ${result.text.length} chars, lang=${result.language}, took ${durationSec.toFixed(1)}s`, 'ai.speech')

    return result
  } catch (err: unknown) {
    logger.error('ASR failed', 'ai.speech', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw classifyAsrError(err)
  }
}

// ── TTS (Text-to-Speech) ───────────────────────────────────────────────────────

/**
 * Convert text to speech audio.
 * Returns base64-encoded audio data.
 */
export async function speak(
  text: string,
  voice?: string,
): Promise<AudioBuffer> {
  if (!text || typeof text !== 'string') {
    throw createAiError('invalid_input', 'Text input is required for TTS', false, 400)
  }

  // Truncate long text for TTS
  const truncated = text.slice(0, MAX_TTS_INPUT_LENGTH)
  if (text.length > MAX_TTS_INPUT_LENGTH) {
    logger.warn(`TTS input truncated from ${text.length} to ${MAX_TTS_INPUT_LENGTH} chars`, 'ai.speech')
  }

  logger.debug(`TTS call: input_len=${truncated.length}, voice=${voice ?? 'default'}`, 'ai.speech')

  try {
    const zai = await ZAI.create()
    const audioResponse = await zai.audio.tts.create({ input: truncated }) as unknown as Record<string, unknown>

    const base64 = typeof audioResponse === 'string' ? String(audioResponse) : ''

    // Estimate duration: ~150 words/min average speech rate
    const wordCount = truncated.split(/\s+/).length
    const estimatedDurationMs = Math.round((wordCount / 150) * 60 * 1000)

    const result: AudioBuffer = {
      base64,
      format: 'mp3',
      durationMs: estimatedDurationMs,
    }

    logger.info(`TTS success: ${base64.length} chars audio, ~${(estimatedDurationMs / 1000).toFixed(1)}s`, 'ai.speech')

    return result
  } catch (err: unknown) {
    logger.error('TTS failed', 'ai.speech', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw classifyTtsError(err)
  }
}

// ── Language Detection ──────────────────────────────────────────────────────────

/**
 * Simple heuristic language detection from transcribed text.
 * Not perfect, but good enough for French vs English basketball context.
 */
function detectLanguage(text: string): string {
  if (!text) return 'unknown'

  // Count French-specific characters and words
  const frenchChars = (text.match(/[àâäéèêëïîôùûüÿçœæ]/gi) || []).length
  const frenchWords = (text.match(
    /\b(le|la|les|de|des|du|un|une|et|est|en|que|qui|dans|pour|pas|sur|ce|il|elle|nous|vous|ils|elles|mais|ou|donc|ni|car|avec|son|sa|ses|mon|ma|mes|ton|ta|tes|notre|votre|leur|cette|ces|tout|tous|toute|toutes|aussi|plus|très|bien|fait|faites|peux|peut|sont)\b/gi,
  ) || []).length

  const totalWords = text.split(/\s+/).length
  if (totalWords === 0) return 'unknown'

  const frenchScore = (frenchChars * 3 + frenchWords * 2) / totalWords

  return frenchScore > 0.5 ? 'fr' : 'en'
}

// ── Error Classification ────────────────────────────────────────────────────────

function classifyAsrError(err: unknown): AiError {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('rate limit') || message.includes('429')) {
      return createAiError('rate_limit', `ASR rate limited: ${err.message}`, true, 429, err, 5000)
    }

    if (message.includes('unsupported') || message.includes('format') || message.includes('invalid')) {
      return createAiError('invalid_input', `ASR invalid audio: ${err.message}`, false, 400, err)
    }

    if (message.includes('empty') || message.includes('no speech') || message.includes('silence')) {
      return createAiError('invalid_input', `ASR no speech detected: ${err.message}`, false, 400, err)
    }
  }

  return createAiError('model_error', `ASR error: ${String(err)}`, true, 500, err)
}

function classifyTtsError(err: unknown): AiError {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('rate limit') || message.includes('429')) {
      return createAiError('rate_limit', `TTS rate limited: ${err.message}`, true, 429, err, 5000)
    }

    if (message.includes('voice') || message.includes('invalid')) {
      return createAiError('invalid_input', `TTS invalid input: ${err.message}`, false, 400, err)
    }
  }

  return createAiError('model_error', `TTS error: ${String(err)}`, true, 500, err)
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
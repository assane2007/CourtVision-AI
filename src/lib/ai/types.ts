/**
 * Unified AI Pipeline Types
 * Core types and interfaces for all AI operations in the basketball training platform.
 */

export type { SubscriptionTier } from '@/lib/types/api.types'
import type { SkillKey } from '@/lib/player/iq-engine'

// ── Language ─────────────────────────────────────────────────────────────────────

export type Lang = 'fr' | 'en'

// ── Form Analysis ───────────────────────────────────────────────────────────────

export interface FormAnalysisRequest {
  playerId: string
  imageBase64: string
  drillName: string
  category: string
  instructions?: string
  lang?: Lang
}

export interface FormAnalysisCategoryScore {
  elbow: number
  knee: number
  alignment: number
  balance: number
  trunk: number
}

export interface FormAnalysisResult {
  overallScore: number
  feedback: string
  issues: string[]
  goodPoints: string[]
  categories: FormAnalysisCategoryScore
  recommendation?: string
  tokenUsage?: TokenUsage
}

// ── Coaching ────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system'

export interface CoachingMessage {
  role: ChatRole
  content: string
  timestamp?: string
}

export interface CoachingContext {
  playerProfile: {
    name: string
    age: number | null
    position: string | null
    heightCm: number | null
    weightKg: number | null
    yearsExperience: number | null
    level: string
    xpLevel: number
    goals: string
  }
  recentSessions: {
    date: string
    score: number
    drills: number
    durationMin: number
  }[]
  stats: {
    skillDNA: Record<SkillKey, number>
    totalSessions: number
    avgScore: number
    currentStreak: number
    totalXP: number
  }
  skills: {
    strengths: SkillKey[]
    weaknesses: SkillKey[]
  }
  lang: Lang
}

export interface CoachingResult {
  reply: string
  tokensUsed?: TokenUsage
}

// ── Predictions ─────────────────────────────────────────────────────────────────

export type PredictionType = 'next_level' | 'injury_risk' | 'performance_trend' | 'plateau_detection'

export interface PredictionResult {
  type: PredictionType
  predictedValue: number | string | null
  confidence: number
  factors: string[]
  recommendation: string
  createdAt?: string
}

// ── Workout Generation ──────────────────────────────────────────────────────────

export interface WorkoutPreferences {
  durationMin?: number
  focusAreas?: string[]
  equipment?: string[]
  intensity?: 'low' | 'medium' | 'high'
  lang?: Lang
}

export interface GeneratedWorkoutDrill {
  drillName: string
  sets: number
  repsPerSet: number
  restSec: number
  reasoning: string
  coachingTip: string
}

export interface GeneratedWorkout {
  id?: string
  title: string
  description: string
  difficulty: string
  durationMin: number
  focusAreas: string[]
  drills: GeneratedWorkoutDrill[]
  warmup: string
  cooldown: string
  expectedOutcome: string
  reasoning?: string
  tokenUsage?: TokenUsage
}

// ── Video Analysis ──────────────────────────────────────────────────────────────

export interface ShotDetection {
  type: 'made' | 'missed' | 'airball' | 'bank'
  x: number
  y: number
  confidence: number
  timestampMs: number
  formScore: number | null
}

export interface VideoFrameAnalysis {
  timestampMs: number
  formScore: number
  feedback: string
  issues: string[]
}

export interface VideoAnalysisResult {
  shots: ShotDetection[]
  formScores: VideoFrameAnalysis[]
  overallFormScore: number
  overallFeedback: string
  tokenUsage?: TokenUsage
}

// ── AI Quota & Rate Limiting ────────────────────────────────────────────────────

export type AiOperationType =
  | 'form_check'
  | 'coaching'
  | 'predictions'
  | 'workout_gen'
  | 'voice'

export interface AiQuota {
  total: number
  used: number
  remaining: number
  resetAt: string
  tier: SubscriptionTier
}

export interface AiRateLimitConfig {
  maxRequestsPerHour: number
  subscriptionMultiplier: Record<SubscriptionTier, number>
}

// ── Token Usage & Cost Tracking ─────────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  model: string
}

// ── Provider Types ──────────────────────────────────────────────────────────────

export interface VisionRequest {
  imageBase64: string
  prompt: string
  systemPrompt?: string
  responseFormat?: 'json_object' | 'text'
  model?: string
  timeoutMs?: number
}

export interface VisionResponse {
  content: string
  tokenUsage: TokenUsage
}

export interface AnalysisResult {
  text: string
  confidence: number
  metadata?: Record<string, unknown>
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ChatContentPart[]
}

export interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  model?: string
  responseFormat?: 'json_object' | 'text'
  timeoutMs?: number
}

export interface TranscriptResult {
  text: string
  language: string
  confidence: number
  durationSec: number
}

export interface AudioBuffer {
  base64: string
  format: string
  durationMs: number
}

// ── Error Types ─────────────────────────────────────────────────────────────────

export type AiErrorType = 'rate_limit' | 'invalid_input' | 'model_error' | 'timeout' | 'quota_exceeded' | 'parse_error' | 'unknown'

export class AiError extends Error {
  public readonly type: AiErrorType
  public readonly retryable: boolean
  public readonly retryAfterMs: number
  public readonly statusCode: number

  constructor(
    type: AiErrorType,
    message: string,
    options?: {
      retryable?: boolean
      retryAfterMs?: number
      statusCode?: number
      cause?: unknown
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'AiError'
    this.type = type
    this.retryable = options?.retryable ?? false
    this.retryAfterMs = options?.retryAfterMs ?? 0
    this.statusCode = options?.statusCode ?? 500
  }
}

// ── Subscription Tiers for AI ───────────────────────────────────────────────────

export const AI_TIER_MULTIPLIERS: Record<SubscriptionTier, number> = {
  free: 1,
  pro: 3,
  elite: 10,
}

export const AI_RATE_LIMITS: Record<AiOperationType, { perHour: number; description: { fr: string; en: string } }> = {
  form_check: {
    perHour: 20,
    description: { fr: 'Analyses de forme', en: 'Form analyses' },
  },
  coaching: {
    perHour: 30,
    description: { fr: 'Messages coaching', en: 'Coaching messages' },
  },
  predictions: {
    perHour: 10,
    description: { fr: 'Prédictions IA', en: 'AI predictions' },
  },
  workout_gen: {
    perHour: 10,
    description: { fr: 'Générations de plans', en: 'Workout generations' },
  },
  voice: {
    perHour: 15,
    description: { fr: 'Sessions vocales', en: 'Voice sessions' },
  },
}
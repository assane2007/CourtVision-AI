/**
 * AI Pipeline Orchestrator
 * Central entry point for all AI operations.
 * Provides a unified interface: aiPipeline.form.analyze(), aiPipeline.coaching.reply(), etc.
 * Also handles quota management and usage tracking.
 */

import type { SubscriptionTier, AiQuota, AiOperationType } from './types';
import { getQuota as getQuotaFromLimiter, checkQuota, trackUsage } from './rate-limiter';

// Service imports
import * as formAnalysisService from './services/form-analysis.service';
import * as coachingService from './services/coaching.service';
import * as predictionService from './services/prediction.service';
import * as workoutGeneratorService from './services/workout-generator.service';
import * as videoAnalysisService from './services/video-analysis.service';

// Re-export types for convenience
export type {
  FormAnalysisRequest,
  FormAnalysisResult,
  CoachingContext,
  CoachingResult,
  PredictionResult,
  PredictionType,
  GeneratedWorkout,
  WorkoutPreferences,
  VideoAnalysisResult,
  VideoFrameAnalysis,
  ShotDetection,
  AiQuota,
  AiOperationType,
  TokenUsage,
  Lang,
} from './types'

export type { AiError } from './types'

// Re-export providers for direct use if needed
export { analyzeImage, analyzeVideoFrame } from './providers/vision.provider'
export { chat, chatWithStructure, trimHistory, estimateCallCost } from './providers/language.provider'
export { transcribe, speak } from './providers/speech.provider'

// ── Pipeline Definition ───────────────────────────────────────────────────────

/**
 * The main AI pipeline object.
 * Use this as the single entry point for all AI operations.
 *
 * @example
 * // Form analysis
 * const result = await aiPipeline.form.analyze(request, playerTier)
 *
 * // Coaching reply
 * const reply = await aiPipeline.coaching.reply(playerId, message, playerTier)
 *
 * // Generate workout
 * const workout = await aiPipeline.workouts.generate(playerId, preferences, playerTier)
 *
 * // Check quota
 * const quota = await aiPipeline.getQuota(playerId, tier)
 */
export const aiPipeline = {
  // ── Form Analysis ──────────────────────────────────────────────────────────
  form: {
    /**
     * Analyze a player's basketball form from an image.
     */
    analyze: formAnalysisService.analyzeForm,
  },

  // ── Coaching ──────────────────────────────────────────────────────────────
  coaching: {
    /**
     * Send a message to the AI coach and get a response.
     */
    reply: coachingService.coachReply,

    /**
     * Get the coaching context for a player (without making an AI call).
     */
    getContext: coachingService.getCoachingContext,
  },

  // ── Predictions ───────────────────────────────────────────────────────────
  predictions: {
    /**
     * Generate player progression predictions.
     */
    predict: predictionService.predictProgression,
  },

  // ── Workouts ──────────────────────────────────────────────────────────────
  workouts: {
    /**
     * Generate a personalized workout plan.
     */
    generate: workoutGeneratorService.generateWorkout,
  },

  // ── Video Analysis ────────────────────────────────────────────────────────
  video: {
    /**
     * Analyze multiple video frames for form scoring.
     */
    analyzeFrames: videoAnalysisService.analyzeVideoFrames,

    /**
     * Detect shots in a single video frame.
     */
    detectShot: videoAnalysisService.detectShotsInFrame,
  },

  // ── Quota Management ──────────────────────────────────────────────────────
  /**
   * Get quota information for a player across all AI operation types.
   */
  async getQuota(playerId: string, tier: SubscriptionTier = 'free'): Promise<Record<AiOperationType, AiQuota>> {
    return getQuotaFromLimiter(playerId, tier)
  },

  /**
   * Check if a player has quota remaining for a specific AI operation.
   */
  async checkQuota(playerId: string, type: AiOperationType, tier: SubscriptionTier = 'free'): Promise<boolean> {
    return checkQuota(playerId, type, tier)
  },

  /**
   * Track AI usage (called internally by services, exposed for manual tracking).
   */
  async trackUsage(playerId: string, type: AiOperationType, tokens: number = 0): Promise<void> {
    await trackUsage(playerId, type, tokens)
  },
}
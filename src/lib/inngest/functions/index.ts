/**
 * Inngest function definitions for event-driven async task processing.
 *
 * Each function wraps an existing processor from `@/lib/queue/processors`
 * and adds Inngest-specific retry/backoff configuration and step-level
 * idempotency where possible.
 */

import { inngest } from '@/lib/inngest/client';
import {
  processVideoAnalysis,
  processFormAnalysis,
  processNotificationSend,
  processExportGeneration,
  processInsightRefresh,
} from '@/lib/queue/processors';
import { logger } from '@/lib/monitoring/logger';

// ── Shared retry configuration ────────────────────────────────────────────────

const RETRY_CONFIG = {
  maxAttempts: 3,
  backoff: { type: 'exponential' as const, initialDelay: 1000, maxDelay: 30_000 },
}

// ── Video Processing ──────────────────────────────────────────────────────────

export const videoProcessing = inngest.createFunction(
  {
    id: 'video-processing',
    name: 'Video Processing Pipeline',
    retries: RETRY_CONFIG.maxAttempts,
    retry: {
      delay: RETRY_CONFIG.backoff.initialDelay,
      maxRetries: RETRY_CONFIG.maxAttempts,
    },
  },
  { event: 'video.processing.requested' },
  async ({ event, step }) => {
    const { videoId, playerId } = event.data

    try {
      const result = await step.run('process-video-analysis', async () => {
        return processVideoAnalysis({
          videoId,
          playerId,
          sessionId: event.data.sessionId,
          options: event.data.options,
        })
      })

      logger.info(
        `Completed video processing`,
        'inngest:video',
        { videoId, playerId },
      )

      return { success: true, videoId, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        `Failed video processing: ${message}`,
        'inngest:video',
        { videoId, playerId },
      )
      throw error
    }
  },
)

// ── Form Analysis ─────────────────────────────────────────────────────────────

export const formAnalysis = inngest.createFunction(
  {
    id: 'form-analysis',
    name: 'Form Analysis Pipeline',
    retries: RETRY_CONFIG.maxAttempts,
    retry: {
      delay: RETRY_CONFIG.backoff.initialDelay,
      maxRetries: RETRY_CONFIG.maxAttempts,
    },
  },
  { event: 'form.analysis.requested' },
  async ({ event, step }) => {
    const { videoId, playerId } = event.data

    try {
      const result = await step.run('process-form-analysis', async () => {
        return processFormAnalysis({
          videoId,
          playerId,
          drillId: event.data.drillId,
          frameData: event.data.frameData,
        })
      })

      logger.info(
        'Completed form analysis',
        'inngest:form',
        { videoId, playerId, score: result.score },
      )

      return { success: true, videoId, score: result.score }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        `Failed form analysis: ${message}`,
        'inngest:form',
        { videoId, playerId },
      )
      throw error
    }
  },
)

// ── Notification Send ─────────────────────────────────────────────────────────

export const notificationSend = inngest.createFunction(
  {
    id: 'notification-send',
    name: 'Send Notification',
    retries: RETRY_CONFIG.maxAttempts,
    retry: {
      delay: RETRY_CONFIG.backoff.initialDelay,
      maxRetries: RETRY_CONFIG.maxAttempts,
    },
  },
  { event: 'notification.send' },
  async ({ event, step }) => {
    const { playerId, title, type } = event.data

    try {
      await step.run('send-notification', async () => {
        return processNotificationSend({
          playerId,
          title: event.data.title,
          body: event.data.body,
          type: event.data.type,
          data: event.data.data as Record<string, unknown> | undefined,
        })
      })

      logger.info(
        'Sent notification',
        'inngest:notification',
        { playerId, type, title },
      )

      return { success: true, playerId, type }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        `Failed to send ${type} notification: ${message}`,
        'inngest:notification',
        { playerId, type },
      )
      throw error
    }
  },
)

// ── Export Generation ─────────────────────────────────────────────────────────

export const exportGeneration = inngest.createFunction(
  {
    id: 'export-generation',
    name: 'Video Export Generation',
    retries: RETRY_CONFIG.maxAttempts,
    retry: {
      delay: RETRY_CONFIG.backoff.initialDelay,
      maxRetries: RETRY_CONFIG.maxAttempts,
    },
  },
  { event: 'export.generation.requested' },
  async ({ event, step }) => {
    const { videoId, playerId, format, quality } = event.data

    try {
      const result = await step.run('generate-export', async () => {
        return processExportGeneration({
          videoId,
          playerId,
          format,
          quality,
          annotations: event.data.annotations,
        })
      })

      logger.info(
        'Generated export',
        'inngest:export',
        { videoId, exportId: result.exportId, format, quality },
      )

      return { success: true, videoId, exportId: result.exportId, format }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        `Failed export generation: ${message}`,
        'inngest:export',
        { videoId, format },
      )
      throw error
    }
  },
)

// ── Insight Refresh ───────────────────────────────────────────────────────────

export const insightRefresh = inngest.createFunction(
  {
    id: 'insight-refresh',
    name: 'Player Insight Refresh',
    retries: RETRY_CONFIG.maxAttempts,
    retry: {
      delay: RETRY_CONFIG.backoff.initialDelay,
      maxRetries: RETRY_CONFIG.maxAttempts,
    },
  },
  { event: 'insight.refresh.requested' },
  async ({ event, step }) => {
    const { playerId, force } = event.data

    try {
      await step.run('refresh-insights', async () => {
        return processInsightRefresh({
          playerId,
          force,
          insights: event.data.insights,
        })
      })

      logger.info(
        'Refreshed insights',
        'inngest:insight',
        { playerId, force: force ?? false },
      )

      return { success: true, playerId }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        `Failed insight refresh: ${message}`,
        'inngest:insight',
        { playerId },
      )
      throw error
    }
  },
)

// ── Player Welcome ────────────────────────────────────────────────────────────

export const playerWelcome = inngest.createFunction(
  {
    id: 'player-welcome',
    name: 'Player Welcome Flow',
    retries: RETRY_CONFIG.maxAttempts,
    retry: {
      delay: RETRY_CONFIG.backoff.initialDelay,
      maxRetries: RETRY_CONFIG.maxAttempts,
    },
  },
  { event: 'player.welcome' },
  async ({ event, step }) => {
    const { playerId, email, name } = event.data

    try {
      await step.run('send-welcome-notification', async () => {
        return processNotificationSend({
          playerId,
          title: 'Welcome to CourtVision AI! 🏀',
          body: `Hey ${name}, welcome aboard! Start by recording your first workout session and let our AI coach analyze your form.`,
          type: 'in_app',
        })
      })

      logger.info(
        'Sent welcome notification',
        'inngest:welcome',
        { playerId, email },
      )

      return { success: true, playerId }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(
        `Failed welcome flow: ${message}`,
        'inngest:welcome',
        { playerId },
      )
      throw error
    }
  },
)
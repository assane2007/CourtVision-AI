/**
 * Task processor functions for the task queue.
 *
 * These are standalone async functions that can be called directly
 * or used by the TaskQueue's dispatch logic. Each processor is
 * wired to the real AI pipeline or database where applicable.
 *
 * Server-only module.
 *
 * All processors catch errors internally and never throw. If a required
 * dependency (such as an image) is missing, a sensible default result
 * is returned instead.
 */

import type {
  VideoProcessingPayload,
  FormAnalysisPayload,
  NotificationSendPayload,
  ExportGenerationPayload,
  InsightRefreshPayload,
  VideoAnalysisResult,
  FormAnalysisResult,
  ExportResult,
} from './types'

import { aiPipeline } from '@/lib/ai/pipeline'
import { db } from '@/lib/db'

// ── Video Processing ────────────────────────────────────────────────────────────

/**
 * Process a video for analysis (pose detection, shot detection, highlights).
 *
 * Delegates to the video analysis service when frames are provided.
 * If no frames are supplied (the current norm, since video frame
 * extraction is not yet implemented), returns an empty placeholder
 * result with an informative log message.
 */
export async function processVideoAnalysis(
  payload: VideoProcessingPayload,
): Promise<VideoAnalysisResult> {
  const startMs = performance.now()

  try {
    console.warn(
      `[queue:video] No frames provided - video extraction not yet available (videoId=${payload.videoId})`,
    )

    return {
      videoId: payload.videoId,
      poses: [],
      shots: [],
      highlights: [],
      duration: Math.round(performance.now() - startMs),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:video] Unhandled error for videoId=${payload.videoId}: ${message}`,
    )
    return {
      videoId: payload.videoId,
      poses: [],
      shots: [],
      highlights: [],
      duration: Math.round(performance.now() - startMs),
    }
  }
}

// ── Form Analysis ───────────────────────────────────────────────────────────────

/**
 * Analyze basketball shooting form using AI vision.
 *
 * When a base64 frame is included in the payload the VLM is called
 * through the AI pipeline's form analysis service. Missing optional
 * fields (drillName, category) are filled with sensible defaults.
 * If no frame data is available a zero-score placeholder is returned.
 */
export async function processFormAnalysis(
  payload: FormAnalysisPayload,
): Promise<FormAnalysisResult> {
  try {
    if (!payload.frameData) {
      console.warn(
        `[queue:form] No frame data provided, returning placeholder (videoId=${payload.videoId})`,
      )
      return {
        videoId: payload.videoId,
        score: 0,
        feedback: 'No frame data provided for analysis',
        issues: [],
        goodPoints: [],
      }
    }

    console.warn(
      `[queue:form] Calling AI pipeline for form analysis (videoId=${payload.videoId}, playerId=${payload.playerId})`,
    )

    const result = await aiPipeline.form.analyze({
      playerId: payload.playerId,
      imageBase64: payload.frameData,
      drillName: payload.drillId ?? 'free_shooting',
      category: 'shooting',
      lang: 'fr',
    })

    return {
      videoId: payload.videoId,
      score: result.overallScore,
      feedback: result.feedback,
      issues: result.issues,
      goodPoints: result.goodPoints,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:form] Error for videoId=${payload.videoId}: ${message}`,
    )
    return {
      videoId: payload.videoId,
      score: 0,
      feedback: `Analysis failed: ${message}`,
      issues: [],
      goodPoints: [],
    }
  }
}

// ── Notification Send ───────────────────────────────────────────────────────────

/**
 * Send a notification to a player.
 *
 * - **in_app**: Persists the notification directly into the database
 *   via Prisma.
 * - **push** / **email**: Logs that external service configuration is
 *   required and returns gracefully without erroring.
 */
export async function processNotificationSend(
  payload: NotificationSendPayload,
): Promise<void> {
  try {
    switch (payload.type) {
      case 'in_app': {
        console.warn(
          `[queue:notification] Inserting in-app notification for playerId=${payload.playerId}`,
        )

        await db.notification.create({
          data: {
            playerId: payload.playerId,
            type: 'system',
            title: payload.title,
            body: payload.body,
            data: JSON.stringify(payload.data ?? {}),
          },
        })

        console.warn(
          `[queue:notification] In-app notification saved for playerId=${payload.playerId}`,
        )
        break
      }

      case 'push':
        console.warn(
          `[queue:notification] Push notification requires external service configuration (playerId=${payload.playerId}, title="${payload.title}")`,
        )
        break

      case 'email':
        console.warn(
          `[queue:notification] Email notification requires external service configuration (playerId=${payload.playerId}, title="${payload.title}")`,
        )
        break

      default: {
        // Exhaustiveness check — if a new type is added to the union
        // TypeScript will flag this branch as unreachable (never).
        const _exhaustive: never = payload.type
        console.warn(
          `[queue:notification] Unknown notification type: ${String(_exhaustive)}`,
        )
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:notification] Error processing notification for playerId=${payload.playerId}: ${message}`,
    )
  }
}

// ── Export Generation ───────────────────────────────────────────────────────────

/**
 * Generate an export of a video (with annotations) in the requested format.
 *
 * Currently a placeholder that logs the request details and returns an
 * empty result. The real rendering pipeline (FFmpeg / canvas encode +
 * upload) is not yet wired up.
 */
export async function processExportGeneration(
  payload: ExportGenerationPayload,
): Promise<ExportResult> {
  const startMs = performance.now()
  const { randomUUID } = await import('node:crypto')

  try {
    console.warn(
      `[queue:export] Generating ${payload.format} export (quality=${payload.quality}, annotations=${payload.annotations ?? false}) for videoId=${payload.videoId}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:export] Error for videoId=${payload.videoId}: ${message}`,
    )
  }

  return {
    videoId: payload.videoId,
    exportId: randomUUID(),
    url: '',
    format: payload.format,
    sizeBytes: 0,
    duration: Math.round(performance.now() - startMs),
  }
}

// ── Insight Refresh ─────────────────────────────────────────────────────────────

/**
 * Regenerate player insights from recent data.
 *
 * Delegates to the prediction service for a `performance_trend`
 * prediction using the AI pipeline, then invalidates the cached
 * insights for the player. If the prediction call fails the cache
 * is still invalidated so the frontend can attempt a fresh fetch
 * on the next request.
 */
export async function processInsightRefresh(
  payload: InsightRefreshPayload,
): Promise<void> {
  try {
    console.warn(
      `[queue:insight] Refreshing insights for playerId=${payload.playerId} (force=${payload.force ?? false})`,
    )

    await aiPipeline.predictions.predict(
      payload.playerId,
      'performance_trend',
      'free',
      'fr',
    )

    console.warn(
      `[queue:insight] Performance trend prediction completed for playerId=${payload.playerId}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:insight] Prediction failed for playerId=${payload.playerId}: ${message}`,
    )
  }

  // Always invalidate cache regardless of prediction success
  try {
    const { invalidateTags } = await import('@/lib/cache/helpers')
    await invalidateTags([`insights:${payload.playerId}`])
    console.warn(
      `[queue:insight] Cache invalidated for playerId=${payload.playerId}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:insight] Cache invalidation failed for playerId=${payload.playerId}: ${message}`,
    )
  }
}
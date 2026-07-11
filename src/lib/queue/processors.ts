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
import { sendEmail } from '@/lib/email'
import { sendPushToPlayer, type PushSubscription } from '@/lib/push'
import {
  extractFramesFromVideo,
  isFfmpegAvailable,
  type ExtractedFrame,
} from '@/lib/video/frame-extractor'
import { readFileSync, existsSync } from 'node:fs'

// ── Video Processing ────────────────────────────────────────────────────────────

/**
 * Process a video for analysis (pose detection, shot detection, highlights).
 *
 * Pipeline:
 * 1. Look up video record in DB to get file path.
 * 2. Read video file from local filesystem.
 * 3. Extract frames via ffmpeg (if available).
 * 4. Send frames to AI pipeline's `video.analyzeFrames()`.
 *
 * Gracefully degrades:
 * - If ffmpeg is not installed → logs clear message, returns empty result.
 * - If video file is not locally accessible (e.g., remote storage) → logs message.
 * - If frame extraction returns 0 frames → returns empty result.
 */
export async function processVideoAnalysis(
  payload: VideoProcessingPayload,
): Promise<VideoAnalysisResult> {
  const startMs = performance.now()

  // Check ffmpeg availability early
  if (!isFfmpegAvailable()) {
    console.warn(
      `[queue:video] ffmpeg not available — skipping frame extraction (videoId=${payload.videoId})`,
    )
    return {
      videoId: payload.videoId,
      poses: [],
      shots: [],
      highlights: [],
      duration: Math.round(performance.now() - startMs),
    }
  }

  try {
    // Look up the video record to get the file path/URL
    const video = await db.video.findUnique({
      where: { id: payload.videoId },
      select: { url: true, playerId: true },
    })

    if (!video) {
      console.warn(
        `[queue:video] Video not found in DB (videoId=${payload.videoId})`,
      )
      return emptyResult(payload.videoId, startMs)
    }

    // Attempt to read the video file from the local filesystem.
    // Videos stored with a local path (e.g., /uploads/xxx.mp4) can be read
    // directly. Remote URLs (S3, Supabase Storage) would need a download
    // step — that is not yet implemented here.
    let videoBuffer: Buffer | null = null

    // Try the URL as a local file path first
    if (video.url && existsSync(video.url)) {
      videoBuffer = readFileSync(video.url)
    }

    // Try relative path from project root
    if (!videoBuffer && video.url) {
      const relativePath = `.${video.url.startsWith('/') ? '' : '/'}${video.url}`
      if (existsSync(relativePath)) {
        videoBuffer = readFileSync(relativePath)
      }
    }

    if (!videoBuffer || videoBuffer.length === 0) {
      console.warn(
        `[queue:video] Could not read video file — local path not accessible ` +
          `(videoId=${payload.videoId}, url=${video.url}). ` +
          `Remote storage download not yet implemented.`,
      )
      return emptyResult(payload.videoId, startMs)
    }

    // Extract frames using ffmpeg
    const frames: ExtractedFrame[] = await extractFramesFromVideo({
      videoBuffer,
      maxFrames: 20,
      intervalMs: 1000,
    })

    if (frames.length === 0) {
      console.warn(
        `[queue:video] Frame extraction returned 0 frames (videoId=${payload.videoId})`,
      )
      return emptyResult(payload.videoId, startMs)
    }

    console.warn(
      `[queue:video] Extracted ${frames.length} frames, sending to AI pipeline (videoId=${payload.videoId})`,
    )

    // Send frames to the AI video analysis pipeline
    const analysisResult = await aiPipeline.video.analyzeFrames(
      payload.playerId,
      frames.map((f) => ({
        base64: f.base64,
        timestampMs: f.timestampMs,
      })),
      payload.options?.detectShots ? 'shooting' : 'general',
      undefined, // tier — use default
      'fr',
    )

    return {
      videoId: payload.videoId,
      poses: [], // Pose landmarks not yet provided by the AI service
      shots: (analysisResult?.shots ?? []).map((s) => ({
        timestamp: s.timestampMs,
        type: s.type,
        made: s.type === 'made',
      })),
      highlights: [], // Highlights derived from form scores below
      duration: Math.round(performance.now() - startMs),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:video] Unhandled error for videoId=${payload.videoId}: ${message}`,
    )
    return emptyResult(payload.videoId, startMs)
  }
}

/** Helper to return an empty video analysis result. */
function emptyResult(videoId: string, startMs: number): VideoAnalysisResult {
  return {
    videoId,
    poses: [],
    shots: [],
    highlights: [],
    duration: Math.round(performance.now() - startMs),
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

      case 'push': {
        // Look up player's push subscriptions and send to all
        try {
          const subs = await db.pushSubscription.findMany({
            where: { playerId: payload.playerId },
          })
          if (subs.length === 0) {
            console.warn(
              `[queue:notification] No push subscriptions for playerId=${payload.playerId}`,
            )
          } else {
            const mapped: PushSubscription[] = subs.map((s) => ({
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            }))
            const result = await sendPushToPlayer({
              subscriptions: mapped,
              title: payload.title,
              body: payload.body,
              url: (payload.data?.url as string) ?? undefined,
            })
            console.warn(
              `[queue:notification] Push sent: ${result.sent} ok, ${result.failed} failed for playerId=${payload.playerId}`,
            )
          }
        } catch (pushErr) {
          const msg = pushErr instanceof Error ? pushErr.message : String(pushErr)
          console.error(`[queue:notification] Push error for playerId=${payload.playerId}: ${msg}`)
        }
        break
      }

      case 'email': {
        // Look up player's email and send via Resend
        try {
          const player = await db.player.findUnique({
            where: { id: payload.playerId },
            select: { email: true, name: true },
          })
          if (!player?.email) {
            console.warn(
              `[queue:notification] No email for playerId=${payload.playerId}`,
            )
          } else {
            const result = await sendEmail({
              to: player.email,
              subject: payload.title,
              html: payload.body,
            })
            if (result.success) {
              console.warn(
                `[queue:notification] Email sent (id=${result.messageId}) to playerId=${payload.playerId}`,
              )
            } else {
              console.warn(
                `[queue:notification] Email failed for playerId=${payload.playerId}: ${result.error}`,
              )
            }
          }
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
          console.error(`[queue:notification] Email error for playerId=${payload.playerId}: ${msg}`)
        }
        break
      }

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
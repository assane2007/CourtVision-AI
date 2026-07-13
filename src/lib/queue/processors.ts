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
} from './types';

import { aiPipeline } from '@/lib/ai/pipeline';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { sendPushToPlayer, type PushSubscription } from '@/lib/push';
import {
  extractFramesFromVideo,
  isFfmpegAvailable,
  type ExtractedFrame,
} from '@/lib/video/frame-extractor';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, parse } from 'node:path';
import { randomUUID } from 'node:crypto';

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

/** Directory where generated export files are written. */
const EXPORTS_DIR = join(process.cwd(), 'public', 'uploads', 'exports')

/** Ensure the exports output directory exists. */
function ensureExportsDir(): void {
  if (!existsSync(EXPORTS_DIR)) {
    mkdirSync(EXPORTS_DIR, { recursive: true })
  }
}

/**
 * Build the full JSON export manifest for a video.
 *
 * Contains video metadata, player info, and all annotations parsed
 * into a structured format with scores, timestamps, and types.
 */
function buildJsonExport(
  video: {
    id: string
    title: string
    description: string
    url: string
    thumbnailUrl: string | null
    durationSec: number
    fileSize: number
    mimeType: string
    width: number
    height: number
    createdAt: Date
  },
  player: { id: string; name: string | null } | null,
  annotations: Array<{
    id: string
    type: string
    data: string
    timestampMs: number
    durationMs: number
    createdAt: Date
  }>,
): string {
  // Parse annotation data safely — the `data` column is a JSON string.
  const parsedAnnotations = annotations.map((a) => {
    let parsedData: unknown = null
    try {
      parsedData = JSON.parse(a.data)
    } catch {
      parsedData = a.data
    }
    return {
      id: a.id,
      type: a.type,
      timestampMs: a.timestampMs,
      timestampFormatted: formatTimestampMs(a.timestampMs),
      durationMs: a.durationMs,
      data: parsedData,
      createdAt: a.createdAt.toISOString(),
    }
  })

  // Compute summary stats
  const typeCounts: Record<string, number> = {}
  for (const ann of annotations) {
    typeCounts[ann.type] = (typeCounts[ann.type] ?? 0) + 1
  }

  // Extract any scores from annotation data (form analysis results)
  const scores: number[] = []
  for (const ann of annotations) {
    try {
      const d = JSON.parse(ann.data) as Record<string, unknown>
      if (typeof d.score === 'number') {
        scores.push(d.score)
      }
    } catch {
      // not JSON or no score field
    }
  }

  const exportManifest = {
    _meta: {
      generator: 'CourtVision AI Export Pipeline',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      videoId: video.id,
    },
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      durationSec: video.durationSec,
      fileSize: video.fileSize,
      mimeType: video.mimeType,
      resolution: video.width && video.height
        ? { width: video.width, height: video.height }
        : null,
      createdAt: video.createdAt.toISOString(),
    },
    player: player
      ? { id: player.id, name: player.name }
      : null,
    summary: {
      totalAnnotations: annotations.length,
      annotationTypes: typeCounts,
      scores: scores.length > 0
        ? {
            count: scores.length,
            avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
            min: Math.min(...scores),
            max: Math.max(...scores),
          }
        : null,
    },
    annotations: parsedAnnotations,
  }

  return JSON.stringify(exportManifest, null, 2)
}

/**
 * Build a CSV export with one row per annotation.
 *
 * Columns: annotationId, type, timestampMs, timestampFormatted,
 * durationMs, createdAt, and a JSON blob of the annotation data.
 * Includes a header row and a video summary as the first row.
 */
function buildCsvExport(
  video: {
    id: string
    title: string
    durationSec: number
    createdAt: Date
  },
  annotations: Array<{
    id: string
    type: string
    data: string
    timestampMs: number
    durationMs: number
    createdAt: Date
  }>,
): string {
  const rows: string[][] = []

  // Header
  rows.push([
    'annotationId',
    'type',
    'timestampMs',
    'timestampFormatted',
    'durationMs',
    'data',
    'createdAt',
  ])

  // One row per annotation
  for (const a of annotations) {
    // Parse data and flatten score/feedback if present
    let dataStr = a.data
    try {
      const d = JSON.parse(a.data) as Record<string, unknown>
      // For CSV readability, extract score into its own column approach
      // but keep data as a single JSON column for completeness
      dataStr = JSON.stringify(d)
    } catch {
      // keep raw
    }

    rows.push([
      a.id,
      a.type,
      String(a.timestampMs),
      formatTimestampMs(a.timestampMs),
      String(a.durationMs),
      csvEscape(dataStr),
      a.createdAt.toISOString(),
    ])
  }

  // Build CSV with CRLF line endings for Excel compatibility
  return rows.map((row) => row.join(',')).join('\r\n') + '\r\n'
}

/** Escape a value for CSV: wrap in quotes and double internal quotes. */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Format milliseconds into mm:ss.SSS string. */
function formatTimestampMs(ms: number): string {
  const totalSec = ms / 1000
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`
}

/**
 * Write a sidecar annotation file next to the video file.
 *
 * If the video exists on the local filesystem at its stored URL,
 * a `.cv-annotations.json` file is written adjacent to it containing
 * a lightweight annotation index.
 */
function writeSidecarAnnotationFile(
  videoUrl: string,
  videoId: string,
  annotations: Array<{
    id: string
    type: string
    data: string
    timestampMs: number
    durationMs: number
  }>,
): void {
  if (!videoUrl) return

  // Try to resolve as local path
  const candidates = [videoUrl]
  if (!videoUrl.startsWith('/')) {
    candidates.unshift(join(process.cwd(), videoUrl))
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const { dir, name } = parse(candidate)
      const sidecarPath = join(dir, `${name}.cv-annotations.json`)

      const sidecarData = {
        _meta: {
          generator: 'CourtVision AI',
          version: '1.0.0',
          videoId,
        },
        annotations: annotations.map((a) => {
          let parsedData: unknown = a.data
          try { parsedData = JSON.parse(a.data) } catch { /* keep raw */ }
          return {
            id: a.id,
            type: a.type,
            timestampMs: a.timestampMs,
            durationMs: a.durationMs,
            data: parsedData,
          }
        }),
      }

      try {
        writeFileSync(sidecarPath, JSON.stringify(sidecarData, null, 2), 'utf-8')
        console.warn(
          `[queue:export] Sidecar annotation file written: ${sidecarPath}`,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(
          `[queue:export] Could not write sidecar file: ${msg}`,
        )
      }
      return // only write once even if multiple paths match
    }
  }
}

/**
 * Generate an export of a video (with annotations) in the requested format.
 *
 * Supported formats:
 * - **json**: Full analysis export — video metadata, player info, all
 *   annotations with parsed data, and summary statistics.
 * - **csv**: Tabular export — one row per annotation with type, timestamp,
 *   and a JSON data column. Includes a header row.
 * - **mp4 / gif / webm**: Video clip exports are not yet implemented;
 *   the function logs a warning and returns an empty result.
 *
 * Pipeline:
 * 1. Look up the video and its player from the database.
 * 2. Fetch all annotations for the video.
 * 3. Generate the export content (JSON or CSV) in memory.
 * 4. Write the file to `public/uploads/exports/`.
 * 5. Optionally write a sidecar `.cv-annotations.json` next to the
 *    video file if it exists locally.
 * 6. Create or update the VideoExport database record with the URL
 *    and file size.
 *
 * Gracefully degrades:
 * - If the video is not found → returns empty result.
 * - If annotations are missing → still exports video metadata.
 * - If the format is a video format (mp4/gif/webm) → logs and returns empty.
 * - If file write fails → logs error, returns empty result.
 */
export async function processExportGeneration(
  payload: ExportGenerationPayload,
): Promise<ExportResult> {
  const startMs = performance.now()
  const exportId = payload.exportId ?? randomUUID()

  // Only json and csv are supported without ffmpeg
  const dataFormat = payload.format as string
  if (dataFormat !== 'json' && dataFormat !== 'csv') {
    console.warn(
      `[queue:export] Format '${payload.format}' not yet implemented for queue processor (videoId=${payload.videoId}). ` +
        `Use 'json' or 'csv' for data exports, or the API route for video clip exports.`,
    )
    return {
      videoId: payload.videoId,
      exportId,
      url: '',
      format: payload.format,
      sizeBytes: 0,
      duration: Math.round(performance.now() - startMs),
    }
  }

  try {
    console.warn(
      `[queue:export] Generating ${payload.format} export (quality=${payload.quality}, annotations=${payload.annotations ?? false}) for videoId=${payload.videoId}`,
    )

    // 1. Look up video with player
    const video = await db.video.findUnique({
      where: { id: payload.videoId },
      select: {
        id: true,
        playerId: true,
        title: true,
        description: true,
        url: true,
        thumbnailUrl: true,
        durationSec: true,
        fileSize: true,
        mimeType: true,
        width: true,
        height: true,
        createdAt: true,
        player: {
          select: { id: true, name: true },
        },
      },
    })

    if (!video) {
      console.warn(
        `[queue:export] Video not found in DB (videoId=${payload.videoId})`,
      )
      return {
        videoId: payload.videoId,
        exportId,
        url: '',
        format: payload.format,
        sizeBytes: 0,
        duration: Math.round(performance.now() - startMs),
      }
    }

    // 2. Fetch annotations
    const annotations = await db.videoAnnotation.findMany({
      where: { videoId: payload.videoId },
      orderBy: { timestampMs: 'asc' },
    })

    console.warn(
      `[queue:export] Found video "${video.title}" with ${annotations.length} annotation(s) (videoId=${payload.videoId})`,
    )

    // 3. Generate export content
    let fileContent: string
    const fileExtension = dataFormat

    if (dataFormat === 'json') {
      fileContent = buildJsonExport(video, video.player, annotations)
    } else {
      fileContent = buildCsvExport(video, annotations)
    }

    // 4. Write file to disk
    ensureExportsDir()
    const filename = `${video.id}_${exportId.slice(0, 8)}.${fileExtension}`
    const filePath = join(EXPORTS_DIR, filename)
    const publicUrl = `/uploads/exports/${filename}`

    writeFileSync(filePath, fileContent, 'utf-8')
    const sizeBytes = Buffer.byteLength(fileContent, 'utf-8')

    console.warn(
      `[queue:export] Export file written: ${filePath} (${sizeBytes} bytes)`,
    )

    // 5. Write sidecar annotation file if video exists locally
    if (payload.annotations !== false && annotations.length > 0) {
      writeSidecarAnnotationFile(video.url, video.id, annotations)
    }

    // 6. Create or update the VideoExport database record
    try {
      // If an exportId was provided (created by the API route), update it
      if (payload.exportId) {
        await db.videoExport.update({
          where: { id: payload.exportId },
          data: {
            status: 'completed',
            url: publicUrl,
            fileSize: sizeBytes,
            completedAt: new Date(),
          },
        })
        console.warn(
          `[queue:export] Updated VideoExport record ${payload.exportId}`,
        )
      } else {
        // Otherwise create a new record
        await db.videoExport.create({
          data: {
            id: exportId,
            videoId: payload.videoId,
            playerId: payload.playerId,
            type: dataFormat,
            format: dataFormat,
            status: 'completed',
            url: publicUrl,
            fileSize: sizeBytes,
            completedAt: new Date(),
          },
        })
        console.warn(
          `[queue:export] Created VideoExport record ${exportId}`,
        )
      }
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      console.warn(
        `[queue:export] Could not save VideoExport record: ${msg} — file still available at ${publicUrl}`,
      )
    }

    return {
      videoId: payload.videoId,
      exportId,
      url: publicUrl,
      format: payload.format,
      sizeBytes,
      duration: Math.round(performance.now() - startMs),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[queue:export] Error generating ${payload.format} export for videoId=${payload.videoId}: ${message}`,
    )
    return {
      videoId: payload.videoId,
      exportId,
      url: '',
      format: payload.format,
      sizeBytes: 0,
      duration: Math.round(performance.now() - startMs),
    }
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
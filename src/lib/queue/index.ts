/**
 * In-process task queue — fallback when Inngest is not configured.
 *
 * For production async processing, use Inngest (src/lib/inngest/).
 * This in-memory queue is suitable for development only.
 *
 * To use: import { dispatchFormAnalysis } from '@/lib/inngest/dispatch'
 *
 * Features:
 * - Priority-based task execution
 * - Automatic retry with exponential backoff
 * - Concurrent processing (up to 3 workers)
 * - Task status tracking
 * - Statistics and monitoring
 *
 * Server-only module.
 */

import { randomUUID } from 'node:crypto'
import type {
  Task,
  TaskType,
  TaskStatus,
  TaskQueueStats,
} from './types'
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

// ── Configuration ──────────────────────────────────────────────────────────────

const MAX_CONCURRENT = 3
const DEFAULT_MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 1000
const PROCESSING_INTERVAL_MS = 100 // poll interval when idle

// ── Task Queue Implementation ──────────────────────────────────────────────────

export class TaskQueue {
  private queue: Task[] = []
  private processing: Map<string, Task> = new Map()
  private completed: Task[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private totalProcessed = 0
  private totalProcessingTimeMs = 0
  private isProcessing = false

  constructor() {
    this.start()
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Enqueue a new task. Returns the task ID.
   */
  enqueue<T = unknown>(
    type: TaskType,
    payload: T,
    options: { priority?: number; maxRetries?: number } = {},
  ): string {
    const id = `task_${randomUUID().slice(0, 8)}`
    const task: Task = {
      id,
      type,
      payload: payload as Task['payload'],
      priority: options.priority ?? 5,
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    }

    // Insert in priority order (lower number = higher priority)
    let inserted = false
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > task.priority) {
        this.queue.splice(i, 0, task)
        inserted = true
        break
      }
    }
    if (!inserted) {
      this.queue.push(task)
    }

    return id
  }

  /**
   * Get the status of a task.
   */
  getTaskStatus(id: string): TaskStatus | null {
    // Check processing
    const running = this.processing.get(id)
    if (running) return running.status

    // Check pending
    const pending = this.queue.find((t) => t.id === id)
    if (pending) return pending.status

    // Check completed/failed
    const done = this.completed.find((t) => t.id === id)
    if (done) return done.status

    return null
  }

  /**
   * Get the full task object.
   */
  getTask(id: string): Task | undefined {
    return (
      this.processing.get(id) ??
      this.queue.find((t) => t.id === id) ??
      this.completed.find((t) => t.id === id)
    )
  }

  /**
   * Retry all failed tasks up to maxRetries.
   */
  retryFailed(maxRetries?: number): number {
    const failed = this.completed.filter(
      (t) => t.status === 'failed' && t.attempts < (maxRetries ?? t.maxRetries),
    )

    for (const task of failed) {
      task.status = 'pending'
      task.error = undefined
      this.completed = this.completed.filter((t) => t.id !== task.id)
      this.queue.push(task)
    }

    return failed.length
  }

  /**
   * Get queue statistics.
   */
  getStats(): TaskQueueStats {
    const completedCount = this.completed.filter((t) => t.status === 'completed').length
    const failedCount = this.completed.filter((t) => t.status === 'failed').length
    const avgTime = this.totalProcessed > 0 ? Math.round(this.totalProcessingTimeMs / this.totalProcessed) : 0

    return {
      pending: this.queue.length,
      running: this.processing.size,
      completed: completedCount,
      failed: failedCount,
      totalProcessed: this.totalProcessed,
      avgProcessingTimeMs: avgTime,
    }
  }

  /**
   * Process the next pending task.
   * Called automatically by the interval timer, but can be called manually.
   */
  async processNext(): Promise<void> {
    if (this.isProcessing) return

    while (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT) {
      const task = this.queue.shift()!
      this.processing.set(task.id, task)
      this.isProcessing = true

      // Fire-and-forget processing
      this.processTask(task)
        .catch((err) => {
          task.status = 'failed'
          task.error = err instanceof Error ? err.message : String(err)
          this.finalizeTask(task)
        })

      this.isProcessing = false
    }
  }

  /**
   * Stop the task queue and clean up.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async processTask(task: Task): Promise<void> {
    task.status = 'running'
    task.startedAt = Date.now()
    task.attempts++

    try {
      const result = await this.dispatchTask(task)
      task.status = 'completed'
      task.result = result
    } catch (err) {
      if (task.attempts < task.maxRetries) {
        // Retry with exponential backoff
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, task.attempts - 1)
        task.status = 'pending'
        task.error = err instanceof Error ? err.message : String(err)

        // Re-enqueue with same priority
        setTimeout(() => {
          this.queue.push(task)
        }, delay)
        return
      }

      task.status = 'failed'
      task.error = err instanceof Error ? err.message : String(err)
    }

    this.finalizeTask(task)
  }

  private finalizeTask(task: Task): void {
    this.processing.delete(task.id)
    task.completedAt = Date.now()
    this.completed.push(task)

    const processingTime = (task.completedAt - (task.startedAt ?? task.createdAt))
    this.totalProcessed++
    this.totalProcessingTimeMs += processingTime

    // Prune old completed tasks (keep last 1000)
    if (this.completed.length > 1000) {
      this.completed = this.completed.slice(-500)
    }
  }

  private start(): void {
    this.timer = setInterval(() => {
      this.processNext().catch(() => { /* ignore */ })
    }, PROCESSING_INTERVAL_MS)

    // Allow process to exit
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref()
    }
  }

  // ── Task Dispatch ────────────────────────────────────────────────────────

  private async dispatchTask(task: Task): Promise<unknown> {
    switch (task.type) {
      case 'video_processing':
        return this.processVideoAnalysis(task as Task<VideoProcessingPayload>)
      case 'form_analysis':
        return this.processFormAnalysis(task as Task<FormAnalysisPayload>)
      case 'notification_send':
        return this.processNotificationSend(task as Task<NotificationSendPayload>)
      case 'export_generate':
        return this.processExportGeneration(task as Task<ExportGenerationPayload>)
      case 'insight_refresh':
        return this.processInsightRefresh(task as Task<InsightRefreshPayload>)
      default:
        throw new Error(`Unknown task type: ${(task as { type: string }).type}`)
    }
  }

  // ── Task Processors (Stubs — to be implemented with actual logic) ─────────

  private async processVideoAnalysis(
    task: Task<VideoProcessingPayload>,
  ): Promise<VideoAnalysisResult> {
    // In production, this would:
    // 1. Fetch video from storage
    // 2. Run pose detection / shot detection
    // 3. Generate highlights
    // 4. Save results to DB

    // Placeholder result
    const result: VideoAnalysisResult = {
      videoId: task.payload.videoId,
      poses: [],
      shots: [],
      highlights: [],
      duration: 0,
    }

    // Mark as complete in DB
    // await db.video.update({ where: { id: task.payload.videoId }, data: { analysisComplete: true } })

    return result
  }

  private async processFormAnalysis(
    task: Task<FormAnalysisPayload>,
  ): Promise<FormAnalysisResult> {
    // In production, this would:
    // 1. Fetch video/frame from storage
    // 2. Send to AI vision model
    // 3. Save analysis result to DB

    const result: FormAnalysisResult = {
      videoId: task.payload.videoId,
      score: 0,
      feedback: 'Analysis pending',
      issues: [],
      goodPoints: [],
    }

    return result
  }

  private async processNotificationSend(
    _task: Task<NotificationSendPayload>,
  ): Promise<void> {
    // In production, this would:
    // 1. Look up player's push token
    // 2. Send via Web Push API or email service
    // 3. Log delivery status

    // No-op for now
  }

  private async processExportGeneration(
    task: Task<ExportGenerationPayload>,
  ): Promise<ExportResult> {
    // In production, this would:
    // 1. Fetch video + annotations
    // 2. Render to requested format
    // 3. Upload to storage
    // 4. Return download URL

    const result: ExportResult = {
      videoId: task.payload.videoId,
      exportId: randomUUID(),
      url: '',
      format: task.payload.format,
      sizeBytes: 0,
      duration: 0,
    }

    return result
  }

  private async processInsightRefresh(
    _task: Task<InsightRefreshPayload>,
  ): Promise<void> {
    // In production, this would:
    // 1. Fetch player's recent data
    // 2. Run AI insight generation
    // 3. Cache the insights
    // 4. Invalidate related cache entries

    // No-op for now
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const globalForQueue = globalThis as unknown as {
  courtvisionTaskQueue: TaskQueue | undefined
}

export const taskQueue: TaskQueue =
  globalForQueue.courtvisionTaskQueue ?? new TaskQueue()

if (!globalForQueue.courtvisionTaskQueue) {
  globalForQueue.courtvisionTaskQueue = taskQueue
}
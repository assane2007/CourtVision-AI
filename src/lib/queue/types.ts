/**
 * Task types for the in-process task queue.
 * Server-only module.
 */

// ── Task Types ──────────────────────────────────────────────────────────────────

export type TaskType =
  | 'video_processing'
  | 'form_analysis'
  | 'notification_send'
  | 'export_generate'
  | 'insight_refresh'

// ── Task Status ─────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

// ── Task Definition ─────────────────────────────────────────────────────────────

export interface Task<T = unknown> {
  id: string
  type: TaskType
  payload: T
  priority: number // lower = higher priority
  status: TaskStatus
  createdAt: number
  startedAt?: number
  completedAt?: number
  error?: string
  attempts: number
  maxRetries: number
  result?: unknown
}

// ── Task Payloads ───────────────────────────────────────────────────────────────

export interface VideoProcessingPayload {
  videoId: string
  playerId: string
  sessionId?: string
  options?: {
    analyzePose?: boolean
    detectShots?: boolean
    generateHighlights?: boolean
  }
}

export interface FormAnalysisPayload {
  videoId: string
  playerId: string
  drillId?: string
  frameData?: string // base64 encoded frame
}

export interface NotificationSendPayload {
  playerId: string
  title: string
  body: string
  type: 'push' | 'in_app' | 'email'
  data?: Record<string, unknown>
}

export type ExportFormat = 'mp4' | 'gif' | 'webm' | 'json' | 'csv'

export interface ExportGenerationPayload {
  videoId: string
  playerId: string
  format: ExportFormat
  quality: 'low' | 'medium' | 'high'
  annotations?: boolean
  /** Optional pre-existing VideoExport record ID (created by the API route). */
  exportId?: string
}

export interface InsightRefreshPayload {
  playerId: string
  force?: boolean
  insights?: string[] // specific insight types to refresh
}

// ── Task Results ────────────────────────────────────────────────────────────────

export interface VideoAnalysisResult {
  videoId: string
  poses: Array<{ timestamp: number; landmarks: number[][] }>
  shots: Array<{ timestamp: number; type: string; made: boolean }>
  highlights: Array<{ start: number; end: number; label: string }>
  duration: number
}

export interface FormAnalysisResult {
  videoId: string
  score: number
  feedback: string
  issues: string[]
  goodPoints: string[]
}

export interface ExportResult {
  videoId: string
  exportId: string
  url: string
  format: string
  sizeBytes: number
  duration: number
}

// ── Task Queue Statistics ───────────────────────────────────────────────────────

export interface TaskQueueStats {
  pending: number
  running: number
  completed: number
  failed: number
  totalProcessed: number
  avgProcessingTimeMs: number
}
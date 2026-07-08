export interface VideoData {
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
  isPublic: boolean
  viewCount: number
  tags: string
  createdAt: string
  player: { id: string; name: string; avatar: string | null }
  annotations: Annotation[]
  highlights: Highlight[]
  exports: VideoExport[]
}

export interface Annotation {
  id: string
  videoId: string
  playerId: string
  type: string
  data: string
  timestampMs: number
  durationMs: number
  createdAt: string
}

export interface Highlight {
  id: string
  videoId: string
  title: string
  startMs: number
  endMs: number
  type: string
  score: number | null
  createdAt: string
}

export interface VideoExport {
  id: string
  videoId: string
  type: string
  format: string
  url: string | null
  status: string
  fileSize: number
  createdAt: string
  completedAt: string | null
}

export type AnnotationTool = 'freehand' | 'line' | 'arrow' | 'circle' | 'text'
export type AnnotationColor = string
export type PlayerTab = 'highlights' | 'annotations' | 'export' | 'share'

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
export const ANNOTATION_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff']

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatTimeMs(ms: number): string {
  return formatTime(ms / 1000)
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
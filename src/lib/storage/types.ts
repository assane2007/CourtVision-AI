/**
 * Storage service types.
 * Server-only module.
 */

// ── Upload Options ──────────────────────────────────────────────────────────────

export interface UploadOptions {
  /** MIME type of the file */
  contentType?: string
  /** Whether the file should be publicly accessible */
  public?: boolean
  /** Custom metadata */
  metadata?: Record<string, string>
  /** Maximum allowed size in bytes */
  maxSizeBytes?: number
}

// ── Storage File Info ───────────────────────────────────────────────────────────

export interface StorageFile {
  key: string
  size: number
  lastModified: number
  contentType?: string
  etag?: string
}

// ── Storage Service Interface ───────────────────────────────────────────────────

export interface StorageService {
  /** Upload a file and return the storage key */
  upload(path: string, data: Buffer, options?: UploadOptions): Promise<string>
  /** Download a file as a Buffer */
  download(path: string): Promise<Buffer>
  /** Delete a file */
  delete(path: string): Promise<void>
  /** Get a temporary signed URL for a private file */
  getSignedUrl(path: string, expiresIn?: number): Promise<string>
  /** List files with a given prefix */
  listFiles(prefix: string): Promise<StorageFile[]>
  /** Check if a file exists */
  exists(path: string): Promise<boolean>
  /** Get file metadata */
  getMetadata(path: string): Promise<StorageFile | null>
}

// ── Allowed File Types ──────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
])

export const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/json',
  'text/csv',
])

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB
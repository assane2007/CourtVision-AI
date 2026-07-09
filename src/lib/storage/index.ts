/**
 * Storage service — auto-selects backend based on environment.
 *
 * - S3_BUCKET env var set → S3Storage (with automatic fallback to local)
 * - Otherwise → LocalStorage (filesystem)
 *
 * Server-only module.
 */

import { LocalStorage } from './local-storage'
import { S3Storage } from './s3-storage'
import type { StorageService } from './types'

// ── Singleton ──────────────────────────────────────────────────────────────────

const globalForStorage = globalThis as unknown as {
  courtvisionStorage: StorageService | undefined
}

function createStorage(): StorageService {
  if (process.env.S3_BUCKET) {
    try {
      return new S3Storage()
    } catch {
      // Fallback to local
      return new LocalStorage()
    }
  }
  return new LocalStorage()
}

const _storage: StorageService =
  globalForStorage.courtvisionStorage ?? createStorage()

if (!globalForStorage.courtvisionStorage) {
  globalForStorage.courtvisionStorage = _storage
}

/**
 * The application storage instance.
 *
 * @example
 * // Upload a video
 * const path = await storage.upload(
 *   LocalStorage.generatePath('videos', 'workout.mp4'),
 *   videoBuffer,
 *   { contentType: 'video/mp4' }
 * )
 *
 * // Get a download URL
 * const url = await storage.getSignedUrl(path, 3600)
 */
export const storage = _storage

// ── Re-exports ──────────────────────────────────────────────────────────────────

export type { StorageService, StorageFile, UploadOptions } from './types'
export {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './types'
export { LocalStorage } from './local-storage'
export { S3Storage } from './s3-storage'
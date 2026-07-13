/**
 * Storage service — auto-selects backend based on environment.
 *
 * Priority:
 * 1. SUPABASE_SERVICE_ROLE_KEY set → SupabaseStorage
 * 2. S3_BUCKET env var set → S3Storage (with automatic fallback to local)
 * 3. Otherwise → LocalStorage (filesystem)
 *
 * Server-only module.
 */

import { LocalStorage } from './local-storage';
import { S3Storage } from './s3-storage';
import { SupabaseStorage } from './supabase-storage';
import type { StorageService } from './types';

// ── Singleton ──────────────────────────────────────────────────────────────────

const globalForStorage = globalThis as unknown as {
  courtvisionStorage: StorageService | undefined
}

function createStorage(): StorageService {
  // 1. Supabase Storage (highest priority)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      return new SupabaseStorage('courtvision')
    } catch {
      console.warn('[Storage] Supabase Storage init failed, falling back to local.')
      return new LocalStorage()
    }
  }

  // 2. S3 Storage
  if (process.env.S3_BUCKET) {
    try {
      return new S3Storage()
    } catch {
      // Fallback to local
      return new LocalStorage()
    }
  }

  // 3. Local filesystem
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

export type { StorageService } from './types'
export { LocalStorage } from './local-storage'
export { S3Storage } from './s3-storage'
export { SupabaseStorage } from './supabase-storage'
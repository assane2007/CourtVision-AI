/**
 * Supabase Storage adapter.
 *
 * Implements the StorageService interface using Supabase Storage buckets.
 * Falls back to LocalStorage if Supabase is not configured.
 *
 * Server-only module.
 */

import type { StorageService, StorageFile, UploadOptions } from './types'
import { MAX_FILE_SIZE_BYTES } from './types'

export class SupabaseStorage implements StorageService {
  private client: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null
  private bucket: string

  constructor(bucket: string = 'courtvision') {
    this.bucket = bucket
    this.client = this.createClient()
  }

  private createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      console.warn('[SupabaseStorage] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Falling back to local storage.')
      return null
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@supabase/supabase-js')
      return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    } catch (err) {
      console.warn('[SupabaseStorage] Failed to create Supabase client:', err)
      return null
    }
  }

  private ensureClient(): NonNullable<SupabaseStorage['client']> {
    if (!this.client) {
      throw new Error('Supabase Storage client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.')
    }
    return this.client
  }

  async upload(path: string, data: Buffer, options?: UploadOptions): Promise<string> {
    const maxSize = options?.maxSizeBytes ?? MAX_FILE_SIZE_BYTES
    if (data.length > maxSize) {
      throw new Error(`File too large: ${data.length} bytes (max ${maxSize})`)
    }

    const client = this.ensureClient()

    const { error } = await client.storage
      .from(this.bucket)
      .upload(path, data, {
        contentType: options?.contentType,
        upsert: true,
        metadata: options?.metadata,
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    return path
  }

  async download(path: string): Promise<Buffer> {
    const client = this.ensureClient()

    const { data, error } = await client.storage
      .from(this.bucket)
      .download(path)

    if (error || !data) {
      throw new Error(`Supabase download failed: ${error?.message ?? 'file not found'}`)
    }

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async delete(path: string): Promise<void> {
    const client = this.ensureClient()

    const { error } = await client.storage
      .from(this.bucket)
      .remove([path])

    if (error) {
      // Don't throw for "not found" — idempotent delete
      if (!error.message.includes('not found')) {
        throw new Error(`Supabase delete failed: ${error.message}`)
      }
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const client = this.ensureClient()

    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn, {
        download: true,
      })

    if (error || !data) {
      throw new Error(`Supabase signed URL failed: ${error?.message ?? 'unknown error'}`)
    }

    return data.signedUrl
  }

  async listFiles(prefix: string): Promise<StorageFile[]> {
    const client = this.ensureClient()

    const { data, error } = await client.storage
      .from(this.bucket)
      .list(prefix, { limit: 1000 })

    if (error) {
      throw new Error(`Supabase list failed: ${error.message}`)
    }

    return (data ?? []).map((f) => ({
      key: `${prefix}/${f.name}`,
      size: f.metadata?.size ?? 0,
      lastModified: typeof f.metadata?.lastModified === 'number' ? f.metadata.lastModified : Date.now(),
      contentType: f.metadata?.mimetype,
      etag: f.metadata?.etag,
    }))
  }

  async exists(path: string): Promise<boolean> {
    try {
      const client = this.ensureClient()
      const { data } = await client.storage
        .from(this.bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop(),
          limit: 1,
        })
      return (data?.length ?? 0) > 0
    } catch {
      return false
    }
  }

  async getMetadata(path: string): Promise<StorageFile | null> {
    try {
      const files = await this.listFiles(path.split('/').slice(0, -1).join('/'))
      const name = path.split('/').pop()
      return files.find((f) => f.key.endsWith(name ?? '')) ?? null
    } catch {
      return null
    }
  }

  /** Get a public URL (no auth required, for public buckets) */
  getPublicUrl(path: string): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return ''
    return `${url}/storage/v1/object/public/${this.bucket}/${path}`
  }
}
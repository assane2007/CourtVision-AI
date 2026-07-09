/**
 * S3-compatible storage for production.
 *
 * Uses a minimal HTTP-based S3 client (no external dependencies).
 * Falls back to LocalStorage if S3 credentials are missing.
 *
 * Features:
 * - S3-compatible API (works with AWS S3, MinIO, Cloudflare R2, etc.)
 * - Generates signed URLs for private files
 * - Supports metadata and content types
 *
 * Server-only module.
 */

import { createHash, createHmac, randomUUID } from 'node:crypto'
import { config } from '@/lib/config'
import { LocalStorage } from './local-storage'
import type { StorageService, StorageFile, UploadOptions } from './types'
import { MAX_FILE_SIZE_BYTES } from './types'

// ── S3 Configuration ──────────────────────────────────────────────────────────

interface S3Config {
  bucket: string
  region: string
  accessKey: string
  secretKey: string
  endpoint?: string
}

function getS3Config(): S3Config | null {
  const bucket = config.storage.s3.bucket
  if (!bucket) return null

  return {
    bucket,
    region: config.storage.s3.region,
    accessKey: config.storage.s3.accessKey,
    secretKey: config.storage.s3.secretKey,
    endpoint: config.storage.s3.endpoint,
  }
}

// ── S3 Storage Implementation ──────────────────────────────────────────────────

export class S3Storage implements StorageService {
  private config: S3Config
  private fallback: LocalStorage

  constructor(config?: S3Config) {
    const resolvedConfig = config ?? getS3Config()
    if (!resolvedConfig) {
      throw new Error('S3 configuration required. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY.')
    }
    this.config = resolvedConfig
    this.fallback = new LocalStorage()
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async upload(path: string, data: Buffer, options?: UploadOptions): Promise<string> {
    // Validate
    const maxSize = options?.maxSizeBytes ?? MAX_FILE_SIZE_BYTES
    if (data.length > maxSize) {
      throw new Error(`File too large: ${data.length} bytes exceeds maximum of ${maxSize} bytes`)
    }

    try {
      const endpoint = this.getEndpoint()
      const date = new Date()
      const isoDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const amzDate = isoDate

      const payloadHash = createHash('sha256').update(data).digest('hex')

      const headers: Record<string, string> = {
        'Content-Type': options?.contentType || 'application/octet-stream',
        'Content-Length': String(data.length),
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      }

      // Add metadata
      if (options?.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          headers[`x-amz-meta-${key}`] = value
        }
      }

      const signedHeaders = this.signRequest(
        'PUT',
        `/${this.config.bucket}/${path}`,
        '',
        headers,
        payloadHash,
        amzDate,
      )

      const response = await fetch(endpoint + `/${this.config.bucket}/${path}`, {
        method: 'PUT',
        headers: {
          ...headers,
          ...signedHeaders,
        },
        body: data,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`S3 upload failed: ${response.status} ${text}`)
      }

      return path
    } catch (err) {
      // Fallback to local storage on error
      if (err instanceof Error && !err.message.startsWith('File too large')) {
        return this.fallback.upload(path, data, options)
      }
      throw err
    }
  }

  async download(path: string): Promise<Buffer> {
    try {
      const endpoint = this.getEndpoint()
      const url = `${endpoint}/${this.config.bucket}/${path}`

      const signedHeaders = this.signRequest(
        'GET',
        `/${this.config.bucket}/${path}`,
        '',
        { 'x-amz-date': this.getAmzDate() },
        'UNSIGNED-PAYLOAD',
        this.getAmzDate(),
      )

      const response = await fetch(url, {
        method: 'GET',
        headers: signedHeaders,
      })

      if (!response.ok) {
        throw new Error(`S3 download failed: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch {
      return this.fallback.download(path)
    }
  }

  async delete(path: string): Promise<void> {
    try {
      const endpoint = this.getEndpoint()
      const url = `${endpoint}/${this.config.bucket}/${path}`

      const signedHeaders = this.signRequest(
        'DELETE',
        `/${this.config.bucket}/${path}`,
        '',
        { 'x-amz-date': this.getAmzDate() },
        'UNSIGNED-PAYLOAD',
        this.getAmzDate(),
      )

      const response = await fetch(url, {
        method: 'DELETE',
        headers: signedHeaders,
      })

      if (response.status !== 204 && response.status !== 200) {
        throw new Error(`S3 delete failed: ${response.status}`)
      }
    } catch {
      await this.fallback.delete(path)
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const endpoint = this.getEndpoint()
    const bucket = this.config.bucket
    const region = this.config.region
    const accessKey = this.config.accessKey

    const amzDate = this.getAmzDate()
    const credentialScope = `${amzDate.slice(0, 8)}/${region}/s3/aws4_request`

    const host = new URL(endpoint).host

    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKey}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    })

    const canonicalQueryString = params.toString()

    const canonicalRequest = [
      'GET',
      `/${bucket}/${path}`,
      canonicalQueryString,
      `host:${host}`,
      '',
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n')

    const signingKey = this.getSigningKey(amzDate.slice(0, 8), region)
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

    return `${endpoint}/${bucket}/${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`
  }

  async listFiles(prefix: string): Promise<StorageFile[]> {
    try {
      const endpoint = this.getEndpoint()
      const params = new URLSearchParams({
        'list-type': '2',
        prefix,
        'max-keys': '1000',
      })

      const url = `${endpoint}/${this.config.bucket}?${params}`

      const signedHeaders = this.signRequest(
        'GET',
        `/${this.config.bucket}`,
        params.toString(),
        { 'x-amz-date': this.getAmzDate() },
        'UNSIGNED-PAYLOAD',
        this.getAmzDate(),
      )

      const response = await fetch(url, {
        method: 'GET',
        headers: signedHeaders,
      })

      if (!response.ok) {
        throw new Error(`S3 list failed: ${response.status}`)
      }

      const xml = await response.text()
      return this.parseListXml(xml)
    } catch {
      return this.fallback.listFiles(prefix)
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const endpoint = this.getEndpoint()
      const url = `${endpoint}/${this.config.bucket}/${path}`

      const signedHeaders = this.signRequest(
        'HEAD',
        `/${this.config.bucket}/${path}`,
        '',
        { 'x-amz-date': this.getAmzDate() },
        'UNSIGNED-PAYLOAD',
        this.getAmzDate(),
      )

      const response = await fetch(url, {
        method: 'HEAD',
        headers: signedHeaders,
      })

      return response.ok
    } catch {
      return this.fallback.exists(path)
    }
  }

  async getMetadata(path: string): Promise<StorageFile | null> {
    try {
      const endpoint = this.getEndpoint()
      const url = `${endpoint}/${this.config.bucket}/${path}`

      const signedHeaders = this.signRequest(
        'HEAD',
        `/${this.config.bucket}/${path}`,
        '',
        { 'x-amz-date': this.getAmzDate() },
        'UNSIGNED-PAYLOAD',
        this.getAmzDate(),
      )

      const response = await fetch(url, {
        method: 'HEAD',
        headers: signedHeaders,
      })

      if (!response.ok) return null

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
      const lastModified = response.headers.get('last-modified')
      const etag = response.headers.get('etag')?.replace(/"/g, '')

      return {
        key: path,
        size: contentLength,
        lastModified: lastModified ? new Date(lastModified).getTime() : Date.now(),
        etag,
      }
    } catch {
      return this.fallback.getMetadata(path)
    }
  }

  // ── S3 Signing ──────────────────────────────────────────────────────────

  private getEndpoint(): string {
    if (this.config.endpoint) return this.config.endpoint
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`
  }

  private getAmzDate(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  }

  private getSigningKey(dateStamp: string, region: string): Buffer {
    const kDate = createHmac('sha256', `AWS4${this.config.secretKey}`)
      .update(dateStamp)
      .digest()
    const kRegion = createHmac('sha256', kDate).update(region).digest()
    const kService = createHmac('sha256', kRegion).update('s3').digest()
    return createHmac('sha256', kService).update('aws4_request').digest()
  }

  private signRequest(
    method: string,
    canonicalUri: string,
    queryString: string,
    headers: Record<string, string>,
    payloadHash: string,
    amzDate: string,
  ): Record<string, string> {
    const region = this.config.region
    const accessKey = this.config.accessKey
    const host = new URL(this.getEndpoint()).host

    // Add host to headers
    const allHeaders = { ...headers, host }

    // Sort headers
    const sortedHeaderKeys = Object.keys(allHeaders).sort()
    const signedHeaderKeys = sortedHeaderKeys.join(';')

    const canonicalHeaders = sortedHeaderKeys
      .map((k) => `${k}:${allHeaders[k].trim()}`)
      .join('\n') + '\n'

    const credentialScope = `${amzDate.slice(0, 8)}/${region}/s3/aws4_request`

    const canonicalRequest = [
      method,
      canonicalUri,
      queryString,
      canonicalHeaders,
      signedHeaderKeys,
      payloadHash,
    ].join('\n')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n')

    const signingKey = this.getSigningKey(amzDate.slice(0, 8), region)
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

    return {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`,
      ...allHeaders,
    }
  }

  // ── XML Parsing (minimal) ────────────────────────────────────────────────

  private parseListXml(xml: string): StorageFile[] {
    const files: StorageFile[] = []
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g
    let match

    while ((match = contentsRegex.exec(xml)) !== null) {
      const block = match[1]
      const key = block.match(/<Key>(.*?)<\/Key>/)?.[1]
      const size = parseInt(block.match(/<Size>(\d+)<\/Size>/)?.[1] || '0', 10)
      const lastModified = block.match(/<LastModified>(.*?)<\/LastModified>/)?.[1]

      if (key) {
        files.push({
          key,
          size,
          lastModified: lastModified ? new Date(lastModified).getTime() : Date.now(),
        })
      }
    }

    return files
  }

  /**
   * Generate a unique upload path.
   */
  static generatePath(prefix: string, originalName: string): string {
    const ext = originalName.split('.').pop() || ''
    const uniqueId = randomUUID().slice(0, 8)
    const date = new Date()
    const dateDir = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
    return `${prefix}/${dateDir}/${uniqueId}${ext ? `.${ext}` : ''}`
  }
}
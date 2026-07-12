/**
 * Upload protection utilities.
 *
 * Validates uploaded files by MIME type, size, and generates safe storage paths.
 * Includes a placeholder for future ClamAV virus scanning integration.
 */

import crypto from 'node:crypto';
 import path from'node:path';
import { logger } from '@/lib/logger';
import { sanitizeFilename } from './sanitization';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UploadValidationOptions {
  /** Allowed MIME types. Defaults to image types. */
  allowedMimeTypes?: string[]
  /** Maximum file size in bytes. Defaults to 5MB for images. */
  maxSizeBytes?: number
  /** Custom destination directory prefix */
  destPrefix?: string
}

export interface UploadResult {
  valid: true
  path: string
  filename: string
  mimeType: string
  sizeBytes: number
}

export interface UploadError {
  valid: false
  error: string
  code: 'INVALID_TYPE' | 'TOO_LARGE' | 'INVALID_NAME' | 'VIRUS_DETECTED' | 'MISSING_FILE'
}

// ── Constants ────────────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
] as const

/** Default max sizes in bytes */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024        // 5 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024       // 500 MB
const MAX_DEFAULT_SIZE = MAX_IMAGE_SIZE

/** Default destination prefixes */
const IMAGE_PREFIX = 'uploads/images'
const VIDEO_PREFIX = 'uploads/videos'

// ── MIME type to extension mapping ───────────────────────────────────────────

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

// ── Virus Scan Placeholder ───────────────────────────────────────────────────

/** Magic byte signatures for common file types */
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }],
  'image/jpeg': [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/webp': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF
  'image/gif': [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF8
  'video/mp4': [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],  // ftyp at offset 4
  'video/webm': [{ offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] }],
  'video/quicktime': [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ftyp at offset 4
}

/** Extension to MIME type mapping for validation */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
}

/**
 * Basic file validation that checks magic bytes against the declared MIME type.
 *
 * IMPORTANT: A real production implementation should use ClamAV or a similar
 * antivirus scanner to detect malware in uploaded files. This function only
 * validates that the file content matches its declared type via magic bytes.
 *
 * @param filePath - Path to the file on disk (for future ClamAV integration)
 * @param file - The uploaded file (File/Blob) for magic byte and extension checks
 * @param maxSize - Maximum allowed file size in bytes
 * @param allowedMimeTypes - List of allowed MIME types
 * @returns true if the file passes basic validation checks, false otherwise
 */
async function scanForViruses(
  _filePath: string,
  file?: File | Blob & { name?: string },
  maxSize?: number,
  allowedMimeTypes?: string[],
): Promise<boolean> {
  // TODO: Integrate ClamAV when available for actual malware detection.
  // Example with clamav.js:
  //   const clamav = require('clamav.js')
  //   const scanner = clamav.createScanner('localhost', 3310)
  //   const result = await scanner.scanFile(filePath)
  //   return result.isClean

  if (!file) return true

  const fileName = 'name' in file ? (file.name || '') : ''
  const mimeType = file.type || ''
  const sizeBytes = file.size || 0

  // Check file size against maxSize
  if (maxSize && sizeBytes > maxSize) {
    return false
  }

  // Check file extension against allowed types
  if (allowedMimeTypes && allowedMimeTypes.length > 0 && fileName) {
    const ext = path.extname(fileName).toLowerCase()
    const expectedMime = EXTENSION_TO_MIME[ext]
    if (expectedMime && !allowedMimeTypes.includes(expectedMime)) {
      return false
    }
  }

  // Check magic bytes for common file types
  const signatures = MAGIC_BYTES[mimeType]
  if (signatures && file.size > 0) {
    const arrayBuffer = file instanceof File ? await file.slice(0, 12).arrayBuffer() : await file.slice(0, 12).arrayBuffer()
    const header = new Uint8Array(arrayBuffer)
    const matchesSignature = signatures.some(sig => {
      if (header.length < sig.offset + sig.bytes.length) return false
      return sig.bytes.every((byte, i) => header[sig.offset + i] === byte)
    })
    if (!matchesSignature) {
      return false
    }
  }

  return true
}

// ── Main Validation Function ─────────────────────────────────────────────────

/**
 * Validate an uploaded file and generate a safe storage path.
 *
 * @param file - The uploaded file (File or Blob with name/type/size)
 * @param options - Validation options
 */
export async function validateUpload(
  file: File | Blob & { name?: string; type?: string },
  options: UploadValidationOptions = {},
): Promise<UploadResult | UploadError> {
  const {
    allowedMimeTypes = [...ALL_ALLOWED_TYPES],
    maxSizeBytes,
    destPrefix,
  } = options

  // Check file exists
  if (!file) {
    return { valid: false, error: 'No file provided', code: 'MISSING_FILE' }
  }

  const fileName = 'name' in file ? (file.name || 'unnamed') : 'unnamed'
  const mimeType = file.type || ''
  const sizeBytes = file.size || 0

  // ── Validate MIME type ─────────────────────────────────────────────────────

  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    logger.warn('Upload rejected: invalid MIME type', 'upload-security', {
      fileName,
      mimeType,
      allowedTypes: allowedMimeTypes,
    })
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
      code: 'INVALID_TYPE',
    }
  }

  // ── Validate file size ─────────────────────────────────────────────────────

  const effectiveMaxSize = maxSizeBytes ?? (
    mimeType.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_DEFAULT_SIZE
  )

  if (sizeBytes === 0) {
    return { valid: false, error: 'File is empty', code: 'TOO_LARGE' }
  }

  if (sizeBytes > effectiveMaxSize) {
    const maxMB = (effectiveMaxSize / (1024 * 1024)).toFixed(0)
    const fileMB = (sizeBytes / (1024 * 1024)).toFixed(2)
    logger.warn('Upload rejected: file too large', 'upload-security', {
      fileName,
      sizeMB: fileMB,
      maxMB,
    })
    return {
      valid: false,
      error: `File size (${fileMB} MB) exceeds the maximum allowed (${maxMB} MB)`,
      code: 'TOO_LARGE',
    }
  }

  // ── Validate filename ──────────────────────────────────────────────────────

  const safeName = sanitizeFilename(fileName)
  if (!safeName) {
    return { valid: false, error: 'Invalid file name', code: 'INVALID_NAME' }
  }

  // ── Determine destination prefix ───────────────────────────────────────────

  const prefix = destPrefix || (
    mimeType.startsWith('video/') ? VIDEO_PREFIX : IMAGE_PREFIX
  )

  // ── Generate unique storage path ───────────────────────────────────────────

  const ext = MIME_EXTENSIONS[mimeType] || path.extname(safeName) || ''
  const uniqueId = crypto.randomBytes(16).toString('hex')
  const storedFilename = `${uniqueId}${ext}`
  const storagePath = `${prefix}/${storedFilename.slice(0, 2)}/${storedFilename}`

  // ── Virus scan (placeholder) ───────────────────────────────────────────────

  // In a real implementation, we'd save to a temp path first, scan, then move
  const isClean = await scanForViruses(storagePath, file, effectiveMaxSize, allowedMimeTypes)
  if (!isClean) {
    logger.error('Upload rejected: virus detected', 'upload-security', {
      fileName,
      mimeType,
      path: storagePath,
    })
    return {
      valid: false,
      error: 'File failed security scan',
      code: 'VIRUS_DETECTED',
    }
  }

  // ── Return result ──────────────────────────────────────────────────────────

  return {
    valid: true,
    path: storagePath,
    filename: storedFilename,
    mimeType,
    sizeBytes,
  }
}

/**
 * Quick MIME type check — does NOT read file content.
 * Useful for pre-validation before full upload processing.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALL_ALLOWED_TYPES.includes(mimeType as typeof ALL_ALLOWED_TYPES[number])
}

/**
 * Get the maximum allowed file size for a given MIME type.
 */
export function getMaxSizeForType(mimeType: string): number {
  if (mimeType.startsWith('video/')) return MAX_VIDEO_SIZE
  return MAX_IMAGE_SIZE
}
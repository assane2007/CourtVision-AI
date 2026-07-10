/**
 * Encryption utilities for CourtVision.
 *
 * - encrypt(plaintext, key?) → AES-256-GCM encrypted string
 * - decrypt(ciphertext, key?) → decrypted string
 * - hashPassword(password) → bcrypt hash
 * - verifyPassword(password, hash) → boolean
 *
 * Uses ENCRYPTION_KEY env var (32-byte hex for AES-256).
 * Auto-generates a key on first run if missing (dev only).
 */

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

// ── Key Management ───────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12      // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_ROUNDS = 12    // bcrypt cost factor

/**
 * Get or generate the encryption key.
 * In production, ENCRYPTION_KEY must be set. In dev, it's auto-generated.
 */
function getEncryptionKey(): Buffer {
  let key = config.security.encryptionKey

  if (!key) {
    if (config.env.isProd) {
      throw new Error(
        'FATAL: ENCRYPTION_KEY is not set. Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      )
    }
    // Dev mode: generate a random key (changes on every server restart)
    key = crypto.randomBytes(32).toString('hex')
    console.warn(
      '[ENCRYPTION] ⚠  Auto-generated a random ENCRYPTION_KEY for this session.\n' +
      '  This key will change EVERY TIME the server restarts.\n' +
      '  Data encrypted with this key (e.g., 2FA secrets) will become unreadable after restart.\n' +
      '  Set ENCRYPTION_KEY env var to a stable value for persistent encryption.'
    )
  }

  // Validate key length
  const keyBuffer = Buffer.from(key, 'hex')
  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars). Got ${keyBuffer.length} bytes.`
    )
  }

  return keyBuffer
}

// ── AES-256-GCM Encryption ───────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Output format: base64(iv + authTag + ciphertext)
 * - IV: 12 bytes (96 bits)
 * - AuthTag: 16 bytes (128 bits) — GCM authentication tag
 * - Ciphertext: variable length
 *
 * @param plaintext - String to encrypt
 * @param customKey - Optional custom key (hex string, 32 bytes). Defaults to ENCRYPTION_KEY.
 * @returns Base64-encoded encrypted string
 */
export function encrypt(plaintext: string, customKey?: string): string {
  const key = customKey ? Buffer.from(customKey, 'hex') : getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // Get the auth tag (appended automatically in GCM mode)
  const authTag = cipher.getAuthTag()

  // Combine: iv + authTag + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a string that was encrypted with encrypt().
 *
 * @param ciphertext - Base64-encoded string from encrypt()
 * @param customKey - Optional custom key (hex string, 32 bytes). Defaults to ENCRYPTION_KEY.
 * @returns Decrypted plaintext string, or null if decryption fails
 */
export function decrypt(ciphertext: string, customKey?: string): string | null {
  try {
    const key = customKey ? Buffer.from(customKey, 'hex') : getEncryptionKey()
    const combined = Buffer.from(ciphertext, 'base64')

    // Extract iv, authTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    logger.error('Decryption failed', 'encryption', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a password using bcrypt.
 *
 * @param password - Plain text password
 * @returns bcrypt hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a bcrypt hash.
 *
 * @param password - Plain text password
 * @param hash - bcrypt hash to compare against
 * @returns true if the password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Utility: Generate encryption key ─────────────────────────────────────────

/**
 * Generate a new random 32-byte encryption key (hex).
 * Useful for setup scripts.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a random token (e.g., for email verification, password reset).
 * Produces a URL-safe base64 string.
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}
/**
 * Production input sanitization utilities.
 *
 * - sanitizeInput(obj) → deep sanitizes any object
 * - sanitizeFilename(name) → safe filename
 * - sanitizeHtml(content) → sanitized HTML (allows safe tags)
 */

import { logger } from '@/lib/logger'

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum string length for regular fields */
const MAX_STRING_LENGTH = 10_000

/** Maximum string length for long-form content (bios, descriptions) */
const MAX_LONG_STRING_LENGTH = 100_000

/** Tags allowed in HTML sanitization */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 'b', 'i',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a',
  'blockquote', 'pre', 'code',
  'span', 'div',
])

/** Attributes allowed on elements (simple allowlist) */
const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'class', 'id'])

/** Null byte pattern */
const NULL_BYTE_RE = /\0/g

/** HTML tag pattern */
const HTML_TAG_RE = /<[^>]*>/g

/** Control characters (except newline, tab) */
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/** Suspicious patterns that might indicate injection attempts */
const SUSPICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,     // Event handlers like onclick=
  /data:text\/html/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /url\s*\(\s*['"]?\s*javascript/i,
]

// ── Core Sanitization ────────────────────────────────────────────────────────

/**
 * Sanitize a single string value:
 * - Strip HTML tags (plain text output)
 * - Remove null bytes
 * - Remove control characters (except \n, \t)
 * - Trim whitespace
 * - Validate UTF-8
 * - Limit length
 */
function sanitizeString(value: string, maxLen = MAX_STRING_LENGTH): string {
  // Strip HTML tags first
  let cleaned = value.replace(HTML_TAG_RE, '')

  // Remove null bytes
  cleaned = cleaned.replace(NULL_BYTE_RE, '')

  // Remove control characters (keep newline \n and tab \t)
  cleaned = cleaned.replace(CONTROL_CHARS_RE, '')

  // Trim
  cleaned = cleaned.trim()

  // Validate basic UTF-8 by checking for replacement characters
  // (a simple heuristic — full validation would require Buffer)
  if (cleaned.includes('\uFFFD')) {
    logger.warn('Potentially invalid UTF-8 detected in input', 'sanitization')
  }

  // Enforce length limit
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen)
  }

  return cleaned
}

/**
 * Deep-sanitize any value:
 * - Strings: stripped of HTML tags, null bytes, trimmed, length-limited
 * - Objects: recursively sanitized
 * - Arrays: recursively sanitized
 * - Other primitives: returned as-is
 */
export function sanitizeInput(obj: unknown, maxLen?: number): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, maxLen)
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item, maxLen))
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Sanitize the key itself
      const safeKey = sanitizeString(key, 256)
      sanitized[safeKey] = sanitizeInput(value, maxLen)
    }
    return sanitized
  }

  // BigInt, Symbol, etc. — convert to string for safety
  return String(obj)
}

/**
 * Sanitize a string for long-form content (descriptions, bios, etc.).
 * Preserves newlines and tabs, strips HTML, enforces higher length limit.
 */
export function sanitizeLongText(value: string, maxLen = MAX_LONG_STRING_LENGTH): string {
  // Strip HTML tags for long text too (plain text output)
  const stripped = value.replace(HTML_TAG_RE, '')
  return sanitizeString(stripped, maxLen)
}

/**
 * Check if a string contains suspicious patterns that may indicate injection.
 */
export function containsSuspiciousPatterns(value: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value))
}

// ── Filename Sanitization ────────────────────────────────────────────────────

/**
 * Sanitize a filename for safe storage.
 * - Removes path separators and special characters
 * - Limits length to 255 chars
 * - Preserves file extension
 * - Returns empty string if the result is empty or suspicious
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') return ''

  // Remove null bytes and control characters
  let safe = name.replace(NULL_BYTE_RE, '').replace(CONTROL_CHARS_RE, '')

  // Remove path segments
  safe = safe.replace(/\.\./g, '')      // No directory traversal
  safe = safe.replace(/[\\/]/g, '_')    // Path separators → underscore
  safe = safe.replace(/^\.+/g, '')      // Leading dots (hidden files)

  // Remove potentially dangerous characters
  safe = safe.replace(/[<>:"|?*\x00-\x1F\x7F]/g, '')

  // Trim whitespace
  safe = safe.trim()

  // Limit length (255 is max for most filesystems)
  if (safe.length > 255) {
    // Try to preserve extension
    const lastDot = safe.lastIndexOf('.')
    if (lastDot > 0 && safe.length - lastDot < 20) {
      const ext = safe.slice(lastDot)
      const base = safe.slice(0, lastDot)
      safe = base.slice(0, 255 - ext.length) + ext
    } else {
      safe = safe.slice(0, 255)
    }
  }

  // Ensure the filename isn't empty after sanitization
  if (!safe) return ''

  // Block reserved filenames (Windows)
  const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i
  if (reservedNames.test(safe.replace(/\.[^.]+$/, ''))) {
    return `_${safe}`
  }

  return safe
}

// ── HTML Sanitization ────────────────────────────────────────────────────────

/**
 * Minimal HTML sanitizer that strips all tags except a safe allowlist.
 *
 * This is NOT a full HTML sanitizer — for rich HTML content, use a library
 * like DOMPurify. This is intended for simple cases like sanitizing
 * user-generated text that might contain accidental HTML.
 */
export function sanitizeHtml(content: string): string {
  if (!content || typeof content !== 'string') return ''

  // Remove null bytes
  let safe = content.replace(NULL_BYTE_RE, '').replace(CONTROL_CHARS_RE, '')

  // Strip script tags and their contents
  safe = safe.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Strip style tags and their contents
  safe = safe.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Strip event handler attributes from all remaining tags
  safe = safe.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // Strip javascript: URLs
  safe = safe.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
  safe = safe.replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')

  // Strip all tags that aren't in the allowlist
  safe = safe.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    const tag = tagName.toLowerCase()
    if (ALLOWED_TAGS.has(tag)) {
      // Clean up the tag — remove any attributes not in the allowlist
      return match.replace(/\s+([a-zA-Z-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g, (attrMatch, attrName) => {
        if (ALLOWED_ATTRS.has(attrName.toLowerCase())) {
          // For href, ensure it doesn't contain javascript:
          if (attrName.toLowerCase() === 'href' && /javascript:/i.test(attrMatch)) {
            return ' href="#"'
          }
          return attrMatch
        }
        return ''
      })
    }
    // Tag not in allowlist — remove it entirely (keep content)
    return ''
  })

  // Trim
  safe = safe.trim()

  // Limit length
  if (safe.length > MAX_LONG_STRING_LENGTH) {
    safe = safe.slice(0, MAX_LONG_STRING_LENGTH)
  }

  return safe
}

/**
 * Strip ALL HTML tags from a string, returning plain text only.
 */
export function stripHtml(content: string): string {
  if (!content || typeof content !== 'string') return ''
  return content.replace(HTML_TAG_RE, '').replace(NULL_BYTE_RE, '').trim()
}
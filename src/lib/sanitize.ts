/**
 * Lightweight input sanitization for AI prompt strings.
 *
 * Strips control characters, HTML tags, and enforces length limits.
 * For rich HTML content, use `sanitizeHtml` from `@/lib/security/sanitization`.
 * For deep object sanitization, use `sanitizeInput` from `@/lib/security/sanitization`.
 */

/** HTML tag pattern — strips all tags, keeping text content */
const HTML_TAG_RE = /<[^>]*>/g

/** Control characters (except newline \n and tab \t) */
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/**
 * Sanitize a plain-text string for safe use in prompts, logs, etc.
 * Strips HTML tags, control characters (keeps \n and \t), and truncates.
 *
 * @param str - Raw input string
 * @param maxLen - Maximum length (default 500)
 */
export function sanitize(str: string, maxLen = 500): string {
  return str
    .replace(HTML_TAG_RE, '')     // Strip all HTML tags
    .replace(CONTROL_CHARS_RE, '') // Remove control chars (keep \n, \t)
    .slice(0, maxLen)
}

/**
 * Sanitize a longer string (descriptions, prompts, etc.).
 * Same as sanitize() but with a higher default length limit.
 *
 * @param str - Raw input string
 * @param maxLen - Maximum length (default 5000)
 */
export function sanitizeLong(str: string, maxLen = 5000): string {
  return str
    .replace(HTML_TAG_RE, '')     // Strip all HTML tags
    .replace(CONTROL_CHARS_RE, '') // Remove control chars (keep \n, \t)
    .slice(0, maxLen)
}
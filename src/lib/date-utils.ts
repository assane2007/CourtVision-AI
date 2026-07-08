import type { AppLanguage } from '@/lib/i18n'

/**
 * Format a date using the user's preferred locale.
 * Falls back to 'fr-FR' if locale is not supported.
 */
export function formatDate(date: Date | string, lang: AppLanguage = 'fr', options?: Intl.DateTimeFormatOptions): string {
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, options)
}

/**
 * Format a date as a short relative time (e.g., "il y a 2h", "2h ago")
 */
export function formatRelativeTime(date: Date | string, lang: AppLanguage = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diff = now - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (lang === 'en') {
    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(d, lang, { day: '2-digit', month: '2-digit' })
  }

  if (seconds < 60) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  if (hours < 24) return `il y a ${hours}h`
  if (days < 7) return `il y a ${days}j`
  return formatDate(d, lang, { day: '2-digit', month: '2-digit' })
}

/**
 * Format a date as "DD/MM/YYYY" or "MM/DD/YYYY"
 */
export function formatShortDate(date: Date | string, lang: AppLanguage = 'fr'): string {
  return formatDate(date, lang, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Format a date as "HH:mm"
 */
export function formatTime(date: Date | string, lang: AppLanguage = 'fr'): string {
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format duration in seconds to human-readable (e.g., "5min 30s")
 */
export function formatDurationSec(seconds: number, lang: AppLanguage = 'fr'): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (lang === 'en') {
    if (min === 0) return `${sec}s`
    if (sec === 0) return `${min}min`
    return `${min}min ${sec}s`
  }
  if (min === 0) return `${sec}s`
  if (sec === 0) return `${min}min`
  return `${min}min ${sec}s`
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erreur réseau' }))
    throw new Error(body.error || `Erreur ${res.status}`)
  }
  return res.json()
}

/**
 * Format a date using the user's locale.
 * Re-exported from date-utils.ts for backward compatibility.
 */
export { formatDate as formatLocaleDate } from '@/lib/date-utils'

export function formatDuration(ms: number): string {
  if (!ms) return '—'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const s = sec % 60
  if (min === 0) return `${s}s`
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return s > 0 ? `${h}h ${m}min ${s.toString().padStart(2, '0')}s` : `${h}h ${m}min`
  }
  return `${min}min ${s.toString().padStart(2, '0')}s`
}

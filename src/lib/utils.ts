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

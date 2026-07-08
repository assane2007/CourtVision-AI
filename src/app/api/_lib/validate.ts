export function validateString(value: unknown, fieldName: string, maxLength = 500): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} est requis`
  }
  if (value.length > maxLength) {
    return `${fieldName} trop long (max ${maxLength})`
  }
  return null
}

export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): string | null {
  const n = Number(value)
  if (isNaN(n)) return `${fieldName} doit être un nombre`
  if (min !== undefined && n < min) return `${fieldName} minimum: ${min}`
  if (max !== undefined && n > max) return `${fieldName} maximum: ${max}`
  return null
}

export function validateEnum<T extends string>(value: unknown, fieldName: string, allowed: T[]): string | null {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    return `${fieldName} invalide`
  }
  return null
}

export function validateBody(body: unknown): { error: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Corps de requête invalide' }
  }
  return null
}
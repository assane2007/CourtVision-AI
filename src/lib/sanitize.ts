export function sanitize(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 500)
}

export function sanitizeLong(str: string, maxLen = 5000): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen)
}
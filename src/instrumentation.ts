export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid loading node:crypto in Edge Runtime
    const { validateConfig } = await import('@/lib/config')
    validateConfig()
  }
}
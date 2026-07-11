import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow preview panel cross-origin requests
  allowedDevOrigins: ['https://*.space-z.ai', 'http://*.space-z.ai'],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/training/sessions/:path*', destination: '/api/sessions/:path*' },
      { source: '/api/training/drills/:path*', destination: '/api/drills/:path*' },
      { source: '/api/training/plans/:path*', destination: '/api/plans/:path*' },
      { source: '/api/social/friends/:path*', destination: '/api/friends/:path*' },
      { source: '/api/social/feed/:path*', destination: '/api/feed/:path*' },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: https://lh3.googleusercontent.com https://*.gravatar.com https://storage.googleapis.com",
              "connect-src 'self' https://*.space-z.ai http://*.space-z.ai https://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://*.ingest.us.sentry.io",
              "font-src 'self'",
              "frame-ancestors 'self' https://*.space-z.ai http://*.space-z.ai",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
    ]
  },
}

// Sentry is only active in production (SENTRY_DSN set on Vercel)
// In dev, withSentryConfig causes process instability in sandboxed environments
let finalConfig = nextConfig

if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require('@sentry/nextjs')
  finalConfig = withSentryConfig(nextConfig, {
    org: 'court-vision',
    project: 'javascript-nextjs-xq',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    silent: !process.env.CI,
  })
}

export default finalConfig
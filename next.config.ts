import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  /* Type safety: catch errors at build time */
  typescript: {
    ignoreBuildErrors: false,
  },
  /* React strict mode: catch side-effect bugs in development */
  reactStrictMode: true,
  async rewrites() {
    return [
      // Alias /api/training/* → /api/* (sessions, drills, plans)
      { source: '/api/training/sessions/:path*', destination: '/api/sessions/:path*' },
      { source: '/api/training/drills/:path*', destination: '/api/drills/:path*' },
      { source: '/api/training/plans/:path*', destination: '/api/plans/:path*' },
      // Alias /api/social/* → /api/* (friends, feed)
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
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.space-z.ai https://cdn.jsdelivr.net https://storage.googleapis.com https://*.ingest.us.sentry.io",
              "font-src 'self'",
              "frame-ancestors 'self' https://*.space-z.ai",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry org and project slugs (for source map upload)
  org: 'court-vision',
  project: 'javascript-nextjs-xq',

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Create a proxy API route to bypass ad-blockers
  tunnelRoute: '/monitoring',

  // Suppress non-CI output
  silent: !process.env.CI,
})
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow preview panel cross-origin requests from any space-z.ai subdomain
  allowedDevOrigins: ['https://*.space-z.ai', 'http://*.space-z.ai'],
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
              "img-src 'self' data: blob: https: https://lh3.googleusercontent.com https://*.gravatar.com https://storage.googleapis.com",
              "connect-src 'self' https://*.space-z.ai http://*.space-z.ai https://cdn.jsdelivr.net https://storage.googleapis.com https://*.ingest.us.sentry.io",
              "font-src 'self'",
              "frame-ancestors 'self' https://*.space-z.ai http://*.space-z.ai",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

export default nextConfig
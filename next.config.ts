import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // Allow preview panel cross-origin requests
  allowedDevOrigins: ['https://*.space-z.ai', 'http://*.space-z.ai'],
  typescript: {
    ignoreBuildErrors: false},
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256]},
  webpack(config, { isServer }) {
    if (!isServer) {
      // Prevent Node.js-only modules from being bundled for the browser
      config.resolve = config.resolve ?? {}
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'pg-native': false,
        util: false,
        pg: false,
      }
      // Use alias for subpath modules like 'util/types' which fallback doesn't handle
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        'util/types': false,
      }
    }
    return config
  },
  async rewrites() {
    return [
      { source: '/api/training/sessions/:path*', destination: '/api/sessions/:path*' },
      { source: '/api/training/drills/:path*', destination: '/api/drills/:path*' },
      { source: '/api/training/plans/:path*', destination: '/api/plans/:path*' },
      { source: '/api/social/friends/:path*', destination: '/api/friends/:path*' },
      { source: '/api/social/feed/:path*', destination: '/api/feed/:path*' },
      { source: '/api/v1/:path*', destination: '/api/:path*' }]
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
              "script-src 'self' 'nonce-{{NONCE}}' https://cdn.jsdelivr.net https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: https://lh3.googleusercontent.com https://*.gravatar.com https://storage.googleapis.com https://*.supabase.co",
              "connect-src 'self' https://*.space-z.ai http://*.space-z.ai https://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://*.ingest.us.sentry.io https://www.inngest.com wss://*.space-z.ai ws://*.space-z.ai",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'self'" + (process.env.NODE_ENV === 'development' ? " https://*.space-z.ai http://*.space-z.ai" : ""),
              "media-src 'self' blob: https://*.supabase.co",
              "worker-src 'self' blob:"].join('; ')},
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '0' }]}]
  }}

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
    silent: !process.env.CI})
}

export default finalConfig
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Type safety: catch errors at build time */
  typescript: {
    ignoreBuildErrors: false,
  },
  /* React strict mode: catch side-effect bugs in development */
  reactStrictMode: true,
  allowedDevOrigins: [
    "preview-chat-c57e525c-9404-49d2-b3ca-8cf4027e7546.space-z.ai",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.space-z.ai https://cdn.jsdelivr.net https://storage.googleapis.com",
              "font-src 'self'",
              "frame-ancestors 'self' https://*.space-z.ai",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map uploading during build in CI
  silent: !process.env.CI,

  // Hide all logs from Sentry during build
  hideSourceMaps: true,

  // Disable automatic instrumentation of Bun/Node built-ins
  disableLogger: true,

  // Route handlers to trace
  routeHandlers: [
    {
      method: 'GET',
      path: '/api/health',
    },
  ],

  // In-app include/exclude for better grouping
  inAppInclude: [
    { filepath: 'src/app/api/**', family: 'API' },
    { filepath: 'src/components/screens/**', family: 'Screens' },
    { filepath: 'src/components/shared/**', family: 'Shared' },
    { filepath: 'src/lib/**', family: 'Libraries' },
    { filepath: 'src/stores/**', family: 'State' },
  ],

  // Performance monitoring
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
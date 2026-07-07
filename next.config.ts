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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
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
            /* Replaced deprecated ALLOW-FROM with CSP frame-ancestors */
            key: "X-Frame-Options",
            value: "DENY",
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

export default nextConfig;
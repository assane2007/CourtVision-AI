# Task 8 — Integrate Sentry + PostHog Analytics

## Status: ✅ Complete

## Changes Made

### New Files (7):
1. **`sentry.client.config.ts`** — Sentry client-side init (DSN, traces, replays on error)
2. **`sentry.server.config.ts`** — Sentry server-side init (DSN, traces)
3. **`sentry.edge.config.ts`** — Sentry edge runtime init (DSN, traces)
4. **`src/lib/analytics.ts`** — PostHog `trackEvent()` / `identifyUser()` utilities, safe no-PostHog fallback
5. **`src/lib/logger.ts`** — Structured logging with levels (debug/info/warn/error), timestamps, context
6. **`src/components/providers/posthog-provider.tsx`** — Client component that auto-identifies users via `useSession`

### Modified Files (5):
7. **`next.config.ts`** — Wrapped existing config with `withSentryConfig()` (silent, hideSourceMaps)
8. **`src/app/layout.tsx`** — Added conditional PostHog CDN script tag in `<head>` (only when `NEXT_PUBLIC_POSTHOG_KEY` is set)
9. **`src/components/providers.tsx`** — Imported and wrapped children with `PostHogProvider`
10. **`.env`** — Added `NEXT_PUBLIC_SENTRY_DSN=` and `NEXT_PUBLIC_POSTHOG_KEY=` (empty for dev)
11. **`.env.example`** — Added `NEXT_PUBLIC_SENTRY_DSN=your-dsn-here` and `NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key-here`

### Package Added:
- `@sentry/nextjs@10.63.0`

### Lint Result:
- **0 errors**, 1 pre-existing warning in `use-notifications.ts` (unrelated)
- Removed 2 unused eslint-disable directives from analytics.ts

### Dev Server:
- Restarted successfully after `next.config.ts` change, compiled and ready
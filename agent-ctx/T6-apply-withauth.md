# T6 - Apply withAuth() HOF to Remaining API Routes

## Summary
Applied `withAuth()` from `src/lib/with-auth.ts` to 56 new API route files, converting 96 handlers total.

## Approach
- Identified 86 files still using manual `getServerSession(authOptions)` + `if (!session?.user?.id)` boilerplate
- Categorized files into: convertible (standard `'Non autorisé'` 401 message) vs skip (non-standard messages, optional auth, complex auth, public routes, admin routes)
- Wrote conversion scripts that:
  1. Replace `getServerSession`/`authOptions` imports with `withAuth` import
  2. Transform `export async function METHOD(...)` → `export const METHOD = withAuth(...)`
  3. Remove 4-line auth boilerplate from each handler body
  4. For dynamic routes, extract `Promise<{...}>` type and use `withAuth<{...}>()`
  5. Properly handle nested `{` in type annotations (e.g., `Promise<{ id: string }>`)
  6. Fix closing braces: `}` → `})`
  7. Remove unused `NextRequest` imports

## Files Converted: 56 new files (96 handlers)

### Simple routes (non-dynamic, single/double handlers):
- `plans/route.ts` (2), `challenges/route.ts` (2), `notifications/route.ts` (2), `notifications/subscribe/route.ts` (2)
- `messages/conversations/route.ts` (2), `feed/route.ts` (2), `teams/route.ts` (2), `friends/route.ts` (3)
- `player/route.ts` (3), `player/export/route.ts` (1), `stripe/checkout/route.ts` (1), `stripe/portal/route.ts` (1)
- `videos/route.ts` (2), `videos/compare/route.ts` (1), `sessions/route.ts` (2), `live/route.ts` (2)
- AI routes: `workout/generate` (1), `workout/saved` (3), `rag/query` (1), `rag/sync` (1), `predictions/generate` (1), `predictions/history` (1), `shots/detect` (1), `shots/history` (1), `voice/coach` (2), `voice/transcribe` (1), `form/analyze` (1), `form/history` (1), `pose/save` (1), `insights` (1)

### Dynamic routes (with `[id]`/`[type]` params):
- `plans/[id]` (3), `challenges/[id]` (1), `challenges/[id]/join` (2), `challenges/[id]/progress` (2)
- `messages/conversations/[id]` (2), `messages/conversations/[id]/messages` (2)
- `feed/[id]` (2), `feed/[id]/comments` (2), `feed/[id]/like` (1)
- `ai/structured/[type]` (1), `ai/pose/[id]` (2)
- `live/[id]` (2), `live/[id]/score` (1), `live/[id]/join` (2)
- `sessions/[id]` (3)
- `videos/[id]` (3), `videos/[id]/share` (1), `videos/[id]/highlights` (2), `videos/[id]/highlights/generate` (1), `videos/[id]/export` (2), `videos/[id]/export/[exportId]` (1), `videos/[id]/annotations` (2), `videos/[id]/annotations/[annotationId]` (1)
- `teams/[id]` (3), `teams/[id]/members` (3)
- `friends/[id]` (2)

## Files Skipped (30) — with reasons:
- **Auth routes** (5): `auth/2fa/setup`, `auth/2fa/backup`, `auth/2fa/verify`, `auth/2fa/disable`, `auth/verify-email` — complex auth
- **Non-standard 401 messages** (17): Different error text (`'Authentification requise'`, `'Non authentifié'`, `"Unauthorized"`) — preserving exact messages
- **Optional auth** (1): `drills/route.ts` — uses `session?.user?.id ?? null`
- **Custom check** (2): `quests/route.ts` (checks `session?.user?.email`), `scouting/route.ts` (checks both `.id` and `.email`)
- **Public/special** (5): `privacy`, `health`, `stripe/webhook`, `auth/[...nextauth]`, `auth/signup`, `auth/reset-password/*`, `email/verify/[token]`

## Lint Result
**0 errors, 46 warnings** (all pre-existing: `no-console` in page components, unused vars in test files)
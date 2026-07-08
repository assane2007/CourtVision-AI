# Task S7d — withAuth() Higher-Order Function

## Summary
Created `src/lib/with-auth.ts` with three exports (`withAuth`, `withAdmin`, `withOptionalAuth`) to eliminate repeated authentication boilerplate across API routes. Applied `withAuth` to 15 API route files covering 21 handler functions.

## Files Created
- `src/lib/with-auth.ts` — HOF module with full TypeScript generics for route context

## Files Modified (withAuth applied)
1. `src/app/api/reaction/route.ts` — GET, POST (2 handlers)
2. `src/app/api/achievements/route.ts` — GET (1 handler)
3. `src/app/api/xp/route.ts` — GET (1 handler)
4. `src/app/api/records/route.ts` — GET (1 handler)
5. `src/app/api/referral/route.ts` — GET, POST (2 handlers)
6. `src/app/api/settings/route.ts` — GET, PATCH (2 handlers)
7. `src/app/api/daily-reward/route.ts` — POST (1 handler)
8. `src/app/api/stats/route.ts` — GET (1 handler)
9. `src/app/api/share/route.ts` — POST (1 handler)
10. `src/app/api/leaderboard/route.ts` — GET (1 handler)
11. `src/app/api/recommendations/route.ts` — GET, POST (2 handlers)
12. `src/app/api/drills/[id]/route.ts` — GET, DELETE (2 handlers, uses TCtx generic)
13. `src/app/api/drills/favorite/route.ts` — POST (1 handler)
14. `src/app/api/follow/route.ts` — POST, GET (2 handlers)
15. `src/app/api/follow/[id]/route.ts` — GET (1 handler, uses TCtx generic)

## Lint Result
**0 errors, 0 warnings** (only pre-existing ESLint plugin info message about TSNonNullExpression)

## Boilerplate Eliminated
- **21 handler functions** refactored across 15 files
- Per handler: 4 lines removed (`getServerSession` call + `if` check + `return` + `}`)
- Per file: 2 import lines removed (`getServerSession`, `authOptions`), 1 added (`withAuth`) = **net -1 import line per file**
- **84 lines** of auth boilerplate removed from handlers
- **15 lines** of import cleanup (net)
- **Total: ~99 lines of boilerplate eliminated**
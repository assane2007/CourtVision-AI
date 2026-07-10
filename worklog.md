---
Task ID: 1
Agent: Main
Task: Fix Vercel deployment env var errors + Integrate 6 AI features

Work Log:
- Fixed ENCRYPTION_KEY FATAL throw at build time by adding SKIP_ENV_VALIDATION guard in config.ts
- Fixed NEXTAUTH_SECRET length check to skip when SKIP_ENV_VALIDATION is set
- Fixed auth.ts FATAL throw for NEXTAUTH_SECRET
- Fixed auth/jwt.ts FATAL throw for JWT_SECRET/NEXTAUTH_SECRET
- Created 6 API routes using z-ai-web-dev-sdk:
  1. /api/ai/chat — LLM chatbot for basketball coaching
  2. /api/ai/tts — Text-to-speech with multiple voices and speed control
  3. /api/ai/transcribe — Speech-to-text audio transcription
  4. /api/ai/generate-image — AI image generation
  5. /api/ai/web-search — Web search integration
  6. /api/ai/web-reader — Web page content extraction
- Created AI Tools Hub screen (ai-tools-screen.tsx) with 6 tabs
- Updated AI Coach screen to use new /api/ai/chat endpoint with real LLM
- Added 'ai-tools' screen type to app store
- Registered AIToolsScreen in page.tsx
- Added Sparkles button in AI Coach header to navigate to AI Tools
- Fixed all TypeScript errors (0 errors)

Stage Summary:
- All 6 AI features fully integrated with backend + frontend
- AI Coach now uses real LLM via z-ai-web-dev-sdk
- AI Tools Hub provides access to all 6 features via tabbed interface
- Build compiles successfully with 0 TS errors
- Dev server runs without errors

---
Task ID: 2
Agent: Main
Task: Fix 6 bugs found in testing (security, TTS crash, CSP, favicon, missing routes, form names)

Work Log:

Bug 1: /api/player/profile returns 200 without auth (SECURITY)
- File: src/app/api/player/profile/route.ts
- Problem: GET handler returned `{ player: null }` with 200 when no session existed, leaking the fact that the endpoint exists and exposing the response shape.
- Fix: Changed to return `{ error: "Unauthorized" }` with status 401 when no playerId is present, matching the PATCH handler's behavior.

Bug 2: POST /api/ai/tts returns 500
- File: src/app/api/ai/tts/route.ts
- Problem: The TTS route passed `voice` and `speed` parameters to `zai.audio.tts.create()`, which the SDK does not support. This caused an unhandled error resulting in a 500 response. Additionally, the response parsing only handled string responses, not object responses.
- Fix: Removed unsupported `voice` and `speed` params from the SDK call (matching the working speech.provider.ts pattern). Added fallback parsing for object responses (checking `audio_base64`, `audio`, `data` fields). Prefixed unused variables with `_` to satisfy lint.

Bug 3: CSP blocks Vercel Speed Insights script
- File: next.config.ts
- Problem: The Content-Security-Policy `script-src` directive did not include `https://va.vercel-scripts.com`, causing the browser to block Vercel Speed Insights.
- Fix: Added `https://va.vercel-scripts.com` to the `script-src` directive.

Bug 4: Missing favicon.ico (404)
- File: public/favicon.ico
- Problem: No favicon.ico existed in the public directory, causing 404 on `/favicon.ico` requests.
- Fix: Copied `public/favicon-32.png` to `public/favicon.ico`. Browsers accept PNG data served as .ico.

Bug 5: 404 on GET /api/training/sessions, /api/training/drills, /api/training/plans, /api/social/friends, /api/social/feed
- File: next.config.ts
- Problem: These aliased API paths had no route handlers. The actual routes exist at `/api/sessions`, `/api/drills`, `/api/plans`, `/api/friends`, `/api/feed`.
- Fix: Added Next.js rewrites to alias `/api/training/*` → corresponding `/api/*` routes, and `/api/social/*` → corresponding `/api/*` routes. This is cleaner than duplicating route handlers.

Bug 6: Signup/Login form inputs missing name attributes
- Files: src/components/auth/login-form.tsx, src/components/auth/signup-form.tsx
- Problem: Input elements had `id` attributes but no `name` attributes. Password managers and automated tests rely on `name` to find form fields.
- Fix: Added `name="email"`, `name="password"`, and `name="name"` (signup only) to all form input elements.

Stage Summary:
- All 6 bugs fixed
- No new lint errors introduced (pre-existing 16 errors unchanged, 2 unused-var warnings resolved)
- All changes are minimal and targeted

---
Task ID: 3
Agent: Main
Task: Comprehensive bug audit, E2E testing, and fix all issues

Work Log:

## AUDIT PHASE
Conducted 3 parallel comprehensive audits covering:
- Auth & Security (31 files): Found 24 issues (4 CRITICAL, 8 HIGH, 8 MEDIUM, 4 LOW)
- API Routes (104 files): Found 44 issues (3 CRITICAL, 14 HIGH, 23 MEDIUM, 4 LOW)
- Frontend UX/Accessibility (42 files): Found 51 issues (5 CRITICAL, 11 HIGH, 22 MEDIUM, 13 LOW)

## FIXES APPLIED (29 bugs fixed across 4 parallel agents)

### CRITICAL Security Fixes
1. **AUTH-003**: 2FA disable endpoint — Added real TOTP verification with `authenticator.verify()` from otplib. Previously ANY 6-digit string disabled 2FA. Now decrypts stored secret and validates code properly. Falls back to backup code check only if TOTP fails.
   - File: `src/app/api/auth/2fa/disable/route.ts`

2. **AUTH-004**: Backup code regeneration — Added real TOTP verification before allowing regeneration. Previously ANY 6-digit string regenerated codes.
   - File: `src/app/api/auth/2fa/backup/route.ts`

3. **SEC-001/002/003**: Security section UI — Complete 2FA flow rewrite:
   - Enable: Shows QR code + secret key, user scans with authenticator app, enters real 6-digit code to verify
   - Disable: Prompts for current 2FA code before disabling
   - Backup codes: Requires 2FA code to regenerate
   - Removed all hardcoded mock codes ('000000', '123456')
   - Fixed password dialog description (was using 2FA description)
   - Removed unused state variable
   - File: `src/components/settings/security-section.tsx`

### CRITICAL API Fixes
4. **API-001/004**: Added `withAuth` authentication wrapper + rate limiting (20 req/min per user) to all 6 AI endpoints:
   - `/api/ai/chat`, `/api/ai/tts`, `/api/ai/transcribe`
   - `/api/ai/generate-image`, `/api/ai/web-search`, `/api/ai/web-reader`
   - Previously ANY unauthenticated user could call these, consuming AI credits

5. **API-002**: Friends search PII leak — Removed `email` from search filter. Only searches by `name` now.
   - File: `src/app/api/friends/route.ts`

### CRITICAL Navigation Fixes
6. **UX-022**: Bottom nav Messages tab — Changed `screen: 'ai-coach'` to `screen: 'messages'`
   - File: `src/components/shared/bottom-nav.tsx`

7. **UX-018**: Messages screen conversation navigation — Added `selectConversation` action to app store, replaced all `selectDrill()` calls with `selectConversation()` for conversation IDs
   - Files: `src/stores/app.ts`, `src/components/screens/messages-screen.tsx`, `src/components/screens/conversation-screen.tsx`

### HIGH Security Fixes
8. **AUTH-005**: CORS allow-all fix — Removed `allowedOrigins.length === 0` from `isAllowed` condition. In production, only configured origins are now permitted.
   - File: `src/lib/security/headers.ts`

9. **AUTH-007**: Rate limiter reset bug — Replaced `this.store.clear()` (which deleted ALL rate limit entries every 5 min) with `evictExpired()` that only removes expired entries
   - File: `src/lib/security/rate-limiter.ts`

10. **SEC-004**: CSP img-src — Added `https:`, `https://lh3.googleusercontent.com`, `https://*.gravatar.com`, `https://storage.googleapis.com` to allow external avatars
    - File: `next.config.ts`

### HIGH API Fixes
11. **API-005**: Like count race condition — Wrapped like/unlike + count update in `db.$transaction()` and re-fetches accurate count after transaction
    - File: `src/app/api/feed/[id]/like/route.ts`

12. **API-006**: Chat unbounded messages — Added `.take(200)` with `?limit=` query parameter support (max 200)
    - File: `src/app/api/player/chat/route.ts`

13. **API-012**: Sessions streak unbounded query — Limited to last 60 days for streak calculation
    - File: `src/app/api/sessions/route.ts`

14. **API-017/018**: Live join race condition + always-true bug — Changed `(participantCount + 1) >= 1` to `(currentCount + 1) >= liveSession.maxViewers`. Wrapped in `db.$transaction()`.
    - File: `src/app/api/live/[id]/join/route.ts`

### HIGH Frontend Fixes
15. **A11Y-024**: Error boundary CSS — Replaced all non-existent `cv-*` classes with standard Tailwind tokens
    - File: `src/components/layout/error-boundary.tsx`

16. **A11Y-026**: Screen error boundary CSS — Same cv-* → Tailwind replacement
    - File: `src/components/layout/screen-error-boundary.tsx`

17. **UX-025**: Privacy switches — Changed `defaultChecked={true}` to `checked={prop}` with proper state from parent
    - Files: `src/components/settings/privacy-section.tsx`, `src/components/screens/settings-screen.tsx`

### MEDIUM Fixes (All 17 lint warnings)
18. Removed unused `Send` import from ai-tools-screen.tsx
19. Added `alt=""` to image element in ai-tools-screen.tsx
20. Removed unused eslint-disable directives (10 across social/training/video repositories)
21. Removed unused `requireEnv` function from config.ts
22. Removed unused `startMs` variable from queue/processors.ts
23. Fixed `storageTick` dependency in feature-gate.tsx
24. Fixed `t` missing dependency in camera-workout.tsx useEffect

## VERIFICATION
- ✅ `bun run lint` — 0 errors, 0 warnings
- ✅ Dev server starts, compiles, serves landing page (HTTP 200)
- ✅ Health endpoint returns `{"status":"ok","db":"connected"}`
- ✅ AI chat endpoint returns 401 "Non autorisé" (auth protection confirmed)
- ✅ No TypeScript compilation errors

## REMAINING KNOWN ISSUES (not fixed — documented for next phase)
- AUTH-001/002: Hardcoded fallback secrets in dev mode (intentional for dev, should throw in prod)
- AUTH-006: CSP `unsafe-inline`/`unsafe-eval` needed for Next.js (nonce migration needed)
- AUTH-008: Regex-based HTML sanitizer (should use DOMPurify)
- AUTH-009: `sanitize()` doesn't strip HTML (rename or add stripping)
- AUTH-010: Email verification tokens stored in plaintext (should hash)
- AUTH-013: Auth cache 60s stale after role changes (need invalidation)
- AUTH-014: Middleware Bearer check doesn't validate JWT
- AUTH-016: Auto-generated encryption key changes on restart
- AUTH-020: x-forwarded-for spoofable for rate limiting
- API-003: /api/friends/[id] route param ambiguity (GET vs DELETE)
- API-008: N+1 query in followers loop
- API-009: Live sessions shows ALL without ownership filter
- API-014: LLM output saved unsanitized
- API-030: Stripe checkout missing try/catch
- API-035: Feed post sessionId ownership not verified
- Various i18n gaps (hardcoded French in error boundaries, notifications, etc.)
- Prisma schema still set to `sqlite` for local dev (needs `postgresql` for Vercel deploy)

Stage Summary:
- 29 bugs fixed across security, API, and frontend
- 0 lint errors/warnings
- Auth protection verified on AI endpoints
- 2FA completely rewritten with real TOTP verification
- Rate limiter fixed (no more global reset)
- Navigation bugs fixed (messages tab, conversation navigation)
- Error boundaries now render correctly with proper CSS
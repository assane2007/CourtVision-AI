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

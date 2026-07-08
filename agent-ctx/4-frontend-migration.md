---
Task ID: 4
Agent: Frontend Migration
Task: Migrate Zustand store from localStorage to real DB-backed APIs

Work Log:
- Created `src/lib/api-client.ts` with typed functions for all 9 API endpoints (onboard, profile, workouts, matches, stats, plan, achievements, chat, coach)
- Defined full TypeScript types for API request/response shapes (ApiPlayerProfile, ApiWorkout, ApiMatch, ApiStats, ApiChatMessage, etc.)
- Created `src/hooks/use-player-data.ts` with 12 TanStack Query hooks: usePlayerProfile, useUpdateProfile, useOnboard, usePlayerStats, useWorkouts, useLogWorkout, useMatches, useLogMatch, useActivePlan, useSetActivePlan, useAchievements, useChatMessages, useSendChatMessage
- Removed `persist` middleware from Zustand store (no more localStorage)
- Store is now a thin bridge: actions delegate to API, returns typed results
- Kept deprecated empty arrays (workouts, matches, chatHistory, unlockedAchievements) for backward-compat with non-migrated screens
- Added QueryClientProvider to app layout.tsx
- Updated page.tsx to use usePlayerProfile() query for onboarding gate, with loading spinner
- Syncs API profile data to Zustand store on fetch (dna, profile, isOnboarded, streak)
- Updated onboarding.tsx to use useOnboard() mutation with error handling
- Updated home-screen.tsx to use usePlayerStats(), useWorkouts(), useMatches(), useAchievements(), useActivePlan() hooks
- Updated workout-logger.tsx to use useActivePlan() and useLogWorkout() mutation
- Updated match-logger.tsx to use useLogMatch() mutation
- Updated coach-chat.tsx to use useChatMessages() and useSendChatMessage() for server-persisted chat
- All mutations invalidate ["player"] query key on success for cache consistency
- Lint passes clean, dev server has no errors

Stage Summary:
- Frontend now fully backed by real SQLite database
- No more localStorage dependency for core data
- TanStack Query handles caching, refetching, and loading states
- Graceful fallbacks: API errors show toasts, loading states show spinners
- Non-migrated screens (settings, player-iq, future-self, smart-plans) still work with degraded empty data
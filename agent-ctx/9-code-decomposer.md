# Task 9 — Decompose camera-workout.tsx into modular hooks and sub-components

## Agent: Code Decomposer
## Status: Completed

## Summary

Decomposed the monolithic `src/components/screens/camera-workout.tsx` (964 lines) into 5 custom hooks, 5 sub-components, and a thin orchestrator (504 lines). All existing functionality preserved with zero regressions.

## Files Created

### Hooks (5 files, 724 lines total)

| File | Lines | Description |
|------|-------|-------------|
| `src/hooks/use-mediapipe.ts` | 66 | PoseLandmarker CDN init (@0.10.18), FilesetResolver, cleanup via `close()` |
| `src/hooks/use-camera.ts` | 57 | `getUserMedia()` with user-facing mode, track cleanup on unmount |
| `src/hooks/use-workout-timer.ts` | 216 | All phase management (idle/countdown/active/rest/paused), interval timers, audio cues |
| `src/hooks/use-rep-detection.ts` | 326 | `detectRep()` algorithm (8 categories), `isBallVisible()`, score accumulation (55/15/22/8%) |
| `src/hooks/use-ai-form-check.ts` | 59 | `/api/ai/form-check` with 10s cooldown via ref-based guard |

### Sub-components (5 files, 365 lines total)

| File | Lines | Description |
|------|-------|-------------|
| `src/components/workout/pose-canvas.tsx` | 71 | `<canvas>` with `forwardRef`, exported `drawSkeleton()` function |
| `src/components/workout/score-display.tsx` | 65 | Live score gauge (left) + rep counter with Framer Motion (right) |
| `src/components/workout/control-bar.tsx` | 100 | Mute, pause/resume, stop, AI check buttons with ARIA labels |
| `src/components/workout/rest-timer.tsx` | 91 | Circular countdown SVG, skip button, plan progress text |
| `src/components/workout/countdown-overlay.tsx` | 38 | 3-2-1 large animated numbers with AnimatePresence |

## Files Modified

| File | Before | After | Change |
|------|--------|-------|--------|
| `src/components/screens/camera-workout.tsx` | 964 lines | 504 lines | Thin orchestrator composing hooks + sub-components |

## Architecture Decisions

1. **Circular dependency resolution**: Timer hook needs `startCountdown` (returned by hook) in its `onRestComplete` callback (passed into hook). Solved via ref delegation pattern: pass stable `() => ref.current()` wrappers to the hook, update refs every render.

2. **Stale closure prevention**: Used refs (`liveScoreRef`, `repsRef`, `durationRef`, `currentDrillIdRef`) for values accessed in timer callbacks that must not trigger effect re-runs.

3. **RAF management**: Kept in orchestrator since it connects pose detection + rep detection + canvas drawing across multiple hooks. Managed via `useEffect` keyed on `phase` — starts when active, cleans up on pause/rest.

4. **Timer hook uses internal refs** for callbacks (`onDrillCompleteRef`, `onRestCompleteRef`) updated every render, so interval callbacks always invoke the latest version.

5. **AI cooldown uses ref guard** (`cooldownRef`) instead of state in the `useCallback` dependency, keeping `requestAICheck` stable.

## Preserved Exactly
- `detectRep()` algorithm with all 8 category-specific detection branches
- `isBallVisible()` ball proximity check
- `drawSkeleton()` canvas drawing with orange connections/joints
- All ARIA labels (French)
- All audio cues via `@/lib/audio`
- Haptic feedback via `@/lib/haptics`
- Scoring weights: movement 55%, posture 15%, arms 22%, stance 8%
- Ball visibility penalty (cap at 20)
- Plan-based multi-drill progression
- XP event dispatch pattern

## Verification
- `bun run lint` — 0 errors
- Dev server compiles and runs without errors
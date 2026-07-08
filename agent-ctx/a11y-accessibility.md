# Task a11y — Accessibility Improvements

## 1. HTML lang attribute reactivity

**File:** `src/app/layout.tsx`

- Improved the inline `<script>` to validate `localStorage` value against allowed languages (`fr` | `en`) before applying, preventing invalid lang values like `"zh"` from being set
- The existing `LanguageProvider` React effect (`document.documentElement.lang = language`) already keeps the attribute in sync on language change — no change needed there
- The `<html lang="fr">` SSR default remains correct as the fallback

## 2. Form labels

**Files modified:**
- `src/components/screens/messages-screen.tsx` — Added `aria-label` to the recipient player ID input (no visual label, used in collapsed header)
- `src/components/screens/teams-screen.tsx` — Added `htmlFor="team-name"` / `id="team-name"` and `htmlFor="team-desc"` / `id="team-desc"` linking Labels to Inputs in the Create Team dialog
- `src/components/screens/challenges-screen.tsx` — Added `id="challenge-type"` to the `<SelectTrigger>` to match the existing `htmlFor="challenge-type"` on the Label

**Already correct (no changes needed):**
- Login form: all inputs have `<Label htmlFor>` + `id`
- Signup form: all inputs have `<Label htmlFor>` + `id`
- Reset password form: all inputs have labels
- Settings screen: all selects, switches, and sliders have `htmlFor`/`id` associations
- Live workout dialog: `Label htmlFor="live-session-title"` present

## 3. Touch targets ≥ 44px

All interactive elements below 44px were updated to use `min-h-[44px]` (buttons) or `min-h-[44px] min-w-[44px]` (icon buttons/squares):

| File | Element | Before | After |
|------|---------|--------|-------|
| `feed-screen.tsx` | "Post" header button | `h-8` (32px) | `min-h-[44px]` |
| `feed-screen.tsx` | Post type toggle buttons (Text/Workout/etc) | `py-1.5` (~24px) | `min-h-[44px]` |
| `challenges-screen.tsx` | "Create" header button | `h-8` | `min-h-[44px]` |
| `messages-screen.tsx` | New message toggle button | `h-8` | `min-h-[44px]` + `aria-label` |
| `messages-screen.tsx` | Send & Cancel buttons | default `size="sm"` | `min-h-[44px]` + `aria-label` on Cancel |
| `teams-screen.tsx` | "Create" header button | `h-8` | `min-h-[44px]` |
| `team-detail-screen.tsx` | "Leave" button | `h-8 text-xs` | `min-h-[44px] text-xs` |
| `notifications-screen.tsx` | "Mark all read" button | `h-8 text-xs` | `min-h-[44px] text-xs` |
| `live-workout-screen.tsx` | "End session" button | `h-8 text-xs` | `min-h-[44px] text-xs` |
| `live-workout-screen.tsx` | "Host" header button | `h-8` | `min-h-[44px]` |
| `live-workout-screen.tsx` | "Manage" / "Join" session buttons | `h-8` | `min-h-[44px]` |
| `train-hub-screen.tsx` | Favorite heart button on drill cards | `h-8 w-8` | `min-h-[44px] min-w-[44px]` |
| `video-compare-screen.tsx` | Restart (skip back) button | `h-8 w-8` | `min-h-[44px] min-w-[44px]` |
| `video-compare-screen.tsx` | Mute/unmute button | `h-8 w-8` | `min-h-[44px] min-w-[44px]` |
| `home-screen.tsx` | Profile avatar button | `h-9 w-9` (36px) | `min-h-[44px] min-w-[44px]` |
| `theme-toggle.tsx` | Dark/light mode toggle | `h-9 w-9` (36px) | `min-h-[44px] min-w-[44px]` |

## 4. ARIA live regions

| File | Element | Change |
|------|---------|--------|
| `src/components/screens/home-screen.tsx` | Level badge container | Added `aria-live="polite"` so screen readers announce level/XP changes |
| `src/components/home/xp-progress-bar.tsx` | Total XP number span | Added `aria-live="polite"` to announce XP total changes |
| `src/components/achievement-toast.tsx` | Toast content wrapper | Added `role="status"` + `aria-live="assertive"` for achievement unlock announcements |

**Already correct (no changes needed):**
- `src/app/page.tsx:188` — Existing `aria-live="polite"` announcer div for XP gain popup
- Sonner toasts — Built-in aria-live support from the toast library
- Progress bars — Already have `role="progressbar"` with `aria-valuenow/min/max`

## Lint result

All 14 modified files pass lint cleanly. The only lint error (`reaction/route.ts` parsing error) is pre-existing and unrelated to these changes.
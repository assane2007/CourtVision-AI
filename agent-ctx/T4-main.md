# Task T4: Split settings-screen.tsx into focused sub-components

## Summary
Extracted 5 new files from the main `settings-screen.tsx` (782 → 301 lines), reducing it by 61.5%.

## Line Counts

| File | Lines |
|------|-------|
| `src/components/screens/settings-screen.tsx` | **782 → 301** |
| `src/components/settings/weekly-goals-section.tsx` | 130 |
| `src/components/settings/preferences-section.tsx` | 165 |
| `src/components/settings/billing-section.tsx` | 37 |
| `src/components/settings/devices-section.tsx` | 81 |
| `src/components/settings/settings-skeleton.tsx` | 103 |

## New Files

1. **weekly-goals-section.tsx** (130 lines) — Weekly session/reps goal sliders with progress bars. Props: `settings`, `saveMutation`, `weekSessions`, `weekReps`. Self-contained handlers for slider changes.

2. **preferences-section.tsx** (165 lines) — Exports `TrainingSection` (rest duration select) and `PreferencesSection` (sound/haptics switches, language select). `PreferencesSection` takes `onLanguageChange` callback to sync i18n provider.

3. **billing-section.tsx** (37 lines) — Subscription plan display with upgrade button. Self-contained (uses `useAppStore` for navigation).

4. **devices-section.tsx** (81 lines) — Device list with revoke functionality. Self-contained with its own `useQuery` and `useMutation`.

5. **settings-skeleton.tsx** (103 lines) — Loading skeleton UI. Pure presentational, no props.

## Refactoring Approach
- Added a `SectionCard` helper in the main file to DRY up the repeated `motion.div > Card > CardHeader` pattern
- All sub-components follow the existing pattern (returning `CardContent` inner content, with Card wrappers in the parent)
- All i18n `t()`/`td()` calls preserved
- All API calls and state management unchanged
- `'use client'` added to all new files that use hooks

## Lint Result
**0 errors, 4 warnings** (all 4 warnings are pre-existing in test files unrelated to this change)
# Task 7 — Dark Mode Fixes & Visual Polish

## Status: ✅ Complete

## Changes Made

### Files Modified (8 files):
1. **`src/app/globals.css`** — Branded text selection + custom orange scrollbar (hidden on touch)
2. **`src/components/screens/stats-screen.tsx`** — Dark mode score colors in table, subtle card borders
3. **`src/components/screens/train-hub-screen.tsx`** — Drill card shadows/borders for dark mode
4. **`src/components/screens/achievements-screen.tsx`** — `bg-black/20` → `bg-foreground/10`, locked state dimming
5. **`src/components/screens/profile-screen.tsx`** — Shadow softening, disconnect text, card borders
6. **`src/components/screens/drill-detail-screen.tsx`** — Card border + shadow dark variants
7. **`src/components/screens/records-screen.tsx`** — Card border for dark mode
8. **`src/components/pwa-install-prompt.tsx`** — Border + shadow dark variants

### Auth Screen
- Verified as intentionally branded dark — no changes needed

### Key Patterns Applied:
- `dark:border-border/50` on all `border-0` cards for subtle dark borders
- `shadow-lg dark:shadow-md` to soften shadows in dark mode
- `dark:text-{color}-400` for score/indicator colors (lighter variants for dark bg)
- `bg-foreground/10` instead of `bg-black/20` for progress tracks
- `dark:opacity-40` for more subtle locked achievement dimming
- Custom scrollbar: 6px, orange accent, `@media not (pointer: coarse)` hides on mobile

### Lint Result:
- Zero new errors introduced
- Pre-existing errors in: page.tsx, create-plan-dialog.tsx, drill-detail-screen.tsx, records-screen.tsx, theme-toggle.tsx
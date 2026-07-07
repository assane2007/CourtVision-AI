# Task: Player DNA / Scouting Report

## Agent: Main

## Files Created/Modified:

1. **`/src/stores/app.ts`** — Added `'scouting'` to the `Screen` union type
2. **`/src/app/api/scouting/route.ts`** — NEW: API endpoint that queries all WorkoutSessionDrills for the authenticated player, computes per-category stats (avg score, total reps, sessions, trend from last 3 sessions), overall grade (S/A/B/C/D/F), overall score, and level-based benchmark
3. **`/src/components/screens/scouting-screen.tsx`** — NEW: Full scouting report screen with:
   - Player Identity Card (avatar, name, level badge, XP progress)
   - Custom SVG Radar Chart ("ADN Basketteur") with 6 axes, gradient fill, grid rings
   - Overall Grade (color-coded letter in circle)
   - AI Scouting Text Analysis (client-side template generation: Points Forts, Axes d'Amélioration, Profil de Joueur, Recommandation)
   - 6 Category Breakdown Cards (2-column grid with score, reps, sessions, trend arrow)
   - Comparison to level average (above/below badge)
   - Loading skeleton and error state
4. **`/src/app/page.tsx`** — Added dynamic import for ScoutingScreen and render case
5. **`/src/components/screens/profile-screen.tsx`** — Added prominent "Mon ADN de Joueur" card with Target icon, Sparkles, and ChevronRight, placed before XP section, navigating to 'scouting'

## Technical Details:
- Radar chart: Pure SVG with polygon, lines, text — 300x300 viewBox, gradient fill (orange-500 → amber-400, 30% opacity)
- Grade system: S (90+), A (80-89), B (70-79), C (60-69), D (50-59), F (<50)
- Category mapping: shooting→TIR, ball_handling+pocket_ball→DRIBBLE, speed_change→VITESSE, defense→DÉFENSE, footwork→PLACEMENT, conditioning→ENDURANCE
- Rate limit: 30 requests per 15 minutes via `rateLimit`
- All French text, orange primary, framer-motion stagger animations, shadcn/ui components
- Lint: 0 errors, 1 pre-existing warning
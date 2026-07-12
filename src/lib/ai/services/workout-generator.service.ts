/**
 * Workout Generator Service
 * Personalized AI workout generation based on player profile, history, and weaknesses.
 * Orchestrates: data gathering → drill filtering → prompt building → LLM call → DB storage.
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError, ErrorCode } from '@/lib/middleware/error-handler';
import { checkAndTrack } from '../rate-limiter';
import { chat } from '../providers/language.provider';
import { getWorkoutSystemPrompt, getWorkoutUserPrompt } from '../prompts/workout-prompts';
import { parseJsonResponse, clamp } from '../utils';
import type {
  GeneratedWorkout,
  GeneratedWorkoutDrill,
  WorkoutPreferences,
  SubscriptionTier,
  Lang,
} from '../types';

// ── Main Workout Generation Pipeline ──────────────────────────────────────────

/**
 * Generate a personalized workout for a player.
 */
export async function generateWorkout(
  playerId: string,
  preferences?: WorkoutPreferences,
  tier: SubscriptionTier = 'free',
  playerLang?: string,
): Promise<GeneratedWorkout> {
  const lang: Lang = (playerLang === 'en' ? 'en' : 'fr')

  // 1. Check rate limit
  const rateResult = await checkAndTrack(playerId, 'workout_gen', tier)
  if (!rateResult.allowed) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      lang === 'fr'
        ? `Trop de générations de plans. Réessayez dans ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`
        : `Too many workout generations. Try again in ${Math.ceil(rateResult.retryAfterMs / 60000)} min.`,
    )
  }

  // 2. Validate preferences
  const {
    durationMin = 30,
    focusAreas = [],
    equipment = [],
    intensity = 'medium',
  } = preferences ?? {}

  const validDurations = [15, 20, 30, 45, 60, 75, 90]
  const duration = validDurations.includes(durationMin) ? durationMin : 30

  const validFocusAreas = ['shooting', 'ball_handling', 'defense', 'footwork', 'finishing', 'conditioning', 'agility', 'speed_change']
  const areas = Array.isArray(focusAreas)
    ? focusAreas.filter((f: string) => validFocusAreas.includes(f)).slice(0, 3)
    : []

  // 3. Gather player data and available drills in parallel
  const [player, recentSessions, _recentWorkouts, formAnalyses, allDrills] = await Promise.all([
    db.player.findUnique({
      where: { id: playerId },
      select: {
        name: true, position: true, level: true, goals: true, xpLevel: true,
        language: true,
      },
    }),
    db.workoutSession.findMany({
      where: { playerId },
      include: {
        drills: {
          include: { drill: { select: { nameFr: true, category: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.generatedWorkout.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, createdAt: true },
    }),
    db.formAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { categories: true, overallScore: true },
    }),
    db.drill.findMany({
      where: {
        isActive: true,
        OR: [{ playerId: null }, { playerId }],
      },
    }),
  ])

  if (!player) {
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, 'Joueur non trouvé')
  }

  // 4. Calculate derived data
  const recentScores = recentSessions.map((s) => {
    const avg = s.drills.length > 0
      ? Math.round(s.drills.reduce((a, d) => a + d.score, 0) / s.drills.length)
      : 0
    return avg
  })
  const avgRecentScore = recentScores.length > 0
    ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
    : 0

  // Find weak form categories
  const weakCategories: string[] = []
  for (const f of formAnalyses) {
    try {
      const cats = typeof f.categories === 'string' ? JSON.parse(f.categories) : f.categories
      if (cats && typeof cats === 'object') {
        for (const [key, value] of Object.entries(cats)) {
          if (typeof value === 'number' && value < 60 && !weakCategories.includes(key)) {
            weakCategories.push(key)
          }
        }
      }
    } catch {
      // skip malformed
    }
  }

  // Get recent drill names to avoid repetition
  const recentDrillNames = recentSessions
    .flatMap((s) => s.drills.map((d) => d.drill?.nameFr ?? '').filter(Boolean))

  // Filter and format available drills
  const filteredDrills = areas.length === 0
    ? allDrills
    : allDrills.filter((d) => areas.includes(d.category))

  const drillList = filteredDrills
    .map((d) => `${d.nameFr} (cat=${d.category}, diff=${d.difficulty}, dur=${d.durationSec ?? 60}s, reps=${d.targetReps ?? 10})`)
    .join('\n')

  // 5. Build prompts
  const systemPrompt = getWorkoutSystemPrompt(lang)
  const userPrompt = getWorkoutUserPrompt({
    playerName: player.name,
    position: player.position,
    level: player.level,
    xpLevel: player.xpLevel,
    goals: player.goals,
    durationMin: duration,
    focusAreas: areas,
    equipment: Array.isArray(equipment) ? equipment.map(String).slice(0, 5) : [],
    intensity,
    avgRecentScore,
    weakCategories,
    recentDrillNames: recentDrillNames.slice(0, 10),
    availableDrills: drillList,
    lang,
  })

  // 6. Call LLM
  let responseContent: string
  let tokenUsage: GeneratedWorkout['tokenUsage']
  try {
    const result = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.4,
      responseFormat: 'json_object',
      maxTokens: 1500,
    })
    responseContent = result.content
    tokenUsage = result.tokenUsage
  } catch (err) {
    logger.error('Workout generation LLM call failed', 'ai.workout', {
      playerId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      lang === 'fr' ? 'Erreur de génération du plan. Réessayez.' : 'Workout generation error. Try again.',
    )
  }

  // 7. Parse and validate response
  const parsed = parseJsonResponse<Record<string, unknown>>(responseContent, null as unknown as Record<string, unknown>)
  if (!parsed) {
    throw new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      lang === 'fr' ? 'La réponse IA est invalide. Réessayez.' : 'Invalid AI response. Try again.',
    )
  }

  const workout = sanitizeAndBuildWorkout(parsed, player.level, duration, allDrills, lang)

  // 8. Save to DB
  try {
    const matchedDrillIds = workout.drills.map((d) => {
      const match = allDrills.find((ad) =>
        ad.nameFr.toLowerCase().includes(d.drillName.toLowerCase()) ||
        d.drillName.toLowerCase().includes(ad.nameFr.toLowerCase()),
      )
      return match?.id ?? null
    }).filter(Boolean)

    const saved = await db.generatedWorkout.create({
      data: {
        playerId,
        title: workout.title,
        description: workout.description,
        difficulty: workout.difficulty,
        durationMin: workout.durationMin,
        focusAreas: JSON.stringify(workout.focusAreas),
        drillIds: JSON.stringify(matchedDrillIds),
        aiReasoning: JSON.stringify({
          drills: workout.drills,
          warmup: workout.warmup,
          cooldown: workout.cooldown,
          expectedOutcome: workout.expectedOutcome,
        }),
      },
    })

    workout.id = saved.id
  } catch (dbErr) {
    logger.error('Failed to save generated workout', 'ai.workout', {
      playerId,
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    })
  }

  logger.info(
    `Workout generated: player=${playerId}, title="${workout.title}", drills=${workout.drills.length}, tokens=${tokenUsage?.totalTokens ?? 0}`,
    'ai.workout',
  )

  return { ...workout, tokenUsage }
}

// ── Workout Sanitization ────────────────────────────────────────────────────────

function sanitizeAndBuildWorkout(
  parsed: Record<string, unknown>,
  playerLevel: string,
  durationMin: number,
  _allDrills: { id: string; nameFr: string }[],
  lang: Lang,
): GeneratedWorkout {
  const isFR = lang === 'fr'
  const validDifficulties = ['beginner', 'intermediate', 'advanced']
  const difficulty = validDifficulties.includes(String(parsed.difficulty))
    ? String(parsed.difficulty)
    : playerLevel

  const drills: GeneratedWorkoutDrill[] = Array.isArray(parsed.drills)
    ? (parsed.drills as Record<string, unknown>[])
        .slice(0, 10)
        .map((d) => ({
          drillName: String(d.drillName || '').slice(0, 100),
          sets: clamp(Math.round(Number(d.sets) || 1), 1, 5),
          repsPerSet: clamp(Math.round(Number(d.repsPerSet) || 10), 1, 50),
          restSec: clamp(Math.round(Number(d.restSec) || 30), 10, 120),
          reasoning: String(d.reasoning || '').slice(0, 300),
          coachingTip: String(d.coachingTip || '').slice(0, 300),
        }))
    : []

  return {
    title: String(parsed.title || (isFR ? 'Plan IA' : 'AI Plan')).slice(0, 100),
    description: String(parsed.description || '').slice(0, 500),
    difficulty,
    durationMin,
    focusAreas: Array.isArray(parsed.focusAreas)
      ? (parsed.focusAreas as unknown[]).map(String).slice(0, 5)
      : [],
    drills,
    warmup: String(parsed.warmup || (isFR ? 'Échauffement général 3-5 min' : 'General warm-up 3-5 min')).slice(0, 300),
    cooldown: String(parsed.cooldown || (isFR ? 'Retour au calme 3-5 min' : 'Cool-down 3-5 min')).slice(0, 300),
    expectedOutcome: String(parsed.expectedOutcome || '').slice(0, 300),
  }
}
function workoutGeneratorService(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: workoutGeneratorService is not implemented yet.', args);
  return null;
}

export default workoutGeneratorService;
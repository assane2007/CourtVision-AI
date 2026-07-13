/**
 * Workout Prompts
 * System prompts for AI workout generation.
 * Builds personalized workout plans based on player data.
 */

import type { Lang } from '../types';
import { SECURITY_GUARD_FR, SECURITY_GUARD_EN } from './coaching-prompts';

// ── Workout Generation System Prompt ───────────────────────────────────────────

/**
 * Build the system prompt for workout generation.
 */
export function getWorkoutSystemPrompt(lang: Lang = 'fr'): string {
  const security = lang === 'fr' ? SECURITY_GUARD_FR : SECURITY_GUARD_EN

  if (lang === 'fr') {
    return `${security}

Tu es un planificateur d'entraînement basketball IA de haut niveau. Tu crées des plans d'entraînement personnalisés et réalistes.

## Principes de planification
- Chaque plan doit être réaliste et exécutable dans la durée demandée
- L'échauffement et le retour au calme sont OBLIGATOIRES - Varie les catégories d'exercices pour un entraînement complet
- Adapte le volume (sets × reps) à la durée et au niveau du joueur
- Les temps de repos doivent être réalistes (15-60s entre les séries)
- Un plan de 30 min = ~20 min d'exercices effectifs

## Règles strictes
- Choisis UNIQUEMENT des exercices de la liste fournie
- Adapte la difficulté au niveau du joueur
- Inclue un échauffement de 3-5 min et un retour au calme de 3-5 min
- Si le joueur a des faiblesses identifiées, priorise ces domaines
- Évite de répéter les exercices des plans récents
- Limite à 6-8 exercices par plan (qualité > quantité)

## Format de sortie
Réponds UNIQUEMENT en JSON valide.`
  }

  return `${security}

You are a high-level AI basketball training planner.
You create personalized and realistic training plans.

## Planning principles
- Every plan must be realistic and executable in the requested duration
- Warm-up and cool-down are MANDATORY
- Vary drill categories for a complete workout
- Adapt volume (sets × reps) to the duration and player level
- Rest times must be realistic (15-60s between sets)
- A 30 min plan = ~20 min of actual exercises

## Strict rules
- Choose ONLY drills from the provided list
- Adapt difficulty to the player's level
- Include a 3-5 min warm-up and 3-5 min cool-down
- If the player has identified weaknesses, prioritize those areas
- Avoid repeating exercises from recent plans
- Limit to 6-8 drills per plan (quality > quantity)

## Output format
Respond ONLY with valid JSON.`
}

// ── Workout User Prompt Builder ─────────────────────────────────────────────────

export interface WorkoutPromptData {
  playerName: string
  position: string
  level: string
  xpLevel: number
  goals: string
  durationMin: number
  focusAreas: string[]
  equipment: string[]
  intensity: string
  avgRecentScore: number
  weakCategories: string[]
  recentDrillNames: string[]
  availableDrills: string
  lang?: Lang
}

/**
 * Build the user prompt for workout generation with all player context.
 */
export function getWorkoutUserPrompt(data: WorkoutPromptData): string {
  const {
    playerName, position, level, xpLevel, goals,
    durationMin, focusAreas, equipment, intensity,
    avgRecentScore, weakCategories, recentDrillNames,
    availableDrills, lang = 'fr',
  } = data

  const isFR = lang === 'fr'

  const drillCountRange = durationMin <= 20 ? '3-5' : durationMin <= 45 ? '4-6' : '5-8'

  if (isFR) {
    return `PROFIL: ${playerName}, ${position}, niveau ${level}, objectif: ${goals}
NIVEAU XP: ${xpLevel}, score moyen récent: ${avgRecentScore}/100
${weakCategories.length > 0 ? `POINTS FAIBLES (prioriser ces catégories): ${weakCategories.join(', ')}` : ''}
${recentDrillNames.length > 0 ? `EXERCICES RÉCENTS (à éviter de répéter): ${recentDrillNames.join(', ')}` : ''}
DURÉE DEMANDÉE: ${durationMin} minutes (inclus échauffement et retour au calme)
${focusAreas.length > 0 ? `FOCUS: ${focusAreas.join(', ')}` : 'FOCUS: équilibré (tous les domaines)'}
${equipment.length > 0 ? `ÉQUIPEMENT DISPONIBLE: ${equipment.join(', ')}` : 'ÉQUIPEMENT: corps uniquement'}
INTENSITÉ: ${intensity}
NOMBRE D'EXERCICES: ${drillCountRange}

EXERCICES DISPONIBLES:
${availableDrills || 'Aucun exercice disponible'}

Réponds en JSON:
{
  "title": "titre du plan en français",
  "description": "description en français (2-3 phrases)",
  "difficulty": "beginner/intermediate/advanced",
  "durationMin": ${durationMin},
  "focusAreas": ["catégorie1", "catégorie2"],
  "drills": [
    {
      "drillName": "nom exact de l'exercice de la liste ci-dessus",
      "sets": 1-5,
      "repsPerSet": 5-30,
      "restSec": 15-60,
      "reasoning": "pourquoi cet exercice (1-2 phrases en français)",
      "coachingTip": "conseil de coaching en français"
    }
  ],
  "warmup": "échauffement recommandé en français (2-3 phrases)",
  "cooldown": "retour au calme en français (2-3 phrases)",
  "expectedOutcome": "résultat attendu en français (1-2 phrases)"
}`
  }

  return `PROFILE: ${playerName}, ${position}, level ${level}, goal: ${goals}
XP LEVEL: ${xpLevel}, recent avg score: ${avgRecentScore}/100
${weakCategories.length > 0 ? `WEAK AREAS (prioritize): ${weakCategories.join(', ')}` : ''}
${recentDrillNames.length > 0 ? `RECENT DRILLS (avoid repeating): ${recentDrillNames.join(', ')}` : ''}
REQUESTED DURATION: ${durationMin} minutes (including warm-up and cool-down)
${focusAreas.length > 0 ? `FOCUS: ${focusAreas.join(', ')}` : 'FOCUS: balanced (all areas)'}
${equipment.length > 0 ? `EQUIPMENT AVAILABLE: ${equipment.join(', ')}` : 'EQUIPMENT: bodyweight only'}
INTENSITY: ${intensity}
NUMBER OF DRILLS: ${drillCountRange}

AVAILABLE DRILLS:
${availableDrills || 'No drills available'}

Respond in JSON:
{
  "title": "plan title in English",
  "description": "description in English (2-3 sentences)",
  "difficulty": "beginner/intermediate/advanced",
  "durationMin": ${durationMin},
  "focusAreas": ["category1", "category2"],
  "drills": [
    {
      "drillName": "exact drill name from the list above",
      "sets": 1-5,
      "repsPerSet": 5-30,
      "restSec": 15-60,
      "reasoning": "why this drill (1-2 sentences in English)",
      "coachingTip": "coaching tip in English"
    }
  ],
  "warmup": "recommended warm-up in English (2-3 sentences)",
  "cooldown": "cool-down in English (2-3 sentences)",
  "expectedOutcome": "expected outcome in English (1-2 sentences)"
}`
}

// ── Prediction Prompts ──────────────────────────────────────────────────────────

/**
 * Build prompts for player progression predictions.
 */
export function getPredictionPrompt(params: {
  type: 'next_level' | 'injury_risk' | 'performance_trend' | 'plateau_detection'
  context: string
  lang?: Lang
}): string {
  const { type, context, lang = 'fr' } = params
  const isFR = lang === 'fr'

  const prompts: Record<string, { fr: string; en: string }> = {
    next_level: {
      fr: `${context}

Prédis quand ce joueur atteindra le niveau suivant.
Réponds en JSON: {"predictedValue": "YYYY-MM-DD ou null", "confidence": 0-1, "factors": ["facteur1", "facteur2"], "recommendation": "conseil en français (1-2 phrases)"}
Sois réaliste basé sur le rythme d'entraînement. Si pas assez de données, mets predictedValue à null et confidence basse.`,
      en: `${context}

Predict when this player will reach the next level.
Respond in JSON: {"predictedValue": "YYYY-MM-DD or null", "confidence": 0-1, "factors": ["factor1", "factor2"], "recommendation": "advice in English (1-2 sentences)"}
Be realistic based on training pace. If not enough data, set predictedValue to null and low confidence.`,
    },
    injury_risk: {
      fr: `${context}

Évalue le risque de blessure (0-100%) basé sur le volume et la régularité d'entraînement.
Réponds en JSON: {"predictedValue": 0-100, "confidence": 0-1, "factors": ["facteur1"], "recommendation": "conseil prévention en français (1-2 phrases)"}
Attention: un entraînement irrégulier ou trop intense augmente le risque. L'absence de repos est un facteur majeur.`,
      en: `${context}

Assess injury risk (0-100%) based on training volume and consistency.
Respond in JSON: {"predictedValue": 0-100, "confidence": 0-1, "factors": ["factor1"], "recommendation": "prevention advice in English (1-2 sentences)"}
Note: irregular or overly intense training increases risk. Lack of rest is a major factor.`,
    },
    performance_trend: {
      fr: `${context}

Prédis la performance future (score moyen estimé sur 30 jours, 0-100).
Réponds en JSON: {"predictedValue": 0-100, "confidence": 0-1, "factors": ["facteur1"], "recommendation": "conseil amélioration en français (1-2 phrases)"}
Base-toi sur la tendance récente et la régularité.`,
      en: `${context}

Predict future performance (estimated average score over 30 days, 0-100).
Respond in JSON: {"predictedValue": 0-100, "confidence": 0-1, "factors": ["factor1"], "recommendation": "improvement advice in English (1-2 sentences)"}
Base this on recent trend and consistency.`,
    },
    plateau_detection: {
      fr: `${context}

Prédis si le joueur risque de stagner (plateau) dans les 2 semaines.
Réponds en JSON: {"predictedValue": 0-100 (probabilité de plateau), "confidence": 0-1, "factors": ["facteur1"], "recommendation": "conseil pour éviter le plateau en français (1-2 phrases)"}
Les signes de plateau: score stable, pas de progression des compétences, manque de variété dans l'entraînement.`,
      en: `${context}

Predict if the player risks plateauing in the next 2 weeks.
Respond in JSON: {"predictedValue": 0-100 (plateau probability), "confidence": 0-1, "factors": ["factor1"], "recommendation": "advice to avoid plateau in English (1-2 sentences)"}
Signs of plateau: stable scores, no skill progression, lack of training variety.`,
    },
  }

  return prompts[type]?.[isFR ? 'fr' : 'en'] ?? prompts[type]?.fr ?? ''
}
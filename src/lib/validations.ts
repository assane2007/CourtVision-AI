import { z } from 'zod'

// ── Reusable field validators ──────────────────────────────────────────────

export const VALID_CATEGORIES = [
  'pocket_ball', 'shifty', 'ball_handling', 'speed_change',
  'defense', 'shooting', 'footwork', 'finishing', 'conditioning',
] as [string, ...string[]]

export const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as [string, ...string[]]
export const VALID_POSITIONS = ['guard', 'forward', 'center'] as [string, ...string[]]
export const VALID_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'] as [string, ...string[]]
export const VALID_GOALS = ['shooting', 'ball_handling', 'defense', 'conditioning', 'general'] as [string, ...string[]]

// ── Auth ───────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(50),
})

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

// ── Player / Profile ───────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  position: z.enum(VALID_POSITIONS, { error: 'Position invalide' }).optional(),
  level: z.enum(VALID_LEVELS, { error: 'Niveau invalide' }).optional(),
  goals: z.enum(VALID_GOALS, { error: 'Objectif invalide' }).optional(),
  avatar: z.string().max(500).url('URL invalide').nullable().optional(),
  onboarding: z.boolean().optional(),
})

// ── Drills ─────────────────────────────────────────────────────────────────

export const createDrillSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)').max(100).optional(),
  nameFr: z.string().min(2, 'Nom français requis (min 2 caractères)').max(100),
  category: z.enum(VALID_CATEGORIES, { error: 'Catégorie invalide' }),
  difficulty: z.enum(VALID_DIFFICULTIES, { error: 'Difficulté invalide' }),
  description: z.string().max(1000).optional(),
  descriptionFr: z.string().max(1000).optional(),
  instructions: z.string().max(2000).optional(),
  instructionsFr: z.string().max(2000).optional(),
  durationSec: z.number().int().min(10).max(300).optional(),
  targetReps: z.number().int().min(1).max(200).optional(),
  icon: z.string().max(10).optional(),
})

// ── Sessions ───────────────────────────────────────────────────────────────

export const drillScoreSchema = z.object({
  drillId: z.string().min(1, 'Drill ID requis'),
  reps: z.number().int().min(0).max(500),
  score: z.number().min(0).max(100),
  durationMs: z.number().int().min(0).max(3600000), // max 1 hour
  formFeedback: z.string().max(5000).optional(),
})

export const createSessionSchema = z.object({
  drillScores: z.array(drillScoreSchema).min(1, 'Au moins un exercice requis').max(20),
  totalReps: z.number().int().min(0).optional(),
  totalDurationMs: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

export const endSessionSchema = z.object({
  totalScore: z.number().min(0).max(10000).optional(),
  totalReps: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

// ── Favorites ──────────────────────────────────────────────────────────────

export const toggleFavoriteSchema = z.object({
  drillId: z.string().min(1, 'Drill ID requis'),
})

// ── AI Form Check ──────────────────────────────────────────────────────────

export const formCheckSchema = z.object({
  imageBase64: z.string().min(100, 'Image requise'),
  drillName: z.string().min(1, 'Nom de l\'exercice requis'),
  category: z.string().min(1, 'Catégorie requise'),
  drillInstructions: z.string().optional(),
})

// ── Training Plans ─────────────────────────────────────────────────────────

export const createPlanSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)').max(100),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  drillIds: z.array(z.string().min(1)).max(20).optional(),
})

export const updatePlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  drillIds: z.array(z.string().min(1)).max(20).optional(),
})

// ── Helper: Extract error message from ZodError ───────────────────────────

export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides'
}
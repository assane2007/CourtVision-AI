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

// ── Reusable password validation (shared between signup and reset) ─────────

const passwordRules = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')

// ── Auth ───────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: passwordRules,
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

// ── Profile PATCH (full field set with strict validation) ────────────────────

const skillField = z.number().int().min(0).max(100)

export const profilePatchSchema = z.object({
  name:        z.string().min(2).max(50).optional(),
  bio:         z.string().max(500).optional(),
  position:    z.enum(VALID_POSITIONS, { error: 'Position invalide' }).optional(),
  level:       z.enum(VALID_LEVELS, { error: 'Niveau invalide' }).optional(),
  city:        z.string().max(100).optional(),
  country:     z.string().max(100).optional(),
  avatar:      z.string().max(500).url('URL invalide').nullable().optional(),
  coverPhoto:  z.string().max(500).url('URL invalide').nullable().optional(),
  shooting:    skillField.optional(),
  handling:    skillField.optional(),
  finishing:   skillField.optional(),
  defense:     skillField.optional(),
  iq:          skillField.optional(),
  age:         z.number().int().min(5).max(120).optional(),
  heightCm:    z.number().int().min(50).max(300).optional(),
  weightKg:    z.number().int().min(20).max(300).optional(),
  yearsExp:    z.number().int().min(0).max(80).optional(),
  isOnboarded: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Au moins un champ est requis.',
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
  imageBase64: z.string().min(100, 'Image requise').max(10 * 1024 * 1024, 'Image trop volumineuse (max 10 Mo).'),
  drillName: z.string().min(1, 'Nom de l\'exercice requis').max(200),
  category: z.string().min(1, 'Catégorie requise').max(100),
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

// ── Reset Password ──────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalide.'),
})

export const resetPasswordConfirmSchema = z.object({
  token: z.string().min(1, 'Token requis.'),
  newPassword: passwordRules,
})

// ── AI Coach ────────────────────────────────────────────────────────────

export const aiCoachSchema = z.object({
  message: z.string().min(1, 'Message requis.').max(2000, 'Message trop long.'),
})

// ── Billing ─────────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  planId: z.enum(['pro', 'elite'], { message: 'Plan invalide.' }),
})

// ── Reaction ────────────────────────────────────────────────────────────

export const reactionRoundSchema = z.object({
  reactionMs: z.number().int().min(50).max(5000),
  correct: z.boolean(),
})

export const reactionSchema = z.object({
  type: z.enum(['direction', 'color', 'shot_clock', 'reflex']),
  rounds: z.array(reactionRoundSchema).min(1, 'Au moins un round requis.').max(50),
})

// ── Settings ────────────────────────────────────────────────────────────

export const settingsPatchSchema = z.object({
  position: z.enum(VALID_POSITIONS, { error: 'Position invalide' }).optional(),
  level: z.enum(VALID_LEVELS, { error: 'Niveau invalide' }).optional(),
  goals: z.enum(VALID_GOALS, { error: 'Objectif invalide' }).optional(),
  weeklyGoalSessions: z.number().int().min(1).max(7).optional(),
  weeklyGoalReps: z.number().int().min(10).max(500).optional(),
  preferredRestSec: z.number().int().min(5).max(120).optional(),
  soundEnabled: z.boolean().optional(),
  hapticsEnabled: z.boolean().optional(),
  language: z.enum(['fr', 'en']).optional(),
  notifStreak: z.boolean().optional(),
  notifChallenge: z.boolean().optional(),
  notifAchievement: z.boolean().optional(),
  name: z.string().min(1).max(50).optional(),
  avatar: z.string().max(500).url('URL invalide').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Au moins un champ est requis.',
})

// ── Share ───────────────────────────────────────────────────────────────

export const shareSchema = z.object({
  sessionId: z.string().min(1),
})

// ── Notifications ───────────────────────────────────────────────────────

export const notificationSubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint invalide.'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
})

// ── Live Sessions ───────────────────────────────────────────────────────

export const createLiveSessionSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200).transform(v => v.trim()),
  drillId: z.string().max(100).optional().nullable(),
  maxViewers: z.number().int().min(2).max(100).optional().default(10),
})

export const liveScoreUpdateSchema = z.object({
  score: z.number().min(0).max(10000, 'Score trop élevé'),
  reps: z.number().int().min(0).max(10000).optional().default(0),
})

// ── Sync ────────────────────────────────────────────────────────────────

const syncActionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['session_save', 'drill_favorite', 'settings_update']),
  payload: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
})

export const syncPushSchema = z.object({
  actions: z.array(syncActionSchema).min(1, 'Aucune action à synchroniser').max(100, 'Maximum 100 actions par requête'),
  deviceId: z.string().min(1, 'ID appareil requis').max(200),
})

// ── Push Register ───────────────────────────────────────────────────────

export const pushRegisterSchema = z.object({
  pushToken: z.string().min(1, 'Token push requis').max(1000),
  deviceName: z.string().max(200).optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'web']).optional(),
  os: z.string().max(100).optional(),
  appVersion: z.string().max(50).optional(),
})

// ── Devices ─────────────────────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  name: z.string().max(200).optional(),
  type: z.enum(['mobile', 'tablet', 'desktop', 'web']).optional(),
  os: z.string().max(100).optional(),
  appVersion: z.string().max(50).optional(),
  pushToken: z.string().max(1000).optional().nullable(),
  deviceId: z.string().max(100).optional(),
})

// ── Helper: Extract error message from ZodError ───────────────────────────

export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides'
}
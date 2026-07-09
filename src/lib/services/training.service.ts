/**
 * Training service — business logic for workout sessions, drills, and training plans.
 * Orchestrates session creation, XP awarding, and streak management.
 */

import { db } from '@/lib/db'
import { sessionRepository, drillRepository, trainingPlanRepository } from '@/lib/repositories/training.repository'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { awardXp } from '@/lib/award-xp'
import { calculateWorkoutXp, calculateStreakXp } from '@/lib/xp'
import { calculateStreak } from '@/lib/streak'
import { cacheInvalidatePattern } from '@/lib/cache'
import { logger } from '@/lib/logger'
import type {
  CreateSessionInput,
  SessionData,
  CreateSessionResult,
  DrillFilters,
} from '@/lib/types/service.types'

// ── Session CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a new workout session with drill results.
 * Creates the session + drill scores transactionally, computes totals,
 * checks personal bests, and awards XP.
 *
 * This is the main entry point for recording a workout.
 */
export async function createSession(
  playerId: string,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const { drillScores, notes } = input

  // Verify all drill IDs exist and are accessible
  const drillIds = drillScores.map((d) => d.drillId)
  const accessibleIds = await drillRepository.findAccessibleIds(drillIds, playerId)

  const invalidIds = drillIds.filter((id) => !accessibleIds.has(id))
  if (invalidIds.length > 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `${invalidIds.length} exercice(s) introuvable(s) ou inaccessible(s)`,
    )
  }

  // Compute totals from server-validated scores
  const totalScore = drillScores.reduce((sum, d) => sum + d.score, 0)
  const totalReps = drillScores.reduce((sum, d) => sum + d.reps, 0)
  const totalDurationMs = drillScores.reduce((sum, d) => sum + d.durationMs, 0)
  const avgScore = Math.round((totalScore / drillScores.length) * 10) / 10

  // Check for personal bests
  const personalBests = await sessionRepository.getPersonalBests(drillIds, playerId)
  const bestMap = Object.fromEntries(personalBests.map((b) => [b.drillId, b._max.score]))

  let hasPersonalBest = false
  for (const ds of drillScores) {
    const prevBest = bestMap[ds.drillId] ?? 0
    if (ds.score > prevBest) {
      hasPersonalBest = true
      break
    }
  }

  // Create the workout session
  const workoutSession = await db.workoutSession.create({
    data: {
      playerId,
      totalScore: Math.round(totalScore * 10) / 10,
      totalReps,
      totalDrills: drillScores.length,
      notes,
      endedAt: new Date(),
      drills: {
        create: drillScores.map((d) => ({
          drillId: d.drillId,
          reps: d.reps,
          score: Math.round(d.score * 10) / 10,
          durationMs: d.durationMs,
          formFeedback: d.formFeedback || '{}',
        })),
      },
    },
    include: {
      drills: {
        include: {
          drill: {
            select: { id: true, nameFr: true, icon: true, category: true },
          },
        },
      },
    },
  })

  // Award XP
  const durationSec = Math.round(totalDurationMs / 1000)
  const workoutRewards = calculateWorkoutXp(avgScore, totalReps, durationSec, hasPersonalBest)
  const allRewards = [...workoutRewards]

  // Check streak
  const allPlayerSessions = await sessionRepository.getPlayerSessionDates(playerId)
  const streakData = calculateStreak(allPlayerSessions)
  if (streakData.current > 1) {
    allRewards.push(calculateStreakXp(streakData.current))
  }

  const xpResult = await awardXp(playerId, allRewards)

  // Invalidate caches
  cacheInvalidatePattern('stats:')
  cacheInvalidatePattern('records:')
  cacheInvalidatePattern('recommendations:')
  cacheInvalidatePattern('achievements:')
  cacheInvalidatePattern('leaderboard:')

  logger.info('Session created', 'training.service', {
    playerId,
    sessionId: workoutSession.id,
    totalScore,
    totalReps,
    drillCount: drillScores.length,
    xpGained: xpResult?.xpGained,
  })

  return {
    session: workoutSession as unknown as SessionData,
    xpAwarded: xpResult
      ? { xpGained: xpResult.xpGained, leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel }
      : null,
  }
}

/**
 * End/update an existing session (add final notes, scores).
 */
export async function endSession(
  sessionId: string,
  playerId: string,
  data: {
    totalScore?: number
    totalReps?: number
    notes?: string
  },
): Promise<SessionData> {
  // Verify ownership
  const existing = await sessionRepository.findFirst(
    { id: sessionId, playerId },
  )

  if (!existing) {
    throw new AppError(ErrorCode.SESSION_NOT_FOUND, 'Séance non trouvée')
  }

  const updated = await db.workoutSession.update({
    where: { id: sessionId },
    data: {
      ...(data.totalScore !== undefined && { totalScore: data.totalScore }),
      ...(data.totalReps !== undefined && { totalReps: data.totalReps }),
      ...(data.notes !== undefined && { notes: data.notes }),
      endedAt: new Date(),
    },
    include: {
      drills: {
        include: {
          drill: {
            select: { id: true, nameFr: true, icon: true, category: true, difficulty: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  logger.info('Session ended', 'training.service', { sessionId, playerId })

  return updated as unknown as SessionData
}

/**
 * Get a single session with drill details (ownership-checked).
 */
export async function getSession(sessionId: string, playerId: string): Promise<SessionData> {
  const session = await sessionRepository.findWithDrills(sessionId, playerId)

  if (!session) {
    throw new AppError(ErrorCode.SESSION_NOT_FOUND, 'Séance non trouvée')
  }

  return session as unknown as SessionData
}

/**
 * Get paginated sessions for a player.
 */
export async function getPlayerSessions(
  playerId: string,
  params: {
    cursor?: string | null
    page?: number | null
    limit?: number | null
  } = {},
) {
  const { cursor, page, limit } = params

  // Page-based pagination
  if (page && page > 0 && !cursor) {
    const take = Math.min(Math.max(limit ?? 20, 1), 100)
    const skip = (page - 1) * take

    const [sessions, total] = await Promise.all([
      db.workoutSession.findMany({
        where: { playerId },
        include: {
          drills: {
            include: {
              drill: { select: { id: true, nameFr: true, icon: true, category: true } },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take,
        skip,
      }),
      sessionRepository.countForPlayer(playerId),
    ])

    return {
      sessions,
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: page * take < total,
    }
  }

  // Cursor-based pagination
  const take = Math.min(Math.max(limit ?? 20, 1), 100)
  const queryLimit = take + 1

  const sessions = await db.workoutSession.findMany({
    where: { playerId },
    include: {
      drills: {
        include: {
          drill: { select: { id: true, nameFr: true, icon: true, category: true } },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: queryLimit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = sessions.length > take
  const pageSessions = hasMore ? sessions.slice(0, take) : sessions
  const nextCursor = hasMore ? pageSessions[pageSessions.length - 1].id : null

  return {
    sessions: pageSessions,
    nextCursor,
    count: pageSessions.length,
    hasMore,
  }
}

/**
 * Delete a session (ownership-checked).
 */
export async function deleteSession(sessionId: string, playerId: string): Promise<void> {
  const existing = await sessionRepository.findFirst(
    { id: sessionId, playerId },
  )

  if (!existing) {
    throw new AppError(ErrorCode.SESSION_NOT_FOUND, 'Séance non trouvée')
  }

  await db.workoutSession.delete({ where: { id: sessionId } })

  // Invalidate caches
  cacheInvalidatePattern('stats:')
  cacheInvalidatePattern('records:')
  cacheInvalidatePattern('leaderboard:')

  logger.info('Session deleted', 'training.service', { sessionId, playerId })
}

// ── Drills ─────────────────────────────────────────────────────────────────────

/**
 * Get drills with filtering, search, and pagination.
 */
export async function getDrills(
  filters: DrillFilters,
  playerId: string | null,
  params?: { cursor?: string; limit?: number },
) {
  return drillRepository.findFiltered({
    filters,
    playerId,
    cursor: params?.cursor,
    limit: params?.limit,
  })
}

/**
 * Get a single drill by ID.
 */
export async function getDrill(drillId: string) {
  const drill = await db.drill.findUnique({
    where: { id: drillId, isActive: true },
  })

  if (!drill) {
    throw new AppError(ErrorCode.DRILL_NOT_FOUND, 'Exercice introuvable')
  }

  return drill
}

/**
 * Create a custom drill for a player.
 */
export async function createCustomDrill(
  playerId: string,
  data: {
    name?: string
    nameFr: string
    category: string
    difficulty: string
    description?: string
    descriptionFr?: string
    instructions?: string
    instructionsFr?: string
    durationSec?: number
    targetReps?: number
    icon?: string
  },
) {
  const drill = await db.drill.create({
    data: {
      playerId,
      isCustom: true,
      name: data.name ?? data.nameFr,
      nameFr: data.nameFr,
      category: data.category,
      difficulty: data.difficulty,
      description: data.description ?? null,
      descriptionFr: data.descriptionFr ?? null,
      instructions: data.instructions ?? null,
      instructionsFr: data.instructionsFr ?? null,
      durationSec: data.durationSec ?? null,
      targetReps: data.targetReps ?? null,
      icon: data.icon ?? null,
      isActive: true,
    },
  })

  logger.info('Custom drill created', 'training.service', { playerId, drillId: drill.id })
  return drill
}

// ── Training Plans ─────────────────────────────────────────────────────────────

/**
 * Get training plans for a player.
 */
export async function getPlayerPlans(playerId: string, options?: { isActive?: boolean }) {
  return trainingPlanRepository.findForPlayer(playerId, options)
}

/**
 * Create a training plan.
 */
export async function createPlan(
  playerId: string,
  data: {
    name: string
    description?: string
    isPublic?: boolean
    drillIds?: string[]
  },
) {
  const plan = await db.trainingPlan.create({
    data: {
      playerId,
      name: data.name,
      description: data.description ?? null,
      isPublic: data.isPublic ?? false,
      isActive: false,
      drills: data.drillIds?.length
        ? {
            create: data.drillIds.map((drillId, index) => ({
              drillId,
              order: index,
            })),
          }
        : undefined,
    },
    include: {
      drills: {
        include: {
          drill: {
            select: { id: true, nameFr: true, icon: true, category: true, difficulty: true },
          },
        },
      },
    },
  })

  logger.info('Training plan created', 'training.service', { playerId, planId: plan.id })
  return plan
}
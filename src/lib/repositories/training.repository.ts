/**
 * Training repository — data access layer for WorkoutSession, Drill, and TrainingPlan models.
 * Extends BaseRepository with training-specific queries.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import type { DrillData, DrillFilters } from '@/lib/types/service.types'

// ── Workout Session Repository ──────────────────────────────────────────────────

export class SessionRepository extends BaseRepository<'WorkoutSession', any> {
  constructor() {
    super(db.workoutSession as any, 'WorkoutSession')
  }

  /**
   * Find a session with drill details, ensuring ownership.
   */
  async findWithDrills(sessionId: string, playerId: string) {
    return db.workoutSession.findFirst({
      where: { id: sessionId, playerId },
      include: {
        drills: {
          include: {
            drill: {
              select: {
                id: true,
                nameFr: true,
                icon: true,
                category: true,
                difficulty: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  /**
   * Get all sessions for a player (for streak calculation).
   */
  async getPlayerSessionDates(playerId: string): Promise<Date[]> {
    const sessions = await db.workoutSession.findMany({
      where: { playerId },
      select: { startedAt: true },
      orderBy: { startedAt: 'asc' },
    })
    return sessions.map((s) => s.startedAt)
  }

  /**
   * Get recent session summaries for a player's stats.
   */
  async getRecentSummaries(playerId: string, take = 10) {
    return db.workoutSession.findMany({
      where: { playerId },
      orderBy: { startedAt: 'desc' },
      take,
      select: {
        id: true,
        startedAt: true,
        totalDurationSec: true,
        totalScore: true,
        avgScore: true,
        totalDrills: true,
        notes: true,
      },
    })
  }

  /**
   * Get personal best scores for a set of drills (grouped).
   */
  async getPersonalBests(drillIds: string[], playerId: string) {
    return db.workoutSessionDrill.groupBy({
      by: ['drillId'],
      where: { drillId: { in: drillIds }, session: { playerId } },
      _max: { score: true },
      orderBy: { drillId: 'asc' },
    })
  }

  /**
   * Count total sessions for a player.
   */
  async countForPlayer(playerId: string): Promise<number> {
    return db.workoutSession.count({ where: { playerId } })
  }
}

// ── Drill Repository ────────────────────────────────────────────────────────────

export class DrillRepository extends BaseRepository<'Drill', any> {
  constructor() {
    super(db.drill as any, 'Drill')
  }

  /**
   * Find drills with filtering, search, and pagination.
   * Returns drills with isFavorite flag.
   */
  async findFiltered(params: {
    filters: DrillFilters
    playerId?: string | null
    cursor?: string
    limit?: number
  }) {
    const { filters, playerId, cursor, limit = 20 } = params
    const andFilters: Prisma.DrillWhereInput[] = [
      { isActive: true },
      {
        OR: [
          { playerId: null },
          ...(playerId ? [{ playerId }] : []),
        ],
      },
    ]

    if (filters.category && filters.category !== 'all') {
      andFilters.push({ category: filters.category })
    }
    if (filters.difficulty) {
      andFilters.push({ difficulty: filters.difficulty })
    }
    if (filters.search) {
      andFilters.push({
        OR: [
          { nameFr: { contains: filters.search } },
          { name: { contains: filters.search } },
          { descriptionFr: { contains: filters.search } },
        ],
      })
    }
    if (filters.customOnly) {
      andFilters.push({ isCustom: true })
    }

    const baseWhere: Prisma.DrillWhereInput = { AND: andFilters }

    // Cursor: use id-based cursor (lexicographic for SQLite)
    const cursorWhere: Prisma.DrillWhereInput = cursor
      ? { AND: [...andFilters, { id: { gt: cursor } }] }
      : baseWhere

    const orderBy = [
      { isCustom: 'asc' as const },
      { category: 'asc' as const },
      { difficulty: 'asc' as const },
    ]

    // Fetch one extra to detect hasMore
    const drills = await db.drill.findMany({
      where: cursorWhere,
      orderBy,
      take: limit + 1,
    })

    const hasMore = drills.length > limit
    const pageDrills = hasMore ? drills.slice(0, limit) : drills
    const nextCursor = hasMore ? pageDrills[pageDrills.length - 1].id : null

    // Total count (only on first page)
    let total: number | undefined
    if (!cursor) {
      total = await db.drill.count({ where: baseWhere })
    }

    // Fetch user's favorites
    const favorites = playerId
      ? await db.drillFavorite.findMany({
          where: { playerId, drillId: { in: pageDrills.map((d) => d.id) } },
          select: { drillId: true },
        })
      : []

    const favoriteIds = new Set(favorites.map((f) => f.drillId))

    const data: DrillData[] = pageDrills.map((d) => ({
      id: d.id,
      name: d.nameFr || d.name,
      nameFr: d.nameFr || d.name,
      category: d.category,
      difficulty: d.difficulty,
      description: d.descriptionFr || d.description,
      descriptionFr: d.descriptionFr || d.description,
      instructions: d.instructionsFr || d.instructions,
      instructionsEn: d.instructions,
      durationSec: d.durationSec,
      targetReps: d.targetReps,
      icon: d.icon,
      isCustom: d.isCustom,
      isFavorite: favoriteIds.has(d.id),
      isActive: d.isActive,
    }))

    return {
      data,
      nextCursor,
      total,
      count: data.length,
      hasMore,
    }
  }

  /**
   * Get accessible drill IDs (system drills + player's custom drills).
   */
  async findAccessibleIds(drillIds: string[], playerId: string): Promise<Set<string>> {
    const drills = await db.drill.findMany({
      where: {
        id: { in: drillIds },
        isActive: true,
        OR: [{ playerId: null }, { playerId }],
      },
      select: { id: true },
    })
    return new Set(drills.map((d) => d.id))
  }

  /**
   * Get total count of drills for a player (system + custom).
   */
  async countAccessible(playerId: string): Promise<number> {
    return db.drill.count({
      where: {
        isActive: true,
        OR: [{ playerId: null }, { playerId }],
      },
    })
  }
}

// ── Training Plan Repository ────────────────────────────────────────────────────

export class TrainingPlanRepository extends BaseRepository<'TrainingPlan', any> {
  constructor() {
    super(db.trainingPlan as any, 'TrainingPlan')
  }

  /**
   * Find plans for a player with drill details.
   */
  async findForPlayer(playerId: string, params?: { isActive?: boolean }) {
    return db.trainingPlan.findMany({
      where: {
        playerId,
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
      include: {
        drills: {
          include: {
            drill: {
              select: {
                id: true,
                nameFr: true,
                icon: true,
                category: true,
                difficulty: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find public plans (for discovery/browsing).
   */
  async findPublic(params: { cursor?: string; limit?: number }) {
    const { cursor, limit = 20 } = params
    const where: Prisma.TrainingPlanWhereInput = { isPublic: true }

    const cursorWhere = cursor
      ? { AND: [where, { id: { gt: cursor } }] as Prisma.TrainingPlanWhereInput[] }
      : where

    const plans = await db.trainingPlan.findMany({
      where: cursorWhere,
      include: {
        player: { select: { id: true, name: true, avatar: true } },
        drills: {
          include: {
            drill: {
              select: { id: true, nameFr: true, icon: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = plans.length > limit
    const pagePlans = hasMore ? plans.slice(0, limit) : plans
    const nextCursor = hasMore ? pagePlans[pagePlans.length - 1].id : null

    return { plans: pagePlans, nextCursor, hasMore, count: pagePlans.length }
  }
}

// ── Singletons ──────────────────────────────────────────────────────────────────

export const sessionRepository = new SessionRepository()
export const drillRepository = new DrillRepository()
export const trainingPlanRepository = new TrainingPlanRepository()
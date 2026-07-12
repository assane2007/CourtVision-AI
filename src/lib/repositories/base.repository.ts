/**
 * Generic base repository providing CRUD operations with pagination,
 * filtering, and automatic Prisma error transformation.
 *
 * Every domain repository should extend this class by providing
 * the Prisma delegate and model name.
 *
 * @example
 * class PlayerRepository extends BaseRepository<
 *   'Player',
 *   Prisma.PlayerGetPayload<{}>
 * > {
 *   constructor() {
 *     super(db.player, 'Player')
 *   }
 * }
 */

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { AppError, ErrorCode } from '@/lib/middleware/error-handler';
import { parsePagination, createPaginationMeta, trimExtraItem } from '@/lib/middleware/pagination';
import type { PaginatedResult } from '@/lib/types/service.types';
import { logger } from '@/lib/logger';

// ── Prisma Delegate Type ────────────────────────────────────────────────────────

/**
 * Minimal interface that any Prisma model delegate must satisfy.
 * Covers the CRUD methods we use in the base repository.
 */
export interface PrismaModelDelegate<T> {
  findMany(args?: any): Promise<T[]>
  findFirst(args?: any): Promise<T | null>
  findUnique(args?: any): Promise<T | null>
  create(args: any): Promise<T>
  update(args: any): Promise<T>
  delete(args: any): Promise<T>
  count(args?: any): Promise<number>
}

// We need to use the actual Prisma types for proper type safety
// These re-exports allow us to use Prisma's own types in generics
type FindManyArgs<T = never> = T extends never
  ? any
  : any & { select?: unknown; include?: unknown }

type FindFirstArgs<T = never> = T extends never
  ? any
  : any & { select?: unknown; include?: unknown }

type FindUniqueArgs<T = never> = T extends never
  ? any
  : any & { select?: unknown; include?: unknown }

type CreateArgs<T = never> = T extends never
  ? any
  : any & { select?: unknown; include?: unknown }

type UpdateArgs<T = never> = T extends never
  ? any
  : any & { select?: unknown; include?: unknown }

type DeleteArgs<T = never> = T extends never
  ? any
  : any & { select?: unknown; include?: unknown }

type CountArgs = any

// ── Base Repository ─────────────────────────────────────────────────────────────

/**
 * Type-safe where input for a specific model.
 */
export type ModelWhereInput<TModel extends string> =
  TModel extends 'Player' ? Prisma.PlayerWhereInput : TModel extends'WorkoutSession'? Prisma.WorkoutSessionWhereInput : TModel extends'Drill'? Prisma.DrillWhereInput : TModel extends'TrainingPlan'? Prisma.TrainingPlanWhereInput : TModel extends'Video'? Prisma.VideoWhereInput : TModel extends'Friendship'? Prisma.FriendshipWhereInput : TModel extends'Team'? Prisma.TeamWhereInput : TModel extends'Post'? Prisma.PostWhereInput : TModel extends'Achievement' ? Prisma.AchievementWhereInput :
  any

/**
 * Type-safe order-by input for a specific model.
 */
export type ModelOrderByInput<TModel extends string> =
  TModel extends 'Player' ? Prisma.PlayerOrderByWithRelationInput : TModel extends'WorkoutSession'? Prisma.WorkoutSessionOrderByWithRelationInput : TModel extends'Drill'? Prisma.DrillOrderByWithRelationInput : TModel extends'TrainingPlan'? Prisma.TrainingPlanOrderByWithRelationInput : TModel extends'Video'? Prisma.VideoOrderByWithRelationInput : TModel extends'Friendship'? Prisma.FriendshipOrderByWithRelationInput : TModel extends'Team'? Prisma.TeamOrderByWithRelationInput : TModel extends'Post'? Prisma.PostOrderByWithRelationInput : TModel extends'Achievement' ? Prisma.AchievementOrderByWithRelationInput :
  any

export class BaseRepository<TModel extends string, TRecord> {
  protected delegate: PrismaModelDelegate<TRecord>
  protected modelName: TModel
  protected loggerContext: string

  constructor(
    delegate: PrismaModelDelegate<TRecord>,
    modelName: TModel,
  ) {
    this.delegate = delegate
    this.modelName = modelName
    this.loggerContext = `repo:${modelName.toLowerCase()}`
  }

  // ── Find All (Paginated) ───────────────────────────────────────────────────

  /**
   * Find multiple records with pagination, filtering, and ordering.
   * Supports both cursor and offset pagination.
   *
   * @param params.where - Prisma where filter
   * @param params.orderBy - Ordering (defaults to { createdAt: 'desc' })
   * @param params.cursor - Cursor for cursor-based pagination
   * @param params.take - Items per page (default 20, max 100)
   * @param params.skip - Items to skip (for offset pagination)
   * @param params.include - Relations to include
   * @param params.page - Page number (for offset pagination, 1-indexed)
   * @param params.limit - Alias for take (from URL params)
   */
  async findAll(params: {
    where?: any
    orderBy?: any
    take?: number
    skip?: number
    cursor?: string
    include?: Record<string, unknown>
    page?: number
    limit?: number
    select?: Record<string, unknown>
  } = {}): Promise<PaginatedResult<TRecord>> {
    const parsed = parsePagination({
      cursor: params.cursor ?? null,
      page: params.page ?? null,
      limit: params.limit ?? params.take ?? null,
    })

    const orderBy = params.orderBy ?? { createdAt: 'desc' as const }

    // Build query args
    const queryArgs: Record<string, unknown> = {
      where: params.where,
      orderBy,
      ...(params.include ? { include: params.include } : {}),
      ...(params.select ? { select: params.select } : {}),
    }

    if (parsed.cursor) {
      queryArgs.cursor = parsed.cursor
      queryArgs.skip = 1
      queryArgs.take = parsed.take
    } else if (parsed.isOffset) {
      queryArgs.skip = parsed.skip
      queryArgs.take = parsed.take
    } else {
      queryArgs.take = parsed.take + 1 // Fetch one extra for hasMore detection
    }

    let items: TRecord[] = await this.delegate.findMany(
      queryArgs as Parameters<typeof this.delegate.findMany>[0],
    )

    // Handle cursor pagination extra-item detection
    let hasMore = false
    if (!parsed.cursor && !parsed.isOffset) {
      hasMore = items.length > parsed.take
      items = trimExtraItem(items, hasMore, parsed.take) as TRecord[]
    }

    // Get total count for offset pagination or first cursor page
    let total: number | undefined
    if (parsed.isOffset || (!parsed.cursor && !params.cursor)) {
      total = await this.count(params.where)
    }

    const pagination = createPaginationMeta(
      items as Array<{ id: string }>,
      parsed,
      total,
    )

    return { data: items, pagination }
  }

  // ── Find By ID ─────────────────────────────────────────────────────────────

  /**
   * Find a single record by its primary key (id).
   * Throws NOT_FOUND if record doesn't exist.
   */
  async findById(
    id: string,
    options?: { include?: Record<string, unknown>; select?: Record<string, unknown> },
  ): Promise<TRecord> {
    const record = await this.findOptionalById(id, options)
    if (!record) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `${this.modelName} introuvable (id: ${id})`,
      )
    }
    return record
  }

  /**
   * Find a single record by ID, returning null if not found.
   */
  async findOptionalById(
    id: string,
    options?: { include?: Record<string, unknown>; select?: Record<string, unknown> },
  ): Promise<TRecord | null> {
    const args: Record<string, unknown> = { where: { id } }
    if (options?.include) args.include = options.include
    if (options?.select) args.select = options.select

    return this.delegate.findUnique(
      args as Parameters<typeof this.delegate.findUnique>[0],
    )
  }

  // ── Find First ─────────────────────────────────────────────────────────────

  /**
   * Find the first record matching a where clause.
   */
  async findFirst(
    where: any,
    options?: {
      include?: Record<string, unknown>
      select?: Record<string, unknown>
      orderBy?: any
    },
  ): Promise<TRecord | null> {
    const args: Record<string, unknown> = { where }
    if (options?.include) args.include = options.include
    if (options?.select) args.select = options.select
    if (options?.orderBy) args.orderBy = options.orderBy

    return this.delegate.findFirst(
      args as Parameters<typeof this.delegate.findFirst>[0],
    )
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  /**
   * Create a new record.
   */
  async create(
    data: Record<string, unknown>,
    options?: { include?: Record<string, unknown>; select?: Record<string, unknown> },
  ): Promise<TRecord> {
    try {
      const args: Record<string, unknown> = { data }
      if (options?.include) args.include = options.include
      if (options?.select) args.select = options.select

      return await this.delegate.create(
        args as Parameters<typeof this.delegate.create>[0],
      )
    } catch (error) {
      logger.error(`Failed to create ${this.modelName}`, this.loggerContext, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error // Let error-handler.ts map it
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  /**
   * Update an existing record by ID.
   * Throws NOT_FOUND if record doesn't exist.
   */
  async update(
    id: string,
    data: Record<string, unknown>,
    options?: { include?: Record<string, unknown>; select?: Record<string, unknown> },
  ): Promise<TRecord> {
    // Verify existence first
    await this.findById(id)

    try {
      const args: Record<string, unknown> = { where: { id }, data }
      if (options?.include) args.include = options.include
      if (options?.select) args.select = options.select

      return await this.delegate.update(
        args as Parameters<typeof this.delegate.update>[0],
      )
    } catch (error) {
      logger.error(`Failed to update ${this.modelName}`, this.loggerContext, {
        id,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Delete a record by ID.
   * Throws NOT_FOUND if record doesn't exist.
   */
  async delete(id: string): Promise<TRecord> {
    await this.findById(id)

    try {
      return await this.delegate.delete({
        where: { id },
      } as Parameters<typeof this.delegate.delete>[0])
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName}`, this.loggerContext, {
        id,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ── Count ──────────────────────────────────────────────────────────────────

  /**
   * Count records matching a where clause.
   */
  async count(where?: any): Promise<number> {
    return this.delegate.count({
      where,
    } as Parameters<typeof this.delegate.count>[0])
  }

  // ── Exists ─────────────────────────────────────────────────────────────────

  /**
   * Check if a record exists by ID.
   */
  async exists(id: string): Promise<boolean> {
    try {
      const record = await this.findOptionalById(id, {
        select: { id: true },
      })
      return record !== null
    } catch {
      return false
    }
  }
}

// ── Re-export db for use in repositories ────────────────────────────────────────

export { db }
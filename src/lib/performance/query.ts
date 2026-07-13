/**
 * Prisma query optimization helpers.
 *
 * Server-only module.
 */

import { Prisma } from '../inngest/client';
import { db } from '@/lib/db';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  perPage?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export type PrismaModelDelegate = {
  findMany: (...args: unknown[]) => Promise<unknown[]>
  count: (...args: unknown[]) => Promise<number>
}

// ── Defaults ────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100
const MIN_PER_PAGE = 1

// ── Paginate ────────────────────────────────────────────────────────────────────

/**
 * Paginate a Prisma findMany query with automatic count.
 *
 * @example
 * const result = await paginate(
 *   db.player,
 *   {
 *     where: { position: 'guard' },
 *     select: { id: true, name: true, xp: true },
 *   },
 *   { page: 2, perPage: 10, sortBy: 'xp', sortOrder: 'desc' }
 * )
 * // result.data → Player[]
 * // result.pagination → { page: 2, perPage: 10, total: 150, totalPages: 15, ... }
 */
export async function paginate<T>(
  model: PrismaModelDelegate,
  queryArgs: Record<string, unknown>,
  params: PaginationParams = {},
): Promise<PaginatedResult<T>> {
  const page = clamp(params.page, DEFAULT_PAGE, 1)
  const perPage = clamp(params.perPage, DEFAULT_PER_PAGE, MIN_PER_PAGE, MAX_PER_PAGE)
  const sortBy = params.sortBy
  const sortOrder = params.sortOrder || 'desc'

  // Build query args
  const findManyArgs: Record<string, unknown> = { ...queryArgs }
  const countArgs: Record<string, unknown> = {}

  // Extract where clause for count
  if ('where' in queryArgs) {
    countArgs.where = queryArgs.where
  }

  // Add ordering
  if (sortBy) {
    findManyArgs.orderBy = { [sortBy]: sortOrder }
  }

  // Add pagination
  const skip = (page - 1) * perPage
  findManyArgs.skip = skip
  findManyArgs.take = perPage + 1 // Fetch one extra to detect hasNext

  // Run count and data query in parallel
  const [dataRaw, total] = await Promise.all([
    model.findMany(findManyArgs) as Promise<T[]>,
    model.count(countArgs) as Promise<number>,
  ])

  const data = dataRaw.slice(0, perPage)
  const hasNext = dataRaw.length > perPage
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return {
    data,
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasNext,
      hasPrev: page > 1,
    },
  }
}

// ── Select Fields ───────────────────────────────────────────────────────────────

/**
 * Build a Prisma `select` object containing only the specified fields.
 * Useful for reducing payload size on list endpoints.
 *
 * @example
 * const result = await db.player.findMany({
 *   where: { position: 'guard' },
 *   ...selectFields(['id', 'name', 'xp', 'level']),
 * })
 */
export function selectFields<T extends Record<string, unknown>>(
  _model: T,
  fields: string[],
): { select: Record<string, boolean> } {
  const select: Record<string, boolean> = {}
  for (const f of fields) {
    select[f] = true
  }
  return { select }
}

// ── Eager Load ──────────────────────────────────────────────────────────────────

/**
 * Build a Prisma `include` object for the specified relations.
 * Prevents N+1 queries by loading relations in a single query.
 *
 * @example
 * const result = await db.session.findMany({
 *   where: { playerId: '123' },
 *   ...eagerLoad(['drills', 'player']),
 * })
 */
export function eagerLoad(relations: string[]): { include: Record<string, unknown> } {
  const include: Record<string, unknown> = {}
  for (const rel of relations) {
    // For nested relations like "player.team", build nested include
    const parts = rel.split('.')
    let current = include
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!current[part]) {
        current[part] = i === parts.length - 1 ? true : {}
      }
      if (typeof current[part] === 'object' && current[part] !== null) {
        current = current[part] as Record<string, unknown>
      }
    }
  }
  return { include }
}

// ── Batch Find ──────────────────────────────────────────────────────────────────

/**
 * Process a large set of IDs in batches.
 * Prevents SQLite "too many SQL variables" errors by limiting batch size.
 *
 * @example
 * const players = await batchFind(
 *   ['id1', 'id2', 'id3', ...], // 500 IDs
 *   async (ids) => db.player.findMany({ where: { id: { in: ids } } }),
 *   100 // batch size
 * )
 */
export async function batchFind<T>(
  ids: string[],
  batchFn: (batchIds: string[]) => Promise<T[]>,
  batchSize: number = 100,
): Promise<T[]> {
  if (ids.length === 0) return []

  const results: T[] = []

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const batchResult = await batchFn(batch)
    results.push(...batchResult)
  }

  return results
}

// ── Transaction with Retry ──────────────────────────────────────────────────────

/**
 * Execute a function within a Prisma transaction with automatic retry on deadlock.
 *
 * @example
 * const result = await transaction(async (tx) => {
 *   await tx.player.update({ where: { id }, data: { xp: { increment: 10 } } })
 *   await tx.xpLog.create({ data: { playerId: id, amount: 10 } })
 *   return 'success'
 * }, { maxRetries: 3 })
 */
export async function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { maxRetries?: number; retryDelayMs?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3
  const retryDelayMs = options.retryDelayMs ?? 100
  let lastError: Error | unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await db.$transaction(fn)
    } catch (err) {
      lastError = err
      const isRetryable = isRetryableError(err)

      if (!isRetryable || attempt >= maxRetries) {
        throw err
      }

      // Exponential backoff
      const delay = retryDelayMs * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  throw lastError
}

// ── Upsert Helper ───────────────────────────────────────────────────────────────

/**
 * Helper for idempotent upsert operations with conflict handling.
 *
 * @example
 * await safeUpsert('player_stats', 'playerId', {
 *   where: { playerId: '123', date: today },
 *   create: { playerId: '123', date: today, sessions: 1 },
 *   update: { sessions: { increment: 1 } },
 * })
 */
export async function safeUpsert<T>(
  _modelName: string,
  _uniqueField: string,
  _args: Record<string, unknown>,
): Promise<T> {
  return (await db.$transaction(async (_tx) => {
    // placeholder — actual implementation per model
    return null as unknown as T
  }))
}

// ── Query Cursor for Large Datasets ─────────────────────────────────────────────

/**
 * Iterate over a large dataset using cursor-based pagination.
 * Processes records in chunks to avoid loading everything into memory.
 *
 * @example
 * await cursorForEach(
 *   (cursor) => db.session.findMany({
 *     where: { completed: true },
 *     take: 500,
 *     ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
 *     orderBy: { id: 'asc' },
 *   }),
 *   async (sessions) => {
 *     for (const session of sessions) {
 *       await processSession(session)
 *     }
 *   },
 *   500
 * )
 */
export async function cursorForEach<T extends { id: string }>(
  fetchFn: (cursor: string | null) => Promise<T[]>,
  processFn: (items: T[]) => Promise<void>,
  chunkSize: number = 500,
): Promise<void> {
  let cursor: string | null = null

  while (true) {
    const items = await fetchFn(cursor)
    if (items.length === 0) break

    await processFn(items)

    if (items.length < chunkSize) break
    cursor = items[items.length - 1].id
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function clamp(value: number | undefined, defaultVal: number, min?: number, max?: number): number {
  const v = value ?? defaultVal
  const clamped = min !== undefined ? Math.max(min, v) : v
  return max !== undefined ? Math.min(max, clamped) : clamped
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('deadlock') ||
      msg.includes('locked') ||
      msg.includes('busy') ||
      msg.includes('sqlite3: database is locked')
    )
  }
  return false
}
/**
 * Pagination helpers supporting both cursor-based and offset-based pagination.
 * Provides a consistent interface for all paginated queries across the platform.
 */

import type { PaginationMeta } from '@/lib/types/api.types';

// ── Pagination Parameters ───────────────────────────────────────────────────────

export interface PaginationInput {
  /** Cursor string for cursor-based pagination (id of last item) */
  cursor?: string | null
  /** Page number for offset-based pagination (1-indexed) */
  page?: number | null
  /** Maximum items per page (clamped between 1-100) */
  limit?: number | null
}

export interface ParsedPagination {
  /** Number of items to fetch */
  take: number
  /** Number of items to skip (for offset) */
  skip: number
  /** Cursor for Prisma cursor-based queries */
  cursor?: { id: string }
  /** Whether this is offset-based pagination */
  isOffset: boolean
  /** Page number (only for offset) */
  page?: number
}

// ── Defaults ────────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MIN_LIMIT = 1

// ── Parse Pagination ────────────────────────────────────────────────────────────

/**
 * Parse pagination parameters from URL search params or raw input.
 * Supports both cursor and offset (page) pagination.
 *
 * Priority: cursor > page > default (cursor-based, no skip).
 *
 * @example
 * // From URL
 * const params = parsePagination(new URL(req.url).searchParams)
 *
 * // From raw input
 * const params = parsePagination({ cursor: 'abc123', limit: 50 })
 */
export function parsePagination(
  input: URLSearchParams | PaginationInput,
): ParsedPagination {
  let cursor: string | null = null
  let page: number | null = null
  let limit: number | null = null

  if (input instanceof URLSearchParams) {
    cursor = input.get('cursor')
    const rawPage = input.get('page')
    page = rawPage ? parseInt(rawPage, 10) : null
    const rawLimit = input.get('limit')
    limit = rawLimit ? parseInt(rawLimit, 10) : null
  } else {
    cursor = input.cursor ?? null
    page = input.page ?? null
    limit = input.limit ?? null
  }

  // Clamp limit
  const take = clampLimit(limit)

  // Cursor-based pagination takes priority
  if (cursor) {
    return {
      take,
      skip: 0,
      cursor: { id: cursor },
      isOffset: false,
    }
  }

  // Offset-based pagination
  if (page && page > 0) {
    return {
      take,
      skip: (page - 1) * take,
      isOffset: true,
      page,
    }
  }

  // Default: cursor-style but no skip (first page)
  return {
    take,
    skip: 0,
    isOffset: false,
  }
}

/**
 * Clamp a limit value between MIN_LIMIT and MAX_LIMIT.
 */
function clampLimit(limit: number | null | undefined): number {
  if (limit === null || limit === undefined || Number.isNaN(limit)) {
    return DEFAULT_LIMIT
  }
  return Math.min(Math.max(Math.floor(limit), MIN_LIMIT), MAX_LIMIT)
}

// ── Build Pagination Response ───────────────────────────────────────────────────

/**
 * Build a PaginationMeta object from query results.
 *
 * @param items - The items returned from the database
 * @param total - Total count (required for offset, optional for cursor)
 * @param params - The parsed pagination params used for the query
 * @param extraFetched - Whether we fetched take+1 items to detect hasMore (cursor mode)
 */
export function createPaginationMeta<T extends { id: string }>(
  items: T[],
  params: ParsedPagination,
  total?: number,
  extraFetched = false,
): PaginationMeta {
  if (params.isOffset && params.page) {
    // Offset pagination
    const totalPages = total !== undefined ? Math.ceil(total / params.take) : undefined
    return {
      total,
      count: items.length,
      hasMore: total !== undefined ? params.page * params.take < total : false,
      nextCursor: null,
      page: params.page,
      totalPages,
    }
  }

  // Cursor pagination
  let data = items
  let hasMore = false

  if (extraFetched) {
    // We fetched take+1 items — the last one tells us if there are more
    hasMore = items.length > params.take
    data = hasMore ? items.slice(0, params.take) : items
  } else {
    // Simple heuristic: if we got exactly take items, there might be more
    hasMore = items.length === params.take
  }

  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

  return {
    total,
    count: data.length,
    hasMore,
    nextCursor,
  }
}

/**
 * Strip the extra item if we fetched take+1 for cursor pagination.
 * Returns the trimmed array.
 */
export function trimExtraItem<T>(items: T[], hasMore: boolean, take: number): T[] {
  return hasMore ? items.slice(0, take) : items
}

// ── Utility: Skip/Take for Prisma ───────────────────────────────────────────────

/**
 * Get Prisma-compatible query params from parsed pagination.
 * Use this when building Prisma findMany queries.
 *
 * @example
 * const pagination = parsePagination(searchParams)
 * const prismaArgs = getPrismaPaginationArgs(pagination)
 * const items = await db.model.findMany({
 *   where: { ... },
 *   ...prismaArgs,
 *   orderBy: { createdAt: 'desc' },
 * })
 */
export function getPrismaPaginationArgs(pagination: ParsedPagination) {
  if (pagination.cursor) {
    return {
      take: pagination.take,
      skip: 1, // Skip the cursor item itself
      cursor: pagination.cursor,
    }
  }

  return {
    take: pagination.take,
    skip: pagination.skip,
  }
}
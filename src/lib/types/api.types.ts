/**
 * Standard API response types for the basketball training platform.
 * All API routes should use these types for consistent response shapes.
 */

// ── Error Codes ─────────────────────────────────────────────────────────────────

export const ErrorCode = {
  // Auth errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_2FA_REQUIRED: 'AUTH_2FA_REQUIRED',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  ADMIN_ONLY: 'ADMIN_ONLY',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',

  // Not found (404)
  NOT_FOUND: 'NOT_FOUND',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  DRILL_NOT_FOUND: 'DRILL_NOT_FOUND',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  TEAM_NOT_FOUND: 'TEAM_NOT_FOUND',
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  INVALID_BODY: 'INVALID_BODY',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Conflict (409)
  CONFLICT: 'CONFLICT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  FRIEND_REQUEST_EXISTS: 'FRIEND_REQUEST_EXISTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // File / Upload errors (413)
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
} as const



// ── HTTP Status Code Mapping ────────────────────────────────────────────────────

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // Auth 401
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INVALID]: 401,
  [ErrorCode.AUTH_EXPIRED]: 401,
  [ErrorCode.AUTH_2FA_REQUIRED]: 401,
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 401,

  // Forbidden 403
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.SUBSCRIPTION_REQUIRED]: 403,
  [ErrorCode.ADMIN_ONLY]: 403,
  [ErrorCode.ACCOUNT_DELETED]: 403,

  // Not Found 404
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.PLAYER_NOT_FOUND]: 404,
  [ErrorCode.SESSION_NOT_FOUND]: 404,
  [ErrorCode.DRILL_NOT_FOUND]: 404,
  [ErrorCode.VIDEO_NOT_FOUND]: 404,
  [ErrorCode.PLAN_NOT_FOUND]: 404,
  [ErrorCode.TEAM_NOT_FOUND]: 404,
  [ErrorCode.CHALLENGE_NOT_FOUND]: 404,

  // Validation 400
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_PARAMS]: 400,
  [ErrorCode.INVALID_BODY]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,

  // Rate limited 429
  [ErrorCode.RATE_LIMITED]: 429,

  // Conflict 409
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
  [ErrorCode.FRIEND_REQUEST_EXISTS]: 409,

  // Server 500
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 500,

  // Payload 413
  [ErrorCode.PAYLOAD_TOO_LARGE]: 413,
  [ErrorCode.FILE_TOO_LARGE]: 413,
}

export function getErrorStatusCode(code: ErrorCode): number {
  return ERROR_STATUS_MAP[code] ?? 500
}

// ── Error Detail ────────────────────────────────────────────────────────────────

export interface ErrorDetail {
  field?: string
  message: string
  value?: unknown
}

// ── Standard API Responses ──────────────────────────────────────────────────────

/** Success response wrapper */
export interface ApiResponse<T = unknown> {
  success: true
  data: T
}

/** Error response wrapper */
export interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: ErrorDetail[]
  }
}

/** Union type for any API response */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse

// ── Pagination ──────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  /** Total number of records matching the query (may be undefined on cursor pages) */
  total?: number
  /** Number of records returned in this page */
  count: number
  /** Whether more records exist beyond this page */
  hasMore: boolean
  /** Cursor for the next page (null if no more pages) */
  nextCursor: string | null
  /** Current page number (only for offset pagination) */
  page?: number
  /** Total number of pages (only for offset pagination) */
  totalPages?: number
}

/** Paginated success response */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta
}

// ── Leaderboard ─────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'elite'

export type PlayerPosition = 'guard' | 'forward' | 'center'

export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite'

export type SkillKey = 'shooting' | 'handling' | 'finishing' | 'defense' | 'iq'

export type Difficulty = 'facile' | 'moyen' | 'difficile' | 'beginner' | 'intermediate' | 'advanced'

export type Timeframe = 'week' | 'month' | 'all'

// ── Helper Functions ────────────────────────────────────────────────────────────

/** Create a success response object */
export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

/** Create a paginated response object */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
  }
}
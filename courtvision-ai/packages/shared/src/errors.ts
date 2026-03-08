/**
 * @courtvision/shared — Unified error hierarchy for all packages.
 * Every HTTP error response MUST use these classes for consistency.
 * Response shape: { error: string, code: string, statusCode: number }
 * @module errors
 */

/**
 * Base application error. All domain errors extend this class.
 * Provides a consistent shape for API error responses.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /** Serialize to the standard API error response shape */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    }
  }
}

/** 401 — Authentication required or token invalid */
export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'AUTH_ERROR')
  }
}

/** 403 — Authenticated but not allowed */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

/** 404 — Resource does not exist */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

/** 400 — Client input validation failed */
export class ValidationError extends AppError {
  public readonly details: Record<string, string>[]

  constructor(message: string, details: Record<string, string>[] = []) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    }
  }
}

/** 409 — Resource conflict (duplicate, already exists) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

/** 429 — Rate limit exceeded */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please slow down.') {
    super(message, 429, 'RATE_LIMIT')
  }
}

/** 503 — Feature gated or unavailable */
export class FeatureDisabledError extends AppError {
  constructor(feature: string) {
    super(`Feature '${feature}' is not available`, 503, 'FEATURE_DISABLED')
  }
}

/** 502 — Upstream service unavailable (CV Engine, LLM, etc.) */
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`Service '${service}' is temporarily unavailable`, 502, 'SERVICE_UNAVAILABLE')
  }
}

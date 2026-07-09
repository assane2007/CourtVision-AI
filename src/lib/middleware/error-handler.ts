/**
 * Standardized error handling for the basketball training platform.
 * Provides AppError class, error-to-response transformation, and tryCatch wrapper.
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { ErrorCode, getErrorStatusCode, type ErrorDetail, type ApiErrorResponse } from '@/lib/types/api.types'

// Re-export ErrorCode for convenience — many guards and services import it from here
export { ErrorCode }
import { trackError } from '@/lib/monitoring'

// ── AppError ────────────────────────────────────────────────────────────────────

/**
 * Custom application error with structured error codes.
 * Use this throughout the service layer for consistent error handling.
 *
 * @example
 * throw new AppError(ErrorCode.NOT_FOUND, 'Player not found')
 * throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid email', [
 *   { field: 'email', message: 'Must be a valid email', value: 'not-email' }
 * ])
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details: ErrorDetail[] | undefined
  public readonly isOperational: boolean

  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = getErrorStatusCode(code)
    this.details = details
    this.isOperational = true

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// ── Prisma Error Mapping ────────────────────────────────────────────────────────

/**
 * Maps known Prisma errors to AppError instances.
 * Covers unique constraint violations, foreign key errors, record not found, etc.
 */
function mapPrismaError(error: unknown): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[]) ?? []
        const field = target[0] ?? 'field'
        const fieldLabel = fieldToLabel(field)

        // Special case for email uniqueness
        if (field === 'email') {
          return new AppError(
            ErrorCode.EMAIL_ALREADY_EXISTS,
            'Un compte avec cet email existe déjà',
            [{ field, message: `Ce ${fieldLabel} est déjà utilisé`, value: error.meta?.target }],
          )
        }

        return new AppError(
          ErrorCode.CONFLICT,
          `Ce ${fieldLabel} est déjà utilisé`,
          [{ field, message: `Un enregistrement avec ce ${fieldLabel} existe déjà` }],
        )
      }

      case 'P2025':
        // Record not found
        return new AppError(ErrorCode.NOT_FOUND, "L'enregistrement demandé n'existe pas")

      case 'P2003':
        // Foreign key constraint violation
        const fieldName = (error.meta?.field_name as string) ?? 'resource'
        return new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Référence invalide: ${fieldToLabel(fieldName)}`,
          [{ field: fieldName, message: 'La ressource référencée n\'existe pas' }],
        )

      case 'P2014':
        // Relation violation
        return new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Violation de relation entre les enregistrements',
        )

      case 'P2028':
        // Transaction error
        return new AppError(
          ErrorCode.DATABASE_ERROR,
          'Erreur de transaction. Veuillez réessayer.',
        )

      default:
        break
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Données invalides envoyées au serveur',
    )
  }

  // If it's already an AppError, pass through
  if (error instanceof AppError) {
    return error
  }

  // Unknown error — wrap as internal
  const _message = error instanceof Error ? error.message : 'Erreur inconnue'
  return new AppError(ErrorCode.INTERNAL_ERROR, 'Erreur serveur interne')
}

/**
 * Convert technical Prisma field names to user-friendly French labels.
 */
function fieldToLabel(field: string): string {
  const labels: Record<string, string> = {
    email: 'email',
    Player_email_key: 'email',
    id: 'identifiant',
    name: 'nom',
    password: 'mot de passe',
  }
  return labels[field] ?? field
}

// ── Response Builders ───────────────────────────────────────────────────────────

/**
 * Convert any error (AppError, Prisma error, or unknown) into a standardized
 * NextResponse error JSON payload.
 */
export function toErrorResponse(error: unknown, context?: string): NextResponse {
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else {
    appError = mapPrismaError(error)
  }

  // Log non-operational errors and 500s
  if (!appError.isOperational || appError.statusCode >= 500) {
    const logCtx = context ?? 'unhandled'
    logger.error(appError.message, logCtx, {
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details,
      stack: appError.stack,
    })

    // Also track in monitoring for 500s
    if (appError.statusCode >= 500) {
      trackError(context ?? 'app-error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details && appError.details.length > 0 ? { details: appError.details } : {}),
    },
  }

  return NextResponse.json(body, { status: appError.statusCode })
}

// ── tryCatch Wrapper ────────────────────────────────────────────────────────────

type RouteHandler = (req: Request, ...args: unknown[]) => Promise<NextResponse>

/**
 * Wraps a route handler with automatic error handling.
 * Catches any thrown error and converts it to a standardized error response.
 *
 * @example
 * export const GET = tryCatch(async (req: Request) => {
 *   const data = await someService.getData()
 *   return NextResponse.json({ success: true, data })
 * })
 */
export function tryCatch(
  handler: RouteHandler,
  context?: string,
): (req: Request, ...args: unknown[]) => Promise<NextResponse> {
  return async (req, ...args) => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      return toErrorResponse(error, context)
    }
  }
}

/**
 * Typed version of tryCatch for routes with dynamic params context.
 */
export function tryCatchCtx<TCtx>(
  handler: (req: Request, context: TCtx) => Promise<NextResponse>,
  context?: string,
): (req: Request, context: TCtx) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      return toErrorResponse(error, context)
    }
  }
}
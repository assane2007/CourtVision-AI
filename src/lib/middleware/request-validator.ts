/**
 * Zod-based request validation middleware.
 * Validates request body and query parameters, returning 400 on failure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { ErrorCode, type ErrorDetail } from '@/lib/types/api.types';

// ── Validation Result ───────────────────────────────────────────────────────────

interface ValidationResult<T> {
  success: true
  data: T
}

interface ValidationError {
  success: false
  response: NextResponse
}

type ValidateResult<T> = ValidationResult<T> | ValidationError

// ── Error Formatting ────────────────────────────────────────────────────────────

/**
 * Convert a ZodError into a list of ErrorDetail objects with field paths.
 */
export function formatZodErrors(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => {
    // Convert dot-notation path to a single field string
    const field = issue.path.join('.') || undefined

    // Use the custom message from Zod, or a generic French fallback
    const message = issue.message || 'Valeur invalide'

    return {
      field,
      message,
      value: issue.path.length > 0 ? issue.path[0] : undefined,
    }
  })
}

/**
 * Get a single short error message from a ZodError (for backward compat).
 */
export function getFirstZodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides'
}

// ── Body Validation ─────────────────────────────────────────────────────────────

/**
 * Validate the request body against a Zod schema.
 *
 * @example
 * const result = await validateBody(createSessionSchema, req)
 * if (!result.success) return result.response
 * // result.data is typed
 */
export async function validateBody<T>(
  schema: ZodSchema,
  req: NextRequest | Request,
): Promise<ValidateResult<T>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.INVALID_BODY,
            message: 'Corps de la requête invalide (JSON attendu)',
          },
        },
        { status: 400 },
      ),
    }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: getFirstZodMessage(parsed.error),
            details: formatZodErrors(parsed.error),
          },
        },
        { status: 400 },
      ),
    }
  }

  return { success: true, data: parsed.data }
}

// ── Query Validation ────────────────────────────────────────────────────────────

/**
 * Validate URL query parameters against a Zod schema.
 * Uses Zod's preprocess to handle string-to-type coercion.
 *
 * @example
 * const querySchema = z.object({
 *   period: z.enum(['week', 'month', 'all']).default('all'),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 * })
 * const result = validateQuery(querySchema, req)
 * if (!result.success) return result.response
 */
export function validateQuery<T>(
  schema: ZodSchema,
  req: NextRequest | Request,
): ValidateResult<T> {
  const url = new URL(req.url)
  const searchParams = Object.fromEntries(url.searchParams.entries())

  const parsed = schema.safeParse(searchParams)
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.INVALID_PARAMS,
            message: getFirstZodMessage(parsed.error),
            details: formatZodErrors(parsed.error),
          },
        },
        { status: 400 },
      ),
    }
  }

  return { success: true, data: parsed.data }
}
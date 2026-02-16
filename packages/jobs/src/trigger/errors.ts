/**
 * Trigger.dev Error Handling Utilities
 *
 * Provides error classification and handling for Trigger.dev tasks.
 * Distinguishes between retryable and permanent errors to avoid
 * wasting retries on unrecoverable failures.
 *
 * @ai-pattern error-handling
 * @ai-critical Financial operations MUST use these utilities
 */

import { AbortTaskRunError } from '@trigger.dev/sdk/v3'

// ============================================================
// ERROR TYPES
// ============================================================

/**
 * Error codes that indicate permanent failures (should not retry)
 */
export const PERMANENT_ERROR_CODES = new Set([
  // Validation errors
  'INVALID_INPUT',
  'MISSING_TENANT_ID',
  'INVALID_TENANT_ID',
  'MISSING_REQUIRED_FIELD',
  'INVALID_PAYLOAD',

  // Authorization/Configuration errors
  'NOT_CONFIGURED',
  'INVALID_CREDENTIALS',
  'ACCOUNT_NOT_FOUND',
  'ACCOUNT_DISABLED',
  'PERMISSION_DENIED',
  'UNAUTHORIZED',

  // Business logic errors
  'INSUFFICIENT_BALANCE',
  'DUPLICATE_TRANSACTION',
  'ALREADY_PROCESSED',
  'INVALID_STATE',
  'PAYOUT_ALREADY_COMPLETED',
  'COMMISSION_ALREADY_MATURED',

  // Data integrity errors
  'RECORD_NOT_FOUND',
  'FOREIGN_KEY_VIOLATION',
  'UNIQUE_CONSTRAINT_VIOLATION',

  // Payment provider permanent errors
  'STRIPE_CARD_DECLINED',
  'STRIPE_INVALID_ACCOUNT',
  'STRIPE_ACCOUNT_CLOSED',
  'WISE_INVALID_RECIPIENT',
  'WISE_BLOCKED_RECIPIENT',
  'WISE_UNSUPPORTED_CURRENCY',
])

/**
 * Error codes that indicate transient failures (should retry)
 */
export const RETRYABLE_ERROR_CODES = new Set([
  // Network/connectivity
  'NETWORK_ERROR',
  'TIMEOUT',
  'CONNECTION_REFUSED',
  'DNS_RESOLUTION_FAILED',

  // Rate limiting
  'RATE_LIMITED',
  'TOO_MANY_REQUESTS',
  'THROTTLED',

  // Service availability
  'SERVICE_UNAVAILABLE',
  'BAD_GATEWAY',
  'GATEWAY_TIMEOUT',
  'INTERNAL_SERVER_ERROR',

  // Database transient errors
  'DEADLOCK',
  'LOCK_TIMEOUT',
  'CONNECTION_POOL_EXHAUSTED',
  'DATABASE_UNAVAILABLE',

  // Payment provider transient errors
  'STRIPE_API_ERROR',
  'STRIPE_RATE_LIMIT',
  'WISE_API_ERROR',
  'WISE_RATE_LIMIT',
  'WISE_PROCESSING_ERROR',
])

// ============================================================
// ERROR CLASSIFICATION
// ============================================================

export interface ClassifiedJobError {
  message: string
  code?: string
  retryable: boolean
  originalError?: Error
}

/**
 * Classify an error as retryable or permanent
 *
 * @param error - The error to classify
 * @returns Classified error with retryable flag
 */
export function classifyJobError(error: unknown): ClassifiedJobError {
  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      retryable: !isPermanentErrorMessage(error),
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    const code = extractErrorCode(error)
    const retryable = isRetryableError(error, code)

    return {
      message: error.message,
      code,
      retryable,
      originalError: error,
    }
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const errObj = error as { message: string; code?: string }
    const code = errObj.code || extractErrorCodeFromMessage(errObj.message)
    const retryable = code ? !PERMANENT_ERROR_CODES.has(code) : true

    return {
      message: errObj.message,
      code,
      retryable,
    }
  }

  // Unknown error type - default to retryable
  return {
    message: String(error),
    retryable: true,
  }
}

/**
 * Extract error code from an Error object
 */
function extractErrorCode(error: Error): string | undefined {
  // Check for explicit code property
  if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
    return (error as { code: string }).code
  }

  // Check for Stripe error
  if ('type' in error && typeof (error as { type: unknown }).type === 'string') {
    const stripeError = error as { type: string }
    if (stripeError.type === 'StripeCardError') return 'STRIPE_CARD_DECLINED'
    if (stripeError.type === 'StripeRateLimitError') return 'STRIPE_RATE_LIMIT'
    if (stripeError.type === 'StripeAPIError') return 'STRIPE_API_ERROR'
    if (stripeError.type === 'StripeInvalidRequestError') return 'INVALID_INPUT'
  }

  // Check for HTTP status code
  if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
    const status = (error as { status: number }).status
    if (status === 401) return 'UNAUTHORIZED'
    if (status === 403) return 'PERMISSION_DENIED'
    if (status === 404) return 'RECORD_NOT_FOUND'
    if (status === 429) return 'RATE_LIMITED'
    if (status >= 500 && status < 600) return 'SERVICE_UNAVAILABLE'
  }

  // Try to extract from message
  return extractErrorCodeFromMessage(error.message)
}

/**
 * Extract error code from error message
 */
function extractErrorCodeFromMessage(message: string): string | undefined {
  const upperMessage = message.toUpperCase()

  // Network errors
  if (upperMessage.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED'
  if (upperMessage.includes('ETIMEDOUT')) return 'TIMEOUT'
  if (upperMessage.includes('ENOTFOUND')) return 'DNS_RESOLUTION_FAILED'
  if (upperMessage.includes('NETWORK')) return 'NETWORK_ERROR'

  // Rate limiting
  if (upperMessage.includes('RATE LIMIT') || upperMessage.includes('429')) return 'RATE_LIMITED'
  if (upperMessage.includes('TOO MANY REQUESTS')) return 'TOO_MANY_REQUESTS'

  // Service availability
  if (upperMessage.includes('502') || upperMessage.includes('BAD GATEWAY')) return 'BAD_GATEWAY'
  if (upperMessage.includes('503') || upperMessage.includes('UNAVAILABLE')) return 'SERVICE_UNAVAILABLE'
  if (upperMessage.includes('504') || upperMessage.includes('GATEWAY TIMEOUT')) return 'GATEWAY_TIMEOUT'

  // Database errors
  if (upperMessage.includes('DEADLOCK')) return 'DEADLOCK'
  if (upperMessage.includes('LOCK')) return 'LOCK_TIMEOUT'

  // Validation errors
  if (upperMessage.includes('TENANTID IS REQUIRED')) return 'MISSING_TENANT_ID'
  if (upperMessage.includes('NOT FOUND')) return 'RECORD_NOT_FOUND'
  if (upperMessage.includes('ALREADY')) return 'ALREADY_PROCESSED'
  if (upperMessage.includes('DUPLICATE')) return 'DUPLICATE_TRANSACTION'
  if (upperMessage.includes('INSUFFICIENT')) return 'INSUFFICIENT_BALANCE'

  return undefined
}

/**
 * Check if an error message indicates a permanent failure
 */
function isPermanentErrorMessage(message: string): boolean {
  const upperMessage = message.toUpperCase()

  const permanentPatterns = [
    'ALREADY PROCESSED',
    'ALREADY COMPLETED',
    'NOT CONFIGURED',
    'INVALID CREDENTIALS',
    'NOT FOUND',
    'PERMISSION DENIED',
    'UNAUTHORIZED',
    'INSUFFICIENT BALANCE',
    'DUPLICATE',
    'INVALID INPUT',
    'VALIDATION FAILED',
    'TENANTID IS REQUIRED',
    'ACCOUNT DISABLED',
    'ACCOUNT CLOSED',
  ]

  return permanentPatterns.some((pattern) => upperMessage.includes(pattern))
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error, code?: string): boolean {
  // Check explicit code first
  if (code) {
    if (PERMANENT_ERROR_CODES.has(code)) return false
    if (RETRYABLE_ERROR_CODES.has(code)) return true
  }

  // Check message for patterns
  if (isPermanentErrorMessage(error.message)) return false

  // Check for known retryable error types
  if (error.name === 'TimeoutError') return true
  if (error.name === 'NetworkError') return true

  // Default to retryable for unknown errors
  return true
}

// ============================================================
// ERROR THROWING UTILITIES
// ============================================================

/**
 * Throw an appropriate error based on classification
 *
 * For permanent errors, throws AbortTaskRunError to prevent retries.
 * For retryable errors, throws a regular Error to allow retries.
 *
 * @param error - The error to throw
 * @param context - Optional context for logging
 */
export function throwClassifiedError(error: unknown, context?: string): never {
  const classified = classifyJobError(error)

  const message = context
    ? `${context}: ${classified.message}`
    : classified.message

  if (!classified.retryable) {
    // Permanent error - abort without retrying
    throw new AbortTaskRunError(message)
  }

  // Retryable error - throw to trigger retry
  const retryError = new Error(message)
  if (classified.originalError) {
    retryError.cause = classified.originalError
  }
  throw retryError
}

/**
 * Create a permanent error that will not be retried
 *
 * Use this for validation failures, invalid states, or
 * any error that retrying won't fix.
 *
 * @param message - Error message
 * @param code - Optional error code
 */
export function createPermanentError(message: string, code?: string): AbortTaskRunError {
  const fullMessage = code ? `[${code}] ${message}` : message
  return new AbortTaskRunError(fullMessage)
}

/**
 * Create a retryable error
 *
 * Use this for transient failures that might succeed on retry.
 *
 * @param message - Error message
 * @param code - Optional error code
 */
export function createRetryableError(message: string, code?: string): Error {
  const fullMessage = code ? `[${code}] ${message}` : message
  return new Error(fullMessage)
}

// ============================================================
// IDEMPOTENCY UTILITIES
// ============================================================

/**
 * Generate an idempotency key for a financial operation
 *
 * @param tenantId - Tenant identifier
 * @param operationType - Type of operation (payout, commission, etc.)
 * @param entityId - Primary entity identifier
 * @param additionalKey - Optional additional uniqueness factor
 */
export function generateIdempotencyKey(
  tenantId: string,
  operationType: string,
  entityId: string,
  additionalKey?: string
): string {
  const parts = [tenantId, operationType, entityId]
  if (additionalKey) {
    parts.push(additionalKey)
  }
  return parts.join(':')
}

/**
 * Parse an idempotency key back to its components
 */
export function parseIdempotencyKey(key: string): {
  tenantId: string
  operationType: string
  entityId: string
  additionalKey?: string
} {
  const parts = key.split(':')
  return {
    tenantId: parts[0] || '',
    operationType: parts[1] || '',
    entityId: parts[2] || '',
    additionalKey: parts[3],
  }
}

// ============================================================
// CURSOR TRACKING FOR PAGINATED JOBS
// ============================================================

export interface CursorState {
  jobId: string
  cursor: string | null
  offset: number
  processedCount: number
  totalCount?: number
  lastUpdated: Date
}

/**
 * Create a cursor state for tracking paginated job progress
 *
 * Store this in the database to enable resumption on failure.
 */
export function createCursorState(
  jobId: string,
  initialCursor?: string | null
): CursorState {
  return {
    jobId,
    cursor: initialCursor ?? null,
    offset: 0,
    processedCount: 0,
    lastUpdated: new Date(),
  }
}

/**
 * Update cursor state after processing a batch
 */
export function updateCursorState(
  state: CursorState,
  newCursor: string | null,
  batchSize: number
): CursorState {
  return {
    ...state,
    cursor: newCursor,
    offset: state.offset + batchSize,
    processedCount: state.processedCount + batchSize,
    lastUpdated: new Date(),
  }
}

// ============================================================
// WRAPPED TASK EXECUTION
// ============================================================

/**
 * Wrap task execution with error classification
 *
 * Automatically classifies errors and throws the appropriate type.
 *
 * @example
 * ```typescript
 * export const myTask = task({
 *   id: 'my-task',
 *   run: async (payload) => {
 *     return await withErrorHandling('my-task', async () => {
 *       // Task logic here
 *       return result
 *     })
 *   },
 * })
 * ```
 */
export async function withErrorHandling<T>(
  taskName: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    throwClassifiedError(error, taskName)
  }
}

/**
 * Wrap a handler result and throw appropriate errors
 *
 * Use this for handlers that return JobResult objects.
 *
 * @example
 * ```typescript
 * const result = await myHandler.handler(jobPayload)
 * return handleJobResult(result, 'my-handler')
 * ```
 */
export function handleJobResult<T>(
  result: { success: boolean; data?: T; error?: { message: string; retryable?: boolean } },
  context?: string
): T {
  if (result.success && result.data !== undefined) {
    return result.data
  }

  if (!result.success && result.error) {
    const errorMessage = context
      ? `${context}: ${result.error.message}`
      : result.error.message

    // Check if error explicitly marked as non-retryable
    if (result.error.retryable === false) {
      throw new AbortTaskRunError(errorMessage)
    }

    // Classify and throw
    throwClassifiedError(result.error.message, context)
  }

  // Fallback for unexpected result shape
  throw new Error(context ? `${context}: Unknown error` : 'Unknown error')
}

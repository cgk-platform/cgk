/**
 * Job Middleware
 *
 * Middleware for tenant context and common job processing patterns.
 *
 * @ai-pattern job-middleware
 * @ai-critical Always wrap handlers with withTenantContext for database operations
 */

import type { JobContext, JobHandler } from './provider'
import type { TenantEvent } from './events'

/**
 * Error classification for retry decisions
 */
export type ErrorClassification =
  | 'transient' // Network issues, rate limits - should retry
  | 'permanent' // Invalid data, auth errors - should not retry
  | 'unknown' // Unknown error - may retry

/**
 * Error with classification
 */
export interface ClassifiedError extends Error {
  classification?: ErrorClassification
  retryable?: boolean
  retryAfter?: number // Seconds to wait before retry
}

/**
 * Middleware function type
 */
export type Middleware<T, R = void> = (
  ctx: JobContext<T>,
  next: () => Promise<R>
) => Promise<R>

/**
 * Compose multiple middleware into a single function
 */
export function composeMiddleware<T, R = void>(
  ...middlewares: Middleware<T, R>[]
): (handler: JobHandler<T, R>) => JobHandler<T, R> {
  return (handler: JobHandler<T, R>): JobHandler<T, R> => {
    return async (ctx: JobContext<T>): Promise<R> => {
      let index = 0

      const next = async (): Promise<R> => {
        if (index < middlewares.length) {
          const middleware = middlewares[index]!
          index++
          return middleware(ctx, next)
        }
        return handler(ctx)
      }

      return next()
    }
  }
}

/**
 * Tenant context middleware
 * Validates tenantId and sets up database context
 *
 * @example
 * const handler = withTenantContext(async (ctx) => {
 *   // ctx.payload.tenantId is guaranteed to exist
 *   // Database queries will be scoped to the tenant
 *   const orders = await sql`SELECT * FROM orders`
 *   return orders
 * })
 */
export function withTenantContext<T extends TenantEvent<unknown>, R = void>(
  handler: JobHandler<T, R>
): JobHandler<T, R> {
  return async (ctx: JobContext<T>): Promise<R> => {
    const { tenantId } = ctx.payload

    if (!tenantId) {
      throw new Error(
        `[Job:${ctx.name}] tenantId is required in payload. ` +
          `Tenant isolation is mandatory - see TENANT-ISOLATION.md`
      )
    }

    // Dynamically import @cgk/db to avoid circular dependencies
    // and to handle cases where the package may not be available
    try {
      const { withTenant } = await import('@cgk/db')

      return withTenant(tenantId, async () => {
        return handler(ctx)
      })
    } catch (importError) {
      // If @cgk/db is not available, proceed without tenant context
      // This allows the jobs package to be used standalone for testing
      console.warn(
        `[Job:${ctx.name}] @cgk/db not available, proceeding without tenant context`
      )
      return handler(ctx)
    }
  }
}

/**
 * Logging middleware
 * Logs job start, completion, and errors
 */
export function withLogging<T, R = void>(): Middleware<T, R> {
  return async (ctx: JobContext<T>, next: () => Promise<R>): Promise<R> => {
    const start = Date.now()
    const tenantId = (ctx.payload as TenantEvent<unknown>).tenantId ?? 'unknown'

    console.log(
      `[Job:${ctx.name}] Starting`,
      JSON.stringify({
        id: ctx.id,
        tenantId,
        attempt: ctx.attempt,
        maxAttempts: ctx.maxAttempts,
      })
    )

    try {
      const result = await next()
      const duration = Date.now() - start

      console.log(
        `[Job:${ctx.name}] Completed`,
        JSON.stringify({
          id: ctx.id,
          tenantId,
          duration: `${duration}ms`,
        })
      )

      return result
    } catch (error) {
      const duration = Date.now() - start
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      console.error(
        `[Job:${ctx.name}] Failed`,
        JSON.stringify({
          id: ctx.id,
          tenantId,
          duration: `${duration}ms`,
          error: errorMessage,
          attempt: ctx.attempt,
          maxAttempts: ctx.maxAttempts,
        })
      )

      throw error
    }
  }
}

/**
 * Timing middleware
 * Records job execution time
 */
export function withTiming<T, R = void>(
  onTiming?: (name: string, duration: number, ctx: JobContext<T>) => void
): Middleware<T, R> {
  return async (ctx: JobContext<T>, next: () => Promise<R>): Promise<R> => {
    const start = Date.now()

    try {
      return await next()
    } finally {
      const duration = Date.now() - start
      onTiming?.(ctx.name, duration, ctx)
    }
  }
}

/**
 * Error classification middleware
 * Classifies errors for retry decisions
 */
export function withErrorClassification<T, R = void>(): Middleware<T, R> {
  return async (_ctx: JobContext<T>, next: () => Promise<R>): Promise<R> => {
    try {
      return await next()
    } catch (error) {
      const classified = classifyError(error)
      throw classified
    }
  }
}

/**
 * Classify an error for retry decisions
 */
export function classifyError(error: unknown): ClassifiedError {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown error')

  const classified = err as ClassifiedError

  // Already classified
  if (classified.classification) {
    return classified
  }

  // Network errors - transient
  if (
    err.message.includes('ECONNREFUSED') ||
    err.message.includes('ETIMEDOUT') ||
    err.message.includes('ENOTFOUND') ||
    err.message.includes('fetch failed') ||
    err.message.includes('network error')
  ) {
    classified.classification = 'transient'
    classified.retryable = true
    return classified
  }

  // Rate limiting - transient with backoff
  if (
    err.message.includes('rate limit') ||
    err.message.includes('429') ||
    err.message.includes('Too Many Requests')
  ) {
    classified.classification = 'transient'
    classified.retryable = true
    classified.retryAfter = 60 // Wait 60 seconds
    return classified
  }

  // Authentication errors - permanent
  if (
    err.message.includes('401') ||
    err.message.includes('403') ||
    err.message.includes('Unauthorized') ||
    err.message.includes('Forbidden')
  ) {
    classified.classification = 'permanent'
    classified.retryable = false
    return classified
  }

  // Validation errors - permanent
  if (
    err.message.includes('validation') ||
    err.message.includes('invalid') ||
    err.message.includes('required')
  ) {
    classified.classification = 'permanent'
    classified.retryable = false
    return classified
  }

  // Database constraint violations - permanent
  if (
    err.message.includes('unique constraint') ||
    err.message.includes('foreign key') ||
    err.message.includes('check constraint')
  ) {
    classified.classification = 'permanent'
    classified.retryable = false
    return classified
  }

  // Service unavailable - transient
  if (
    err.message.includes('503') ||
    err.message.includes('Service Unavailable') ||
    err.message.includes('temporarily unavailable')
  ) {
    classified.classification = 'transient'
    classified.retryable = true
    classified.retryAfter = 30
    return classified
  }

  // Unknown - default to transient for first few attempts
  classified.classification = 'unknown'
  classified.retryable = true
  return classified
}

/**
 * Idempotency middleware
 * Prevents duplicate processing of the same job
 */
export function withIdempotency<T, R = void>(
  getIdempotencyKey: (ctx: JobContext<T>) => string,
  storage: {
    has: (key: string) => Promise<boolean>
    set: (key: string, ttl?: number) => Promise<void>
  }
): Middleware<T, R> {
  return async (ctx: JobContext<T>, next: () => Promise<R>): Promise<R> => {
    const key = `idempotency:${ctx.name}:${getIdempotencyKey(ctx)}`

    const alreadyProcessed = await storage.has(key)
    if (alreadyProcessed) {
      console.log(`[Job:${ctx.name}] Skipping duplicate: ${key}`)
      return undefined as unknown as R
    }

    try {
      const result = await next()
      // Mark as processed with 24h TTL
      await storage.set(key, 86400)
      return result
    } catch (error) {
      // Don't mark as processed on error - allow retry
      throw error
    }
  }
}

/**
 * Timeout middleware
 * Enforces a maximum execution time
 */
export function withTimeout<T, R = void>(timeoutMs: number): Middleware<T, R> {
  return async (_ctx: JobContext<T>, next: () => Promise<R>): Promise<R> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const result = await Promise.race([
        next(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`Job timed out after ${timeoutMs}ms`))
          })
        }),
      ])

      return result
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Rate limiting middleware
 * Limits job execution rate
 */
export function withRateLimit<T, R = void>(
  limiter: {
    acquire: () => Promise<void>
    release: () => void
  }
): Middleware<T, R> {
  return async (_ctx: JobContext<T>, next: () => Promise<R>): Promise<R> => {
    await limiter.acquire()
    try {
      return await next()
    } finally {
      limiter.release()
    }
  }
}

/**
 * Create a simple rate limiter
 * @param maxConcurrent - Maximum concurrent executions
 * @param intervalMs - Time window in milliseconds
 * @param maxPerInterval - Maximum executions per interval
 */
export function createRateLimiter(
  maxConcurrent: number,
  intervalMs: number = 1000,
  maxPerInterval: number = maxConcurrent
): {
  acquire: () => Promise<void>
  release: () => void
} {
  let currentConcurrent = 0
  let executionsInInterval = 0
  const queue: Array<() => void> = []

  // Reset counter periodically
  setInterval(() => {
    executionsInInterval = 0
    processQueue()
  }, intervalMs)

  function processQueue(): void {
    while (
      queue.length > 0 &&
      currentConcurrent < maxConcurrent &&
      executionsInInterval < maxPerInterval
    ) {
      const resolve = queue.shift()
      if (resolve) {
        currentConcurrent++
        executionsInInterval++
        resolve()
      }
    }
  }

  return {
    async acquire(): Promise<void> {
      if (
        currentConcurrent < maxConcurrent &&
        executionsInInterval < maxPerInterval
      ) {
        currentConcurrent++
        executionsInInterval++
        return
      }

      return new Promise((resolve) => {
        queue.push(resolve)
      })
    },

    release(): void {
      currentConcurrent = Math.max(0, currentConcurrent - 1)
      processQueue()
    },
  }
}

/**
 * Create a handler with standard middleware applied
 * Includes: logging, timing, error classification, tenant context
 */
export function createJobHandler<
  T extends TenantEvent<unknown>,
  R = void,
>(
  handler: JobHandler<T, R>,
  options?: {
    timeout?: number
    skipTenantContext?: boolean
  }
): JobHandler<T, R> {
  const middlewares: Middleware<T, R>[] = [
    withLogging<T, R>(),
    withErrorClassification<T, R>(),
  ]

  if (options?.timeout) {
    middlewares.push(withTimeout<T, R>(options.timeout))
  }

  const composed = composeMiddleware(...middlewares)
  const withMiddleware = composed(handler)

  if (options?.skipTenantContext) {
    return withMiddleware
  }

  return withTenantContext(withMiddleware)
}

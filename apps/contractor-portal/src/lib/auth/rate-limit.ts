/**
 * Rate limiting utilities for contractor authentication endpoints
 *
 * Uses in-memory storage for development and can be upgraded to Redis.
 * Limits: 5 requests per 15 minutes for auth endpoints (per spec).
 */

// Rate limit configuration - spec says 5 attempts/15 min per IP
export const RATE_LIMIT_MAX_ATTEMPTS = 5
export const RATE_LIMIT_WINDOW_SECONDS = 15 * 60 // 15 minutes

// Password reset specific limits
export const PASSWORD_RESET_MAX_ATTEMPTS = 3
export const PASSWORD_RESET_WINDOW_SECONDS = 3600 // 1 hour

// In-memory store for rate limits (upgrade to Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Generate a rate limit key
 */
function getRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:contractor:${action}:${identifier}`
}

/**
 * Check if an identifier is rate limited
 *
 * @param identifier - IP address or email to check
 * @param action - Action being rate limited (e.g., 'auth', 'password_reset')
 * @param maxAttempts - Maximum allowed attempts
 * @param windowSeconds - Time window in seconds
 * @returns Object with isLimited flag and remaining attempts
 */
export function checkRateLimit(
  identifier: string,
  action: string = 'auth',
  maxAttempts: number = RATE_LIMIT_MAX_ATTEMPTS,
  windowSeconds: number = RATE_LIMIT_WINDOW_SECONDS
): { isLimited: boolean; remaining: number; resetAt: Date } {
  const key = getRateLimitKey(identifier, action)
  const now = Date.now()

  const record = rateLimitStore.get(key)

  // If no record or window expired, not limited
  if (!record || now > record.resetAt) {
    return {
      isLimited: false,
      remaining: maxAttempts,
      resetAt: new Date(now + windowSeconds * 1000),
    }
  }

  const remaining = Math.max(0, maxAttempts - record.count)

  return {
    isLimited: record.count >= maxAttempts,
    remaining,
    resetAt: new Date(record.resetAt),
  }
}

/**
 * Record a rate limit attempt
 *
 * @param identifier - IP address or email
 * @param action - Action being rate limited
 * @param windowSeconds - Time window in seconds
 */
export function recordRateLimitAttempt(
  identifier: string,
  action: string = 'auth',
  windowSeconds: number = RATE_LIMIT_WINDOW_SECONDS
): void {
  const key = getRateLimitKey(identifier, action)
  const now = Date.now()

  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    // Start a new window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    })
  } else {
    // Increment existing window
    record.count++
    rateLimitStore.set(key, record)
  }
}

/**
 * Clear rate limit for an identifier
 *
 * @param identifier - IP address or email
 * @param action - Action to clear
 */
export function clearRateLimit(identifier: string, action: string = 'auth'): void {
  const key = getRateLimitKey(identifier, action)
  rateLimitStore.delete(key)
}

/**
 * Check rate limit specifically for password reset
 * More restrictive: 3 attempts per hour per email
 */
export function checkPasswordResetRateLimit(email: string): {
  isLimited: boolean
  remaining: number
  resetAt: Date
} {
  return checkRateLimit(
    email.toLowerCase(),
    'password_reset',
    PASSWORD_RESET_MAX_ATTEMPTS,
    PASSWORD_RESET_WINDOW_SECONDS
  )
}

/**
 * Record a password reset attempt
 */
export function recordPasswordResetAttempt(email: string): void {
  recordRateLimitAttempt(
    email.toLowerCase(),
    'password_reset',
    PASSWORD_RESET_WINDOW_SECONDS
  )
}

/**
 * Get IP address from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(
  remaining: number,
  resetAt: Date
): Record<string, string> {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
  }
}

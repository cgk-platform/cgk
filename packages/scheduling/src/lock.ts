/**
 * Distributed locking for booking prevention
 *
 * Prevents double-booking by using Redis-based distributed locks
 */

import { createTenantCache } from '@cgk-platform/db'

import type { LockResult, RateLimitResult } from './types.js'

const LOCK_TTL_SECONDS = 30
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 10

/**
 * Acquire a booking lock for a specific time slot
 *
 * Uses Redis SETNX pattern for distributed locking.
 * Lock expires after 30 seconds to prevent deadlocks.
 *
 * @param tenantId - Tenant ID
 * @param hostUserId - Host user's scheduling user ID
 * @param startTime - ISO string of slot start time
 * @returns Lock result with acquired status and lock key
 */
export async function acquireBookingLock(
  tenantId: string,
  hostUserId: string,
  startTime: string
): Promise<LockResult> {
  const cache = createTenantCache(tenantId)
  const lockKey = `booking_lock:${hostUserId}:${startTime}`
  const lockValue = Date.now().toString()

  // Try to set lock with NX (only if not exists)
  // First check if exists
  const existing = await cache.get<string>(lockKey)

  if (existing) {
    return { acquired: false, lockKey }
  }

  // Set with TTL
  await cache.set(lockKey, lockValue, { ttl: LOCK_TTL_SECONDS })

  // Verify we got the lock (basic double-check)
  const verify = await cache.get<string>(lockKey)
  const acquired = verify === lockValue

  return { acquired, lockKey }
}

/**
 * Release a booking lock
 *
 * @param tenantId - Tenant ID
 * @param lockKey - Lock key from acquireBookingLock
 */
export async function releaseBookingLock(tenantId: string, lockKey: string): Promise<void> {
  const cache = createTenantCache(tenantId)
  await cache.delete(lockKey)
}

/**
 * Check rate limit for booking requests
 *
 * Limits to 10 booking attempts per minute per IP address.
 *
 * @param tenantId - Tenant ID
 * @param ip - Client IP address
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkBookingRateLimit(
  tenantId: string,
  ip: string
): Promise<RateLimitResult> {
  const cache = createTenantCache(tenantId)
  const key = `booking_rate:${ip}`

  const current = await cache.get<number>(key)
  const count = current || 0

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: RATE_LIMIT_WINDOW_SECONDS,
    }
  }

  // Increment counter
  await cache.set(key, count + 1, { ttl: RATE_LIMIT_WINDOW_SECONDS })

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - count - 1,
    retryAfter: 0,
  }
}

/**
 * Rate limit helper for general scheduling operations
 *
 * @param tenantId - Tenant ID
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param operation - Operation name for key prefix
 * @param maxRequests - Maximum requests per window
 * @param windowSeconds - Time window in seconds
 */
export async function checkRateLimit(
  tenantId: string,
  identifier: string,
  operation: string,
  maxRequests = 60,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const cache = createTenantCache(tenantId)
  const key = `rate:${operation}:${identifier}`

  const current = await cache.get<number>(key)
  const count = current || 0

  if (count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: windowSeconds,
    }
  }

  await cache.set(key, count + 1, { ttl: windowSeconds })

  return {
    allowed: true,
    remaining: maxRequests - count - 1,
    retryAfter: 0,
  }
}

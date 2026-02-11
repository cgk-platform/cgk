/**
 * Cookie Management for A/B Test Assignments
 *
 * Handles persistent visitor identification and test assignments.
 * Cookie is base64-encoded JSON for compact storage.
 */

import type { ABCookie } from '../types.js'
import { AB_COOKIE_NAME, AB_COOKIE_MAX_AGE, VISITOR_ID_LENGTH } from '../config.js'

// Re-export ABCookie type for convenience
export type { ABCookie } from '../types.js'

/**
 * Generate a unique visitor ID
 * Uses ULID-style format: timestamp + random
 *
 * @returns 21-character visitor ID
 */
export function generateVisitorId(): string {
  const timestamp = Date.now().toString(36).padStart(8, '0')
  const random = Array.from({ length: VISITOR_ID_LENGTH - 8 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('')

  return (timestamp + random).substring(0, VISITOR_ID_LENGTH)
}

/**
 * Parse A/B cookie from string value
 *
 * @param cookieValue - Base64-encoded cookie string
 * @returns Parsed cookie or null if invalid
 */
export function parseABCookie(cookieValue: string | undefined): ABCookie | null {
  if (!cookieValue) return null

  try {
    // Handle URL-safe base64
    const base64 = cookieValue.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const parsed = JSON.parse(json) as unknown

    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const cookie = parsed as Partial<ABCookie>

    if (typeof cookie.v !== 'string' || typeof cookie.t !== 'object') {
      return null
    }

    return cookie as ABCookie
  } catch {
    return null
  }
}

/**
 * Serialize A/B cookie to string
 *
 * @param cookie - Cookie object
 * @returns Base64-encoded string (URL-safe)
 */
export function serializeABCookie(cookie: ABCookie): string {
  const json = JSON.stringify(cookie)
  // Use URL-safe base64
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Get visitor ID from cookie, or generate new one
 *
 * @param cookie - Existing cookie or null
 * @returns Visitor ID (existing or new)
 */
export function getOrCreateVisitorId(cookie: ABCookie | null): string {
  if (cookie?.v && cookie.v.length === VISITOR_ID_LENGTH) {
    return cookie.v
  }
  return generateVisitorId()
}

/**
 * Get test assignment from cookie
 *
 * @param cookie - Cookie object
 * @param testId - Test identifier
 * @returns Assignment info or null if not assigned
 */
export function getAssignmentFromCookie(
  cookie: ABCookie | null,
  testId: string
): { variantId: string; assignedAt: number; shippingSuffix?: string } | null {
  if (!cookie?.t?.[testId]) {
    return null
  }

  const assignment = cookie.t[testId]
  if (!assignment) {
    return null
  }

  return {
    variantId: assignment.var,
    assignedAt: assignment.at,
    shippingSuffix: assignment.sh,
  }
}

/**
 * Add test assignment to cookie
 *
 * @param cookie - Existing cookie (will create if null)
 * @param testId - Test identifier
 * @param variantId - Assigned variant ID
 * @param shippingSuffix - Optional shipping suffix for shipping tests
 * @returns Updated cookie
 */
export function addAssignmentToCookie(
  cookie: ABCookie | null,
  testId: string,
  variantId: string,
  shippingSuffix?: string
): ABCookie {
  const visitorId = getOrCreateVisitorId(cookie)

  const updatedCookie: ABCookie = {
    v: visitorId,
    t: {
      ...(cookie?.t || {}),
      [testId]: {
        var: variantId,
        at: Math.floor(Date.now() / 1000),
        ...(shippingSuffix ? { sh: shippingSuffix } : {}),
      },
    },
  }

  return updatedCookie
}

/**
 * Remove test assignment from cookie
 *
 * @param cookie - Existing cookie
 * @param testId - Test identifier to remove
 * @returns Updated cookie
 */
export function removeAssignmentFromCookie(cookie: ABCookie, testId: string): ABCookie {
  const { [testId]: _removed, ...remainingTests } = cookie.t

  return {
    v: cookie.v,
    t: remainingTests,
  }
}

/**
 * Clean up expired assignments from cookie
 * Removes assignments older than 30 days for completed tests
 *
 * @param cookie - Cookie to clean
 * @param activeTestIds - IDs of tests that are still active
 * @returns Cleaned cookie
 */
export function cleanupCookie(cookie: ABCookie, activeTestIds: Set<string>): ABCookie {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  const cleanedTests: ABCookie['t'] = {}

  for (const [testId, assignment] of Object.entries(cookie.t)) {
    // Keep if test is still active
    if (activeTestIds.has(testId)) {
      cleanedTests[testId] = assignment
      continue
    }

    // Keep if assigned within last 30 days (for completed test attribution)
    if (assignment && assignment.at > thirtyDaysAgo) {
      cleanedTests[testId] = assignment
    }
  }

  return {
    v: cookie.v,
    t: cleanedTests,
  }
}

/**
 * Generate Set-Cookie header value
 *
 * @param cookie - Cookie to serialize
 * @param options - Cookie options
 * @returns Set-Cookie header value
 */
export function generateSetCookieHeader(
  cookie: ABCookie,
  options: {
    domain?: string
    path?: string
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  } = {}
): string {
  const value = serializeABCookie(cookie)
  const parts = [`${AB_COOKIE_NAME}=${value}`]

  parts.push(`Max-Age=${AB_COOKIE_MAX_AGE}`)
  parts.push(`Path=${options.path || '/'}`)

  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }

  if (options.secure !== false) {
    parts.push('Secure')
  }

  parts.push(`SameSite=${options.sameSite || 'Lax'}`)
  parts.push('HttpOnly')

  return parts.join('; ')
}

/**
 * Get cookie name constant
 */
export function getCookieName(): string {
  return AB_COOKIE_NAME
}

/**
 * Estimate cookie size in bytes
 *
 * @param cookie - Cookie to measure
 * @returns Approximate size in bytes
 */
export function estimateCookieSize(cookie: ABCookie): number {
  const serialized = serializeABCookie(cookie)
  return new TextEncoder().encode(`${AB_COOKIE_NAME}=${serialized}`).length
}

/**
 * Check if cookie is approaching size limit (4KB)
 *
 * @param cookie - Cookie to check
 * @returns true if cookie size is over 3KB
 */
export function isCookieNearLimit(cookie: ABCookie): boolean {
  return estimateCookieSize(cookie) > 3072 // 3KB warning threshold
}

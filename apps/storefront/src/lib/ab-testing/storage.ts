/**
 * A/B test assignment storage
 *
 * Handles cookie-based storage and database persistence of variant assignments.
 */

import type { ABAssignment, ABCookieData } from './types'

const AB_COOKIE_NAME = 'cgk_ab_tests'
const COOKIE_EXPIRY_DAYS = 90

/**
 * Get all A/B assignments from cookie (client-side)
 */
export function getAssignmentsFromCookie(): ABCookieData | null {
  if (typeof window === 'undefined') return null

  const match = document.cookie.match(new RegExp(`${AB_COOKIE_NAME}=([^;]+)`))
  if (!match || !match[1]) return null

  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return null
  }
}

/**
 * Get specific assignment from cookie (client-side)
 */
export function getAssignmentFromCookie(testId: string): string | null {
  const data = getAssignmentsFromCookie()
  return data?.assignments[testId] ?? null
}

/**
 * Save assignment to cookie (client-side)
 */
export function saveAssignmentToCookie(
  testId: string,
  variantId: string,
  visitorId: string
): void {
  if (typeof window === 'undefined') return

  const existing = getAssignmentsFromCookie()
  const data: ABCookieData = existing ?? {
    assignments: {},
    visitorId,
    updatedAt: new Date().toISOString(),
  }

  data.assignments[testId] = variantId
  data.updatedAt = new Date().toISOString()

  const expires = new Date()
  expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)

  document.cookie = `${AB_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Get visitor ID from A/B cookie
 */
export function getVisitorIdFromCookie(): string | null {
  const data = getAssignmentsFromCookie()
  return data?.visitorId ?? null
}

/**
 * Parse cookie header string on server side
 */
export function parseServerCookie(cookieHeader: string): ABCookieData | null {
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, string>
  )

  const abCookie = cookies[AB_COOKIE_NAME]
  if (!abCookie) return null

  try {
    return JSON.parse(decodeURIComponent(abCookie))
  } catch {
    return null
  }
}

/**
 * Build Set-Cookie header value for A/B assignments
 */
export function buildSetCookieHeader(data: ABCookieData): string {
  const expires = new Date()
  expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS)

  return `${AB_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; Expires=${expires.toUTCString()}; Path=/; SameSite=Lax`
}

/**
 * Persist assignment to database (server-side)
 */
export async function persistAssignment(
  tenantSlug: string,
  assignment: ABAssignment
): Promise<void> {
  const { withTenant, sql } = await import('@cgk/db')

  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO ab_test_assignments (
        test_id,
        variant_id,
        visitor_id,
        assigned_at
      ) VALUES (
        ${assignment.testId},
        ${assignment.variantId},
        ${assignment.visitorId},
        ${assignment.assignedAt}
      )
      ON CONFLICT (test_id, visitor_id)
      DO NOTHING
    `
  })
}

/**
 * Get assignment from database (server-side)
 */
export async function getPersistedAssignment(
  tenantSlug: string,
  testId: string,
  visitorId: string
): Promise<string | null> {
  const { withTenant, sql } = await import('@cgk/db')

  return withTenant(tenantSlug, async () => {
    const result = await sql<{ variant_id: string }>`
      SELECT variant_id
      FROM ab_test_assignments
      WHERE test_id = ${testId}
        AND visitor_id = ${visitorId}
      LIMIT 1
    `

    return result.rows[0]?.variant_id ?? null
  })
}

/**
 * Get all assignments for a visitor from database (server-side)
 */
export async function getAllPersistedAssignments(
  tenantSlug: string,
  visitorId: string
): Promise<Record<string, string>> {
  const { withTenant, sql } = await import('@cgk/db')

  return withTenant(tenantSlug, async () => {
    const result = await sql<{ test_id: string; variant_id: string }>`
      SELECT test_id, variant_id
      FROM ab_test_assignments
      WHERE visitor_id = ${visitorId}
    `

    return result.rows.reduce(
      (acc, row) => {
        if (row?.test_id && row.variant_id) {
          acc[row.test_id] = row.variant_id
        }
        return acc
      },
      {} as Record<string, string>
    )
  })
}

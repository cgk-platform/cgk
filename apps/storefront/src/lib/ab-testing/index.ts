/**
 * A/B Testing Module
 *
 * Provides consistent variant assignment for A/B tests with:
 * - Deterministic hashing for consistent assignments
 * - Cookie and database persistence
 * - Traffic allocation support
 * - Server and client-side compatibility
 */

import { withTenant, sql } from '@cgk/db'

import { getTenantSlug } from '../tenant'

import { getHashBucket, getVariantIndex, isInTrafficAllocation } from './hash'
import {
  getAssignmentFromCookie,
  getPersistedAssignment,
  getVisitorIdFromCookie,
  persistAssignment,
  saveAssignmentToCookie,
} from './storage'
import type {
  ABAssignment,
  ABAssignmentResult,
  ABTest,
  ABVariant,
  GetAssignmentOptions,
} from './types'

export * from './types'
export { getHashBucket, getVariantIndex, isInTrafficAllocation, fnv1aHash } from './hash'
export {
  getAssignmentsFromCookie,
  getAssignmentFromCookie,
  saveAssignmentToCookie,
  getVisitorIdFromCookie,
  parseServerCookie,
  buildSetCookieHeader,
} from './storage'

/**
 * Get variant assignment for a test
 *
 * Returns consistent variant assignment for the same visitor + test combination.
 * Checks cookie first, then database, then assigns new variant if needed.
 *
 * @param testId - The test ID to get assignment for
 * @param options - Assignment options
 * @returns Assignment result with variant info
 */
export async function getVariantAssignment(
  testId: string,
  options: GetAssignmentOptions = {}
): Promise<ABAssignmentResult | null> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return null

  // Get the test configuration
  const test = await getActiveTest(tenantSlug, testId)
  if (!test) return null

  // Determine visitor ID
  let visitorId = options.visitorId

  if (!visitorId) {
    // Try to get from cookie (client-side)
    visitorId = getVisitorIdFromCookie() ?? undefined

    // If still no visitor ID, we cannot assign
    if (!visitorId) {
      console.warn('No visitor ID available for A/B test assignment')
      return null
    }
  }

  // Check traffic allocation
  if (!isInTrafficAllocation(visitorId, testId, test.trafficAllocation)) {
    // Visitor is not in test traffic - return control variant
    const controlVariant = test.variants[0]
    if (!controlVariant) return null

    return {
      variant: controlVariant,
      isNew: false,
      test,
    }
  }

  // Check for existing assignment (unless forced)
  if (!options.force) {
    // Check cookie first
    const cookieVariantId = getAssignmentFromCookie(testId)
    if (cookieVariantId) {
      const variant = test.variants.find((v) => v.id === cookieVariantId)
      if (variant) {
        return { variant, isNew: false, test }
      }
    }

    // Check database
    const dbVariantId = await getPersistedAssignment(tenantSlug, testId, visitorId)
    if (dbVariantId) {
      const variant = test.variants.find((v) => v.id === dbVariantId)
      if (variant) {
        // Save to cookie for faster future access
        saveAssignmentToCookie(testId, dbVariantId, visitorId)
        return { variant, isNew: false, test }
      }
    }
  }

  // Assign new variant
  const variant = assignVariant(visitorId, test)

  // Create assignment record
  const assignment: ABAssignment = {
    testId,
    variantId: variant.id,
    visitorId,
    assignedAt: new Date().toISOString(),
  }

  // Persist to cookie
  saveAssignmentToCookie(testId, variant.id, visitorId)

  // Persist to database (async, don't wait)
  persistAssignment(tenantSlug, assignment).catch((error) => {
    console.error('Failed to persist A/B assignment:', error)
  })

  return { variant, isNew: true, test }
}

/**
 * Get all active tests for the current page
 */
export async function getActiveTests(
  urlPath?: string
): Promise<ABTest[]> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return []

  return withTenant(tenantSlug, async () => {
    const now = new Date().toISOString()

    const result = await sql<{
      id: string
      name: string
      description: string | null
      status: string
      variants: ABVariant[]
      traffic_allocation: number
      targeting: unknown | null
      start_date: string | null
      end_date: string | null
      created_at: string
      updated_at: string
    }>`
      SELECT
        id,
        name,
        description,
        status,
        variants,
        traffic_allocation,
        targeting,
        start_date,
        end_date,
        created_at,
        updated_at
      FROM ab_tests
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= ${now})
        AND (end_date IS NULL OR end_date >= ${now})
    `

    const tests: ABTest[] = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status as ABTest['status'],
      variants: row.variants,
      trafficAllocation: row.traffic_allocation,
      targeting: row.targeting as ABTest['targeting'],
      startDate: row.start_date ?? undefined,
      endDate: row.end_date ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    // Filter by URL pattern if provided
    if (urlPath) {
      return tests.filter((test) => {
        if (!test.targeting?.urlPatterns || test.targeting.urlPatterns.length === 0) {
          return true // No targeting = all URLs
        }
        return test.targeting.urlPatterns.some((pattern) =>
          matchUrlPattern(urlPath, pattern)
        )
      })
    }

    return tests
  })
}

/**
 * Get a specific active test by ID
 */
async function getActiveTest(tenantSlug: string, testId: string): Promise<ABTest | null> {
  return withTenant(tenantSlug, async () => {
    const now = new Date().toISOString()

    const result = await sql<{
      id: string
      name: string
      description: string | null
      status: string
      variants: ABVariant[]
      traffic_allocation: number
      targeting: unknown | null
      start_date: string | null
      end_date: string | null
      created_at: string
      updated_at: string
    }>`
      SELECT
        id,
        name,
        description,
        status,
        variants,
        traffic_allocation,
        targeting,
        start_date,
        end_date,
        created_at,
        updated_at
      FROM ab_tests
      WHERE id = ${testId}
        AND status = 'active'
        AND (start_date IS NULL OR start_date <= ${now})
        AND (end_date IS NULL OR end_date >= ${now})
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status as ABTest['status'],
      variants: row.variants,
      trafficAllocation: row.traffic_allocation,
      targeting: row.targeting as ABTest['targeting'],
      startDate: row.start_date ?? undefined,
      endDate: row.end_date ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

/**
 * Assign a variant to a visitor using consistent hashing
 */
function assignVariant(visitorId: string, test: ABTest): ABVariant {
  const bucket = getHashBucket(visitorId, test.id)
  const weights = test.variants.map((v) => v.weight)
  const index = getVariantIndex(bucket, weights)

  return test.variants[index] ?? test.variants[0]!
}

/**
 * Simple glob pattern matching for URL targeting
 */
function matchUrlPattern(url: string, pattern: string): boolean {
  // Convert glob to regex
  const regex = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\//g, '\\/')

  return new RegExp(`^${regex}$`).test(url)
}

/**
 * Track conversion event for an A/B test
 */
export async function trackConversion(
  testId: string,
  visitorId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return

  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO ab_test_conversions (
        test_id,
        visitor_id,
        event_type,
        metadata,
        created_at
      ) VALUES (
        ${testId},
        ${visitorId},
        ${eventType},
        ${JSON.stringify(metadata ?? {})},
        ${new Date().toISOString()}
      )
    `
  })
}

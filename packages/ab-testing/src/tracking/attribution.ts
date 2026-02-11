/**
 * Order Attribution
 *
 * Links orders to A/B test variants for revenue attribution.
 */

import { parseABCookie } from '../assignment/cookies.js'

/**
 * Attribution data to be stored with orders
 */
export interface OrderAttribution {
  /** Map of test ID to variant assignment */
  tests: {
    [testId: string]: {
      variantId: string
      variantName?: string
      assignedAt: Date
      shippingSuffix?: string
    }
  }
  /** Visitor ID from A/B cookie */
  visitorId: string
  /** Timestamp of order */
  orderedAt: Date
}

/**
 * Extract attribution data from A/B cookie
 *
 * @param cookieValue - A/B cookie value
 * @param activeTestIds - Set of active test IDs to include
 * @returns Attribution data or null if no valid cookie
 */
export function extractAttributionFromCookie(
  cookieValue: string | undefined,
  activeTestIds?: Set<string>
): OrderAttribution | null {
  const cookie = parseABCookie(cookieValue)
  if (!cookie) return null

  const tests: OrderAttribution['tests'] = {}

  for (const [testId, assignment] of Object.entries(cookie.t)) {
    // Skip if not in active tests (when filter is provided)
    if (activeTestIds && !activeTestIds.has(testId)) {
      continue
    }

    if (assignment) {
      tests[testId] = {
        variantId: assignment.var,
        assignedAt: new Date(assignment.at * 1000),
        shippingSuffix: assignment.sh,
      }
    }
  }

  // Return null if no test assignments
  if (Object.keys(tests).length === 0) {
    return null
  }

  return {
    tests,
    visitorId: cookie.v,
    orderedAt: new Date(),
  }
}

/**
 * Serialize attribution data for storage in JSONB column
 */
export function serializeAttribution(attribution: OrderAttribution): string {
  return JSON.stringify({
    tests: Object.fromEntries(
      Object.entries(attribution.tests).map(([testId, data]) => [
        testId,
        {
          variantId: data.variantId,
          variantName: data.variantName,
          assignedAt: data.assignedAt.toISOString(),
          shippingSuffix: data.shippingSuffix,
        },
      ])
    ),
    visitorId: attribution.visitorId,
    orderedAt: attribution.orderedAt.toISOString(),
  })
}

/**
 * Deserialize attribution data from JSONB
 */
export function deserializeAttribution(json: string): OrderAttribution | null {
  try {
    const data = JSON.parse(json) as {
      tests: {
        [testId: string]: {
          variantId: string
          variantName?: string
          assignedAt: string
          shippingSuffix?: string
        }
      }
      visitorId: string
      orderedAt: string
    }

    return {
      tests: Object.fromEntries(
        Object.entries(data.tests).map(([testId, testData]) => [
          testId,
          {
            variantId: testData.variantId,
            variantName: testData.variantName,
            assignedAt: new Date(testData.assignedAt),
            shippingSuffix: testData.shippingSuffix,
          },
        ])
      ),
      visitorId: data.visitorId,
      orderedAt: new Date(data.orderedAt),
    }
  } catch {
    return null
  }
}

/**
 * Get test variant IDs from attribution
 *
 * @param attribution - Attribution data
 * @returns Map of test ID to variant ID
 */
export function getVariantIdsFromAttribution(
  attribution: OrderAttribution
): Map<string, string> {
  const variantIds = new Map<string, string>()

  for (const [testId, data] of Object.entries(attribution.tests)) {
    variantIds.set(testId, data.variantId)
  }

  return variantIds
}

/**
 * Check if order is attributed to a specific test
 */
export function isAttributedToTest(
  attribution: OrderAttribution,
  testId: string
): boolean {
  return testId in attribution.tests
}

/**
 * Get variant ID for a specific test from attribution
 */
export function getVariantIdForTest(
  attribution: OrderAttribution,
  testId: string
): string | null {
  return attribution.tests[testId]?.variantId || null
}

/**
 * Merge multiple attribution sources
 * Later attributions take precedence
 */
export function mergeAttributions(
  ...attributions: (OrderAttribution | null)[]
): OrderAttribution | null {
  const validAttributions = attributions.filter((a): a is OrderAttribution => a !== null)

  if (validAttributions.length === 0) return null
  if (validAttributions.length === 1) return validAttributions[0]!

  const merged: OrderAttribution = {
    tests: {},
    visitorId: validAttributions[validAttributions.length - 1]!.visitorId,
    orderedAt: validAttributions[validAttributions.length - 1]!.orderedAt,
  }

  for (const attribution of validAttributions) {
    for (const [testId, data] of Object.entries(attribution.tests)) {
      merged.tests[testId] = data
    }
  }

  return merged
}

/**
 * Calculate attribution window
 * Returns true if assignment is within attribution window
 *
 * @param assignedAt - Assignment timestamp
 * @param orderedAt - Order timestamp
 * @param windowDays - Attribution window in days (default 30)
 */
export function isWithinAttributionWindow(
  assignedAt: Date,
  orderedAt: Date,
  windowDays: number = 30
): boolean {
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const difference = orderedAt.getTime() - assignedAt.getTime()

  return difference >= 0 && difference <= windowMs
}

/**
 * Filter attribution to only include assignments within window
 */
export function filterByAttributionWindow(
  attribution: OrderAttribution,
  windowDays: number = 30
): OrderAttribution {
  const filteredTests: OrderAttribution['tests'] = {}

  for (const [testId, data] of Object.entries(attribution.tests)) {
    if (isWithinAttributionWindow(data.assignedAt, attribution.orderedAt, windowDays)) {
      filteredTests[testId] = data
    }
  }

  return {
    ...attribution,
    tests: filteredTests,
  }
}

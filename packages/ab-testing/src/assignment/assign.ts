/**
 * Visitor Assignment Logic
 *
 * Handles the full assignment flow including:
 * - Checking for existing assignments
 * - Evaluating targeting rules
 * - Assigning to variants
 * - Persisting assignments
 */

import type {
  ABTest,
  ABVariant,
  ABTargetingRule,
  VisitorContext,
  AssignmentResult,
} from '../types.js'
import { assignVariant } from './allocate.js'
import { evaluateTargeting } from '../targeting/evaluate.js'
import {
  parseABCookie,
  getOrCreateVisitorId,
  getAssignmentFromCookie,
  addAssignmentToCookie,
  serializeABCookie,
  type ABCookie,
} from './cookies.js'

/**
 * Assignment options
 */
export interface AssignOptions {
  /** Existing cookie value */
  cookieValue?: string
  /** Force new assignment even if one exists */
  forceReassign?: boolean
  /** Skip targeting evaluation */
  skipTargeting?: boolean
}

/**
 * Full assignment result with cookie update
 */
export interface FullAssignmentResult {
  /** Assignment result */
  assignment: AssignmentResult | null
  /** Updated cookie */
  cookie: ABCookie
  /** Serialized cookie value for Set-Cookie header */
  cookieValue: string
  /** Whether visitor was excluded by targeting */
  excluded: boolean
  /** Exclusion reason if applicable */
  exclusionReason?: string
}

/**
 * Assign a visitor to a test variant
 *
 * @param test - The test to assign to
 * @param variants - Available variants
 * @param context - Visitor context
 * @param rules - Targeting rules
 * @param options - Assignment options
 * @returns Full assignment result
 */
export function assignVisitor(
  test: ABTest,
  variants: ABVariant[],
  context: VisitorContext,
  rules: ABTargetingRule[] = [],
  options: AssignOptions = {}
): FullAssignmentResult {
  const { cookieValue, forceReassign = false, skipTargeting = false } = options

  // Parse existing cookie
  const existingCookie = parseABCookie(cookieValue)

  // Get or create visitor ID
  const visitorId = context.visitorId || getOrCreateVisitorId(existingCookie)
  const updatedContext: VisitorContext = { ...context, visitorId }

  // Check test status
  if (test.status !== 'running') {
    const cookie = existingCookie || { v: visitorId, t: {} }
    return {
      assignment: null,
      cookie,
      cookieValue: serializeABCookie(cookie),
      excluded: true,
      exclusionReason: `Test is not running (status: ${test.status})`,
    }
  }

  // Check for traffic override
  if (test.trafficOverrideVariantId) {
    const overrideVariant = variants.find((v) => v.id === test.trafficOverrideVariantId)
    if (overrideVariant) {
      const cookie = addAssignmentToCookie(
        existingCookie,
        test.id,
        overrideVariant.id,
        overrideVariant.shippingSuffix
      )
      return {
        assignment: {
          testId: test.id,
          variantId: overrideVariant.id,
          variantName: overrideVariant.name,
          url: overrideVariant.url,
          isNewAssignment: true,
          shippingSuffix: overrideVariant.shippingSuffix,
        },
        cookie,
        cookieValue: serializeABCookie(cookie),
        excluded: false,
      }
    }
  }

  // Check for existing assignment
  if (!forceReassign) {
    const existingAssignment = getAssignmentFromCookie(existingCookie, test.id)
    if (existingAssignment) {
      const variant = variants.find((v) => v.id === existingAssignment.variantId)
      if (variant) {
        const cookie = existingCookie!
        return {
          assignment: {
            testId: test.id,
            variantId: variant.id,
            variantName: variant.name,
            url: variant.url,
            isNewAssignment: false,
            shippingSuffix: existingAssignment.shippingSuffix,
          },
          cookie,
          cookieValue: serializeABCookie(cookie),
          excluded: false,
        }
      }
      // Variant no longer exists, will re-assign
    }
  }

  // Evaluate targeting rules
  if (!skipTargeting && rules.length > 0) {
    const targetingResult = evaluateTargeting(rules, updatedContext)

    if (targetingResult.action === 'exclude') {
      const cookie = existingCookie || { v: visitorId, t: {} }
      return {
        assignment: null,
        cookie,
        cookieValue: serializeABCookie(cookie),
        excluded: true,
        exclusionReason: 'Excluded by targeting rules',
      }
    }

    if (targetingResult.action === 'assign_variant') {
      const forcedVariant = variants.find((v) => v.id === targetingResult.variantId)
      if (forcedVariant) {
        const cookie = addAssignmentToCookie(
          existingCookie,
          test.id,
          forcedVariant.id,
          forcedVariant.shippingSuffix
        )
        return {
          assignment: {
            testId: test.id,
            variantId: forcedVariant.id,
            variantName: forcedVariant.name,
            url: forcedVariant.url,
            isNewAssignment: true,
            shippingSuffix: forcedVariant.shippingSuffix,
          },
          cookie,
          cookieValue: serializeABCookie(cookie),
          excluded: false,
        }
      }
    }
  }

  // Standard assignment via hashing
  const selectedVariant = assignVariant(visitorId, test.id, variants)
  const cookie = addAssignmentToCookie(
    existingCookie,
    test.id,
    selectedVariant.id,
    selectedVariant.shippingSuffix
  )

  return {
    assignment: {
      testId: test.id,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      url: selectedVariant.url,
      isNewAssignment: true,
      shippingSuffix: selectedVariant.shippingSuffix,
    },
    cookie,
    cookieValue: serializeABCookie(cookie),
    excluded: false,
  }
}

/**
 * Get all active assignments for a visitor
 *
 * @param cookieValue - Cookie value
 * @param tests - Active tests
 * @param variantsByTest - Variants indexed by test ID
 * @returns Map of test ID to assignment result
 */
export function getVisitorAssignments(
  cookieValue: string | undefined,
  tests: ABTest[],
  variantsByTest: Map<string, ABVariant[]>
): Map<string, AssignmentResult> {
  const cookie = parseABCookie(cookieValue)
  const assignments = new Map<string, AssignmentResult>()

  if (!cookie) {
    return assignments
  }

  for (const test of tests) {
    const existingAssignment = getAssignmentFromCookie(cookie, test.id)
    if (!existingAssignment) continue

    const variants = variantsByTest.get(test.id) || []
    const variant = variants.find((v) => v.id === existingAssignment.variantId)

    if (variant) {
      assignments.set(test.id, {
        testId: test.id,
        variantId: variant.id,
        variantName: variant.name,
        url: variant.url,
        isNewAssignment: false,
        shippingSuffix: existingAssignment.shippingSuffix,
      })
    }
  }

  return assignments
}

/**
 * Check if visitor is assigned to a specific test
 *
 * @param cookieValue - Cookie value
 * @param testId - Test to check
 * @returns true if assigned
 */
export function isAssignedToTest(cookieValue: string | undefined, testId: string): boolean {
  const cookie = parseABCookie(cookieValue)
  return cookie?.t?.[testId] !== undefined
}

/**
 * Get the variant ID for a test from cookie
 *
 * @param cookieValue - Cookie value
 * @param testId - Test to check
 * @returns Variant ID or null
 */
export function getVariantIdFromCookie(
  cookieValue: string | undefined,
  testId: string
): string | null {
  const cookie = parseABCookie(cookieValue)
  return cookie?.t?.[testId]?.var || null
}

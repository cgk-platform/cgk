/**
 * A/B Testing types
 */

/**
 * A/B test definition
 */
export interface ABTest {
  /** Unique test ID */
  id: string
  /** Test name for identification */
  name: string
  /** Test description */
  description?: string
  /** Test status */
  status: 'draft' | 'active' | 'paused' | 'completed'
  /** Test variants */
  variants: ABVariant[]
  /** Traffic allocation (0-100) */
  trafficAllocation: number
  /** Target audience filters */
  targeting?: ABTargeting
  /** Start date */
  startDate?: string
  /** End date */
  endDate?: string
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

/**
 * Test variant
 */
export interface ABVariant {
  /** Variant ID */
  id: string
  /** Variant name (e.g., "Control", "Variant A") */
  name: string
  /** Weight for traffic allocation (0-100, must sum to 100) */
  weight: number
  /** Variant-specific configuration */
  config?: Record<string, unknown>
}

/**
 * Targeting rules for test eligibility
 */
export interface ABTargeting {
  /** Device types */
  devices?: Array<'desktop' | 'mobile' | 'tablet'>
  /** URL patterns (glob) */
  urlPatterns?: string[]
  /** User segments */
  segments?: string[]
  /** Geographic regions */
  regions?: string[]
}

/**
 * Variant assignment for a visitor
 */
export interface ABAssignment {
  /** Test ID */
  testId: string
  /** Assigned variant ID */
  variantId: string
  /** Visitor ID used for assignment */
  visitorId: string
  /** When assignment was made */
  assignedAt: string
}

/**
 * Result of variant assignment
 */
export interface ABAssignmentResult {
  /** The assigned variant */
  variant: ABVariant
  /** Whether this is a new assignment */
  isNew: boolean
  /** Full test object */
  test: ABTest
}

/**
 * Options for getting variant assignment
 */
export interface GetAssignmentOptions {
  /** Force new assignment even if one exists */
  force?: boolean
  /** Visitor ID to use (defaults to cookie-based) */
  visitorId?: string
}

/**
 * Cookie data for A/B test assignments
 */
export interface ABCookieData {
  /** Map of testId -> variantId */
  assignments: Record<string, string>
  /** Visitor ID */
  visitorId: string
  /** Last updated timestamp */
  updatedAt: string
}

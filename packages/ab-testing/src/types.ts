/**
 * A/B Testing Types
 *
 * Defines all types for the A/B testing system including tests,
 * variants, assignments, events, and targeting rules.
 */

/**
 * Test status lifecycle
 */
export type TestStatus = 'draft' | 'running' | 'paused' | 'completed'

/**
 * Test allocation mode
 */
export type AllocationMode =
  | 'manual' // Fixed allocation percentages
  | 'mab' // Multi-armed bandit (Thompson Sampling)
  | 'thompson' // Alias for MAB

/**
 * Test type
 */
export type TestType = 'landing_page' | 'shipping' | 'email' | 'checkout' | 'pricing'

/**
 * Goal event for conversion tracking
 */
export type GoalEvent = 'page_view' | 'add_to_cart' | 'begin_checkout' | 'purchase'

/**
 * Optimization metric
 */
export type OptimizationMetric =
  | 'conversion_rate' // Conversions / Visitors
  | 'revenue_per_visitor' // Revenue / Visitors
  | 'average_order_value' // Revenue / Conversions

/**
 * URL type for variants
 */
export type UrlType = 'static' | 'landing_page'

/**
 * Device type for targeting
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet'

/**
 * A/B Test definition
 */
export interface ABTest {
  id: string // ULID
  tenantId: string
  name: string
  description?: string
  status: TestStatus
  mode: AllocationMode
  testType: TestType
  goalEvent: GoalEvent
  optimizationMetric: OptimizationMetric
  confidenceLevel: number // 0.9, 0.95, 0.99
  baseUrl: string
  winnerVariantId?: string
  isSignificant: boolean
  trafficOverrideVariantId?: string
  shippingConfig?: ShippingTestConfig
  createdBy?: string
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  endedAt?: Date
  scheduledStartAt?: Date
  scheduledEndAt?: Date
  scheduleTimezone: string
  autoStart: boolean
  autoEnd: boolean
}

/**
 * Shipping test configuration
 */
export interface ShippingTestConfig {
  baseRateName: string
  variants: {
    suffix: string
    priceModifierCents: number
  }[]
}

/**
 * Test variant
 */
export interface ABVariant {
  id: string // ULID
  tenantId: string
  testId: string
  name: string
  url?: string
  urlType: UrlType
  landingPageId?: string
  trafficAllocation: number // 0-100
  isControl: boolean
  preserveQueryParams: boolean
  // Shipping test fields
  shippingRateName?: string
  shippingPriceCents?: number
  shippingSuffix?: string
  createdAt: Date
}

/**
 * Visitor assignment
 */
export interface ABVisitor {
  id: string
  tenantId: string
  testId: string
  variantId: string
  visitorId: string
  sessionId?: string
  assignedAt: Date
  // Attribution data
  landingPage?: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  // Device/Geo data
  deviceType?: DeviceType
  browser?: string
  country?: string
  region?: string
  city?: string
  userAgent?: string
  ipHash?: string
}

/**
 * Event types
 */
export type EventType = 'page_view' | 'add_to_cart' | 'begin_checkout' | 'purchase'

/**
 * Event record
 */
export interface ABEvent {
  id: number
  tenantId: string
  testId: string
  variantId: string
  visitorId: string
  eventType: EventType
  eventValueCents?: number
  orderId?: string
  pageUrl?: string
  createdAt: Date
}

/**
 * Daily aggregated metrics
 */
export interface ABDailyMetrics {
  id: number
  tenantId: string
  testId: string
  variantId: string
  date: Date
  visitors: number
  uniqueVisitors: number
  pageViews: number
  addToCarts: number
  beginCheckouts: number
  purchases: number
  revenueCents: number
  updatedAt: Date
}

/**
 * Targeting condition operators
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'

/**
 * Targeting condition field
 */
export type ConditionField =
  | 'url'
  | 'referrer'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'device_type'
  | 'browser'
  | 'country'
  | 'region'
  | 'city'
  | 'cookie'
  | 'query_param'

/**
 * Targeting condition
 */
export interface TargetingCondition {
  field: ConditionField
  operator: ConditionOperator
  value: string | string[]
  /** For cookie/query_param fields */
  key?: string
}

/**
 * Targeting action
 */
export type TargetingAction = 'include' | 'exclude' | 'assign_variant'

/**
 * Targeting rule
 */
export interface ABTargetingRule {
  id: string
  tenantId: string
  testId: string
  name: string
  conditions: TargetingCondition[]
  logic: 'and' | 'or'
  action: TargetingAction
  assignedVariantId?: string
  priority: number
  createdAt: Date
}

/**
 * Exclusion group (prevents users from being in multiple tests)
 */
export interface ABExclusionGroup {
  id: string
  tenantId: string
  name: string
  description?: string
  createdAt: Date
}

/**
 * Visitor context for assignment
 */
export interface VisitorContext {
  visitorId: string
  url: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  deviceType?: DeviceType
  browser?: string
  country?: string
  region?: string
  city?: string
  userAgent?: string
  ipAddress?: string
  cookies?: Record<string, string>
  queryParams?: Record<string, string>
}

/**
 * Assignment result
 */
export interface AssignmentResult {
  testId: string
  variantId: string
  variantName: string
  url?: string
  isNewAssignment: boolean
  shippingSuffix?: string
}

/**
 * Targeting evaluation result
 */
export type TargetingResult =
  | { action: 'include' }
  | { action: 'exclude' }
  | { action: 'assign_variant'; variantId: string }
  | { action: 'default' }

/**
 * Variant statistics for MAB
 */
export interface VariantStats {
  variant: ABVariant
  visitors: number
  conversions: number
  revenue: number
  conversionRate: number
  revenuePerVisitor: number
}

/**
 * Cookie structure for A/B test assignments
 */
export interface ABCookie {
  /** Visitor ID (21 chars) */
  v: string
  /** Test assignments */
  t: {
    [testId: string]: {
      /** Variant ID */
      var: string
      /** Assigned timestamp (Unix) */
      at: number
      /** Shipping suffix (for shipping tests) */
      sh?: string
    }
  }
}

/**
 * Create test input
 */
export interface CreateTestInput {
  name: string
  description?: string
  testType: TestType
  goalEvent: GoalEvent
  baseUrl: string
  mode?: AllocationMode
  optimizationMetric?: OptimizationMetric
  confidenceLevel?: number
  scheduledStartAt?: Date
  scheduledEndAt?: Date
  scheduleTimezone?: string
  autoStart?: boolean
  autoEnd?: boolean
  shippingConfig?: ShippingTestConfig
}

/**
 * Update test input
 */
export interface UpdateTestInput {
  name?: string
  description?: string
  status?: TestStatus
  mode?: AllocationMode
  optimizationMetric?: OptimizationMetric
  confidenceLevel?: number
  winnerVariantId?: string
  trafficOverrideVariantId?: string
  scheduledStartAt?: Date
  scheduledEndAt?: Date
  scheduleTimezone?: string
  autoStart?: boolean
  autoEnd?: boolean
}

/**
 * Create variant input
 */
export interface CreateVariantInput {
  testId: string
  name: string
  url?: string
  urlType?: UrlType
  landingPageId?: string
  trafficAllocation: number
  isControl?: boolean
  preserveQueryParams?: boolean
  shippingRateName?: string
  shippingPriceCents?: number
  shippingSuffix?: string
}

/**
 * Update variant input
 */
export interface UpdateVariantInput {
  name?: string
  url?: string
  urlType?: UrlType
  landingPageId?: string
  trafficAllocation?: number
  preserveQueryParams?: boolean
  shippingRateName?: string
  shippingPriceCents?: number
}

/**
 * Create targeting rule input
 */
export interface CreateTargetingRuleInput {
  testId: string
  name: string
  conditions: TargetingCondition[]
  logic?: 'and' | 'or'
  action: TargetingAction
  assignedVariantId?: string
  priority?: number
}

/**
 * Track event input
 */
export interface TrackEventInput {
  testId: string
  variantId: string
  visitorId: string
  eventType: EventType
  eventValueCents?: number
  orderId?: string
  pageUrl?: string
}

/**
 * Test filter options
 */
export interface TestFilterOptions {
  status?: TestStatus
  testType?: TestType
  search?: string
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number
  limit: number
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

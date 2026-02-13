/**
 * A/B Testing utility functions and types for admin pages
 */

import type {
  ABTest,
  ABVariant,
  ABTargetingRule,
  TestStatus,
  TestType,
  GoalEvent,
  AllocationMode,
  OptimizationMetric,
  ConditionField,
  ConditionOperator,
  TargetingAction,
  TargetingCondition,
} from '@cgk-platform/ab-testing'

// Re-export types for convenience
export type {
  ABTest,
  ABVariant,
  ABTargetingRule,
  TestStatus,
  TestType,
  GoalEvent,
  AllocationMode,
  OptimizationMetric,
  ConditionField,
  ConditionOperator,
  TargetingAction,
  TargetingCondition,
}

/**
 * Filter options for A/B test list
 */
export interface ABTestFilters {
  page: number
  limit: number
  offset: number
  status: TestStatus | ''
  testType: TestType | ''
  search: string
  sort: string
  dir: 'asc' | 'desc'
}

/**
 * Parse A/B test filters from search params
 */
export function parseABTestFilters(
  params: Record<string, string | string[] | undefined>
): ABTestFilters {
  const str = (val: string | string[] | undefined): string => {
    if (Array.isArray(val)) return val[0] || ''
    return val || ''
  }

  const page = Math.max(1, parseInt(str(params.page), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(str(params.limit), 10) || 20))

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    status: str(params.status) as TestStatus | '',
    testType: str(params.testType) as TestType | '',
    search: str(params.search),
    sort: str(params.sort) || 'created_at',
    dir: str(params.dir) === 'asc' ? 'asc' : 'desc',
  }
}

/**
 * Test status display configuration
 */
export const TEST_STATUS_CONFIG: Record<
  TestStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  running: {
    label: 'Running',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  paused: {
    label: 'Paused',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  completed: {
    label: 'Completed',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
}

/**
 * Test type display configuration
 */
export const TEST_TYPE_CONFIG: Record<TestType, { label: string; icon: string }> = {
  landing_page: { label: 'Landing Page', icon: 'Layout' },
  shipping: { label: 'Shipping', icon: 'Truck' },
  email: { label: 'Email', icon: 'Mail' },
  checkout: { label: 'Checkout', icon: 'CreditCard' },
  pricing: { label: 'Pricing', icon: 'DollarSign' },
}

/**
 * Goal event display configuration
 */
export const GOAL_EVENT_CONFIG: Record<GoalEvent, { label: string; description: string }> = {
  page_view: {
    label: 'Page View',
    description: 'Track when users view a page',
  },
  add_to_cart: {
    label: 'Add to Cart',
    description: 'Track when users add items to cart',
  },
  begin_checkout: {
    label: 'Begin Checkout',
    description: 'Track when users start checkout',
  },
  purchase: {
    label: 'Purchase',
    description: 'Track completed purchases',
  },
}

/**
 * Optimization metric display configuration
 */
export const METRIC_CONFIG: Record<OptimizationMetric, { label: string; description: string }> = {
  conversion_rate: {
    label: 'Conversion Rate',
    description: 'Optimize for higher conversion percentage',
  },
  revenue_per_visitor: {
    label: 'Revenue per Visitor',
    description: 'Optimize for higher revenue per visitor',
  },
  average_order_value: {
    label: 'Average Order Value',
    description: 'Optimize for higher average order value',
  },
}

/**
 * Confidence level options
 */
export const CONFIDENCE_LEVELS = [
  { value: 0.9, label: '90%', description: 'Faster results, higher risk of false positives' },
  { value: 0.95, label: '95%', description: 'Industry standard balance' },
  { value: 0.99, label: '99%', description: 'High confidence, slower results' },
]

/**
 * Targeting condition field options
 */
export const CONDITION_FIELDS: Array<{
  value: ConditionField
  label: string
  category: string
}> = [
  { value: 'url', label: 'URL', category: 'Page' },
  { value: 'referrer', label: 'Referrer', category: 'Traffic' },
  { value: 'utm_source', label: 'UTM Source', category: 'Traffic' },
  { value: 'utm_medium', label: 'UTM Medium', category: 'Traffic' },
  { value: 'utm_campaign', label: 'UTM Campaign', category: 'Traffic' },
  { value: 'device_type', label: 'Device Type', category: 'Device' },
  { value: 'browser', label: 'Browser', category: 'Device' },
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'region', label: 'Region/State', category: 'Geo' },
  { value: 'city', label: 'City', category: 'Geo' },
  { value: 'cookie', label: 'Cookie Value', category: 'Custom' },
  { value: 'query_param', label: 'Query Parameter', category: 'Custom' },
]

/**
 * Targeting condition operator options
 */
export const CONDITION_OPERATORS: Array<{
  value: ConditionOperator
  label: string
  supportsArray: boolean
}> = [
  { value: 'equals', label: 'Equals', supportsArray: false },
  { value: 'not_equals', label: 'Does not equal', supportsArray: false },
  { value: 'contains', label: 'Contains', supportsArray: false },
  { value: 'not_contains', label: 'Does not contain', supportsArray: false },
  { value: 'starts_with', label: 'Starts with', supportsArray: false },
  { value: 'ends_with', label: 'Ends with', supportsArray: false },
  { value: 'regex', label: 'Matches regex', supportsArray: false },
  { value: 'in', label: 'Is one of', supportsArray: true },
  { value: 'not_in', label: 'Is not one of', supportsArray: true },
  { value: 'greater_than', label: 'Greater than', supportsArray: false },
  { value: 'less_than', label: 'Less than', supportsArray: false },
]

/**
 * Test results summary
 */
export interface TestResultsSummary {
  testId: string
  isSignificant: boolean
  winnerVariantId: string | null
  currentProgress: number
  totalVisitors: number
  totalConversions: number
  totalRevenue: number
  confidenceLevel: number
  variants: VariantResult[]
}

/**
 * Variant result data
 */
export interface VariantResult {
  variantId: string
  variantName: string
  isControl: boolean
  isWinner: boolean
  visitors: number
  conversions: number
  conversionRate: number
  revenue: number
  revenuePerVisitor: number
  improvement: number | null
  pValue: number | null
  isSignificant: boolean
  confidenceInterval: { lower: number; upper: number } | null
}

/**
 * Quick stats for A/B tests
 */
export interface ABTestQuickStatsData {
  activeCount: number
  activeChange: number
  avgLift: number
  monthlyCount: number
  totalVisitors: number
}

/**
 * Data quality issue types
 */
export type QualityIssueType = 'srm' | 'novelty' | 'drift' | 'low_sample'

/**
 * Data quality issue
 */
export interface QualityIssue {
  testId: string
  testName: string
  type: QualityIssueType
  severity: 'low' | 'medium' | 'high'
  message: string
  detectedAt: Date
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a currency value from cents
 */
export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/**
 * Calculate days remaining until scheduled end
 */
export function getDaysRemaining(endDate: Date | string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Get test duration in days
 */
export function getTestDuration(
  startDate: Date | string | null,
  endDate: Date | string | null
): number | null {
  if (!startDate) return null
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Validate traffic allocations sum to 100
 */
export function validateAllocations(allocations: number[]): boolean {
  const sum = allocations.reduce((a, b) => a + b, 0)
  return Math.abs(sum - 100) < 0.01
}

/**
 * Generate evenly distributed allocations for n variants
 */
export function generateEvenAllocations(count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor(100 / count)
  const remainder = 100 - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

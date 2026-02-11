/**
 * A/B Testing Admin Types
 *
 * Extended types for the admin UI, building on @cgk/ab-testing types
 */

import type {
  ABTest,
  ABVariant,
  ABTargetingRule,
  TestStatus,
  TestType,
  GoalEvent,
  OptimizationMetric,
  AllocationMode,
  TargetingCondition,
  TargetingAction,
} from '@cgk/ab-testing'

export type {
  ABTest,
  ABVariant,
  ABTargetingRule,
  TestStatus,
  TestType,
  GoalEvent,
  OptimizationMetric,
  AllocationMode,
  TargetingCondition,
  TargetingAction,
}

/**
 * Variant result with statistics
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
  averageOrderValue: number
  improvement?: number
  pValue?: number
  isSignificant?: boolean
  confidenceInterval?: {
    lower: number
    upper: number
  }
}

/**
 * Test results summary
 */
export interface TestResults {
  testId: string
  testName: string
  status: TestStatus
  isSignificant: boolean
  confidenceLevel: number
  currentProgress: number
  totalVisitors: number
  totalConversions: number
  totalRevenue: number
  winnerVariantId?: string
  variants: VariantResult[]
  lastUpdated: Date
}

/**
 * Quick stats for the dashboard
 */
export interface ABTestQuickStatsData {
  activeCount: number
  activeChange: number
  avgLift: number
  monthlyCount: number
  totalVisitors: number
}

/**
 * Segment breakdown
 */
export interface SegmentData {
  segment: string
  value: string
  visitors: number
  conversions: number
  conversionRate: number
  revenue: number
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  date: string
  variantId: string
  variantName: string
  visitors: number
  conversions: number
  conversionRate: number
  revenue: number
  cumulativeVisitors: number
  cumulativeConversions: number
}

/**
 * Funnel step data
 */
export interface FunnelStep {
  step: string
  label: string
  variantId: string
  variantName: string
  count: number
  rate: number
  dropoff: number
}

/**
 * SRM (Sample Ratio Mismatch) analysis
 */
export interface SRMAnalysis {
  testId: string
  testName: string
  expectedRatio: Record<string, number>
  observedRatio: Record<string, number>
  chiSquare: number
  pValue: number
  hasSRM: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
  recommendation?: string
}

/**
 * Novelty effect analysis
 */
export interface NoveltyAnalysis {
  testId: string
  hasNoveltyEffect: boolean
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown'
  confidenceScore: number
  daysSinceStart: number
  recommendation?: string
}

/**
 * Population drift analysis
 */
export interface DriftAnalysis {
  testId: string
  hasDrift: boolean
  driftScore: number
  affectedSegments: string[]
  recommendation?: string
}

/**
 * Data quality overview
 */
export interface DataQualityOverview {
  testsWithIssues: number
  srmAlerts: number
  noveltyWarnings: number
  driftWarnings: number
  overallScore: number
}

/**
 * Guardrail configuration
 */
export interface Guardrail {
  id: string
  name: string
  metric: string
  threshold: number
  direction: 'above' | 'below'
  isTriggered: boolean
  currentValue?: number
}

/**
 * CUPED analysis result
 */
export interface CUPEDResult {
  variantId: string
  variantName: string
  rawEstimate: number
  cupedEstimate: number
  varianceReduction: number
  confidenceInterval: {
    lower: number
    upper: number
  }
}

/**
 * LTV tracking settings
 */
export interface LTVSettings {
  enabled: boolean
  trackingDays: number
  cohortSize: number
  lastUpdated?: Date
}

/**
 * Wizard step data
 */
export interface WizardStep1Data {
  name: string
  description: string
  testType: TestType
  hypothesis: string
  goalEvent: GoalEvent
  optimizationMetric: OptimizationMetric
  confidenceLevel: 0.9 | 0.95 | 0.99
  baseUrl: string
}

export interface WizardStep2Data {
  variants: Array<{
    name: string
    url?: string
    urlType?: 'static' | 'landing_page'
    landingPageId?: string
    trafficAllocation: number
    isControl: boolean
    shippingSuffix?: string
    shippingPriceCents?: number
  }>
  mode: AllocationMode
}

export interface WizardStep3Data {
  targetingRules: Array<{
    name: string
    conditions: TargetingCondition[]
    logic: 'and' | 'or'
    action: TargetingAction
    assignedVariantId?: string
  }>
  exclusionGroups: string[]
}

export interface WizardStep4Data {
  startOption: 'now' | 'scheduled'
  scheduledStartAt?: string
  endOption: 'manual' | 'scheduled' | 'auto_significance'
  scheduledEndAt?: string
  timezone: string
  guardrails: Guardrail[]
}

export interface WizardData {
  step1?: WizardStep1Data
  step2?: WizardStep2Data
  step3?: WizardStep3Data
  step4?: WizardStep4Data
}

/**
 * Template A/B test
 */
export interface TemplateABTest {
  id: string
  tenantId: string
  name: string
  description?: string
  status: TestStatus
  templateAId: string
  templateAName: string
  templateBId: string
  templateBName: string
  trafficAllocation: { a: number; b: number }
  metrics: {
    opens: { a: number; b: number }
    clicks: { a: number; b: number }
    conversions: { a: number; b: number }
  }
  isSignificant: boolean
  winner?: 'a' | 'b'
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
}

/**
 * Filter options for test list
 */
export interface ABTestFilters {
  status?: TestStatus
  testType?: TestType
  search?: string
  page?: number
  limit?: number
  sort?: string
  dir?: 'asc' | 'desc'
}

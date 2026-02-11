/**
 * LTV (Lifetime Value) Analysis
 *
 * Tracks long-term impact of A/B tests beyond immediate conversion.
 * Analyzes cohort performance at 30/60/90 days post-conversion.
 */

import { mean } from '../statistics/core.js'
import {
  bootstrapDifference,
  bootstrapConfidenceInterval,
} from '../statistics/bootstrap.js'

/**
 * LTV analysis result for a variant
 */
export interface LTVAnalysis {
  /** Variant ID */
  variant: string
  /** Whether this is the control variant */
  isControl: boolean
  /** Cohort start date (test start) */
  cohortDate: string
  /** Number of customers in cohort */
  cohortSize: number
  /** 30-day LTV */
  day30LTV: number
  /** 60-day LTV */
  day60LTV: number
  /** 90-day LTV */
  day90LTV: number
  /** Order counts by period */
  orderCount: {
    day30: number
    day60: number
    day90: number
  }
  /** Repurchase rates by period */
  repurchaseRate: {
    day30: number
    day60: number
    day90: number
  }
  /** Average order value by period */
  averageOrderValue: {
    day30: number
    day60: number
    day90: number
  }
  /** Confidence intervals for LTV */
  confidenceIntervals: {
    day30: { lower: number; upper: number }
    day60: { lower: number; upper: number }
    day90: { lower: number; upper: number }
  }
}

/**
 * Comparison of LTV between variants
 */
export interface LTVComparison {
  /** Control variant analysis */
  control: LTVAnalysis
  /** Variant analysis */
  variant: LTVAnalysis
  /** Lift at each period */
  lift: {
    day30: number
    day60: number
    day90: number
  }
  /** Statistical significance at each period */
  significant: {
    day30: boolean
    day60: boolean
    day90: boolean
  }
  /** P-values for each period */
  pValues: {
    day30: number
    day60: number
    day90: number
  }
  /** Whether long-term impact differs from short-term */
  longTermDifferent: boolean
  /** Summary message */
  message: string
}

/**
 * Customer data for LTV calculation
 */
export interface CustomerLTVData {
  /** Customer ID */
  customerId: string
  /** Variant they were assigned to */
  variantId: string
  /** First conversion date */
  firstConversionDate: Date
  /** All orders within analysis window */
  orders: Array<{
    orderId: string
    orderDate: Date
    amountCents: number
  }>
}

/**
 * Configuration for LTV analysis
 */
export interface LTVConfig {
  /** Analysis periods in days (default: [30, 60, 90]) */
  periods?: number[]
  /** Confidence level for intervals (default: 0.95) */
  confidenceLevel?: number
  /** Minimum cohort size for analysis (default: 30) */
  minimumCohortSize?: number
  /** Number of bootstrap samples (default: 5000) */
  bootstrapSamples?: number
}

/**
 * Calculate LTV for a cohort of customers
 *
 * @param customers - Array of customer data
 * @param variantId - Variant to analyze
 * @param testStartDate - Start date of the test
 * @param config - LTV configuration
 * @returns LTV analysis for the variant
 */
export function calculateLTV(
  customers: CustomerLTVData[],
  variantId: string,
  testStartDate: Date,
  config: LTVConfig = {}
): LTVAnalysis {
  const {
    periods = [30, 60, 90],
    confidenceLevel = 0.95,
    bootstrapSamples = 5000,
  } = config

  // Filter to variant
  const cohort = customers.filter((c) => c.variantId === variantId)
  const cohortSize = cohort.length

  if (cohortSize === 0) {
    return createEmptyLTVAnalysis(variantId, testStartDate)
  }

  // Calculate metrics for each period
  const ltvByPeriod: Record<number, number[]> = {}
  const orderCountByPeriod: Record<number, number[]> = {}
  const aovByPeriod: Record<number, number[]> = {}

  for (const period of periods) {
    ltvByPeriod[period] = []
    orderCountByPeriod[period] = []
    aovByPeriod[period] = []

    for (const customer of cohort) {
      const periodEnd = new Date(customer.firstConversionDate)
      periodEnd.setDate(periodEnd.getDate() + period)

      // Orders within period
      const periodOrders = customer.orders.filter(
        (o) => o.orderDate <= periodEnd
      )

      const totalRevenue = periodOrders.reduce(
        (sum, o) => sum + o.amountCents,
        0
      )
      const orderCount = periodOrders.length

      ltvByPeriod[period]!.push(totalRevenue / 100) // Convert cents to dollars
      orderCountByPeriod[period]!.push(orderCount)

      if (orderCount > 0) {
        aovByPeriod[period]!.push(totalRevenue / orderCount / 100)
      }
    }
  }

  // Calculate metrics
  const day30LTV = mean(ltvByPeriod[30] || [])
  const day60LTV = mean(ltvByPeriod[60] || [])
  const day90LTV = mean(ltvByPeriod[90] || [])

  const day30Orders = mean(orderCountByPeriod[30] || [])
  const day60Orders = mean(orderCountByPeriod[60] || [])
  const day90Orders = mean(orderCountByPeriod[90] || [])

  // Calculate repurchase rate (customers with 2+ orders / total customers)
  const day30Repurchase = calculateRepurchaseRate(orderCountByPeriod[30] || [])
  const day60Repurchase = calculateRepurchaseRate(orderCountByPeriod[60] || [])
  const day90Repurchase = calculateRepurchaseRate(orderCountByPeriod[90] || [])

  // Calculate AOV
  const day30AOV = mean(aovByPeriod[30] || [])
  const day60AOV = mean(aovByPeriod[60] || [])
  const day90AOV = mean(aovByPeriod[90] || [])

  // Bootstrap confidence intervals
  const ci30 = bootstrapConfidenceInterval(ltvByPeriod[30] || [], {
    confidenceLevel,
    numSamples: bootstrapSamples,
  })
  const ci60 = bootstrapConfidenceInterval(ltvByPeriod[60] || [], {
    confidenceLevel,
    numSamples: bootstrapSamples,
  })
  const ci90 = bootstrapConfidenceInterval(ltvByPeriod[90] || [], {
    confidenceLevel,
    numSamples: bootstrapSamples,
  })

  return {
    variant: variantId,
    isControl: false, // Set by caller
    cohortDate: testStartDate.toISOString().split('T')[0]!,
    cohortSize,
    day30LTV,
    day60LTV,
    day90LTV,
    orderCount: {
      day30: day30Orders,
      day60: day60Orders,
      day90: day90Orders,
    },
    repurchaseRate: {
      day30: day30Repurchase,
      day60: day60Repurchase,
      day90: day90Repurchase,
    },
    averageOrderValue: {
      day30: day30AOV,
      day60: day60AOV,
      day90: day90AOV,
    },
    confidenceIntervals: {
      day30: { lower: ci30.lowerBound, upper: ci30.upperBound },
      day60: { lower: ci60.lowerBound, upper: ci60.upperBound },
      day90: { lower: ci90.lowerBound, upper: ci90.upperBound },
    },
  }
}

/**
 * Calculate repurchase rate from order counts
 */
function calculateRepurchaseRate(orderCounts: number[]): number {
  if (orderCounts.length === 0) return 0
  const repurchasers = orderCounts.filter((c) => c >= 2).length
  return repurchasers / orderCounts.length
}

/**
 * Create empty LTV analysis for variant with no data
 */
function createEmptyLTVAnalysis(
  variantId: string,
  testStartDate: Date
): LTVAnalysis {
  return {
    variant: variantId,
    isControl: false,
    cohortDate: testStartDate.toISOString().split('T')[0]!,
    cohortSize: 0,
    day30LTV: 0,
    day60LTV: 0,
    day90LTV: 0,
    orderCount: { day30: 0, day60: 0, day90: 0 },
    repurchaseRate: { day30: 0, day60: 0, day90: 0 },
    averageOrderValue: { day30: 0, day60: 0, day90: 0 },
    confidenceIntervals: {
      day30: { lower: 0, upper: 0 },
      day60: { lower: 0, upper: 0 },
      day90: { lower: 0, upper: 0 },
    },
  }
}

/**
 * Compare LTV between control and variant
 *
 * @param customers - All customer data
 * @param controlId - Control variant ID
 * @param variantId - Treatment variant ID
 * @param testStartDate - Test start date
 * @param config - LTV configuration
 * @returns LTV comparison
 */
export function compareLTV(
  customers: CustomerLTVData[],
  controlId: string,
  variantId: string,
  testStartDate: Date,
  config: LTVConfig = {}
): LTVComparison {
  const { bootstrapSamples = 5000 } = config

  // Calculate LTV for each variant
  const controlAnalysis = calculateLTV(customers, controlId, testStartDate, config)
  controlAnalysis.isControl = true

  const variantAnalysis = calculateLTV(customers, variantId, testStartDate, config)

  // Calculate lift
  const lift = {
    day30: calculateLift(controlAnalysis.day30LTV, variantAnalysis.day30LTV),
    day60: calculateLift(controlAnalysis.day60LTV, variantAnalysis.day60LTV),
    day90: calculateLift(controlAnalysis.day90LTV, variantAnalysis.day90LTV),
  }

  // Bootstrap significance testing
  const controlCustomers = customers.filter((c) => c.variantId === controlId)
  const variantCustomers = customers.filter((c) => c.variantId === variantId)

  const controlLTV30 = getLTVArray(controlCustomers, 30)
  const variantLTV30 = getLTVArray(variantCustomers, 30)
  const controlLTV60 = getLTVArray(controlCustomers, 60)
  const variantLTV60 = getLTVArray(variantCustomers, 60)
  const controlLTV90 = getLTVArray(controlCustomers, 90)
  const variantLTV90 = getLTVArray(variantCustomers, 90)

  const diff30 = bootstrapDifference(controlLTV30, variantLTV30, {
    numSamples: bootstrapSamples,
  })
  const diff60 = bootstrapDifference(controlLTV60, variantLTV60, {
    numSamples: bootstrapSamples,
  })
  const diff90 = bootstrapDifference(controlLTV90, variantLTV90, {
    numSamples: bootstrapSamples,
  })

  // Significance if CI doesn't include 0
  const significant = {
    day30: diff30.lowerBound > 0 || diff30.upperBound < 0,
    day60: diff60.lowerBound > 0 || diff60.upperBound < 0,
    day90: diff90.lowerBound > 0 || diff90.upperBound < 0,
  }

  // Approximate p-values from bootstrap
  const pValues = {
    day30: calculateBootstrapPValue(diff30),
    day60: calculateBootstrapPValue(diff60),
    day90: calculateBootstrapPValue(diff90),
  }

  // Check if long-term differs from short-term
  const longTermDifferent =
    Math.sign(lift.day30) !== Math.sign(lift.day90) ||
    Math.abs(lift.day90 - lift.day30) > 10

  // Generate summary message
  const message = generateLTVMessage(lift, significant, longTermDifferent)

  return {
    control: controlAnalysis,
    variant: variantAnalysis,
    lift,
    significant,
    pValues,
    longTermDifferent,
    message,
  }
}

/**
 * Get LTV array for bootstrap
 */
function getLTVArray(customers: CustomerLTVData[], days: number): number[] {
  return customers.map((customer) => {
    const periodEnd = new Date(customer.firstConversionDate)
    periodEnd.setDate(periodEnd.getDate() + days)

    const periodOrders = customer.orders.filter((o) => o.orderDate <= periodEnd)
    return periodOrders.reduce((sum, o) => sum + o.amountCents, 0) / 100
  })
}

/**
 * Calculate lift percentage
 */
function calculateLift(control: number, variant: number): number {
  if (control === 0) return 0
  return ((variant - control) / control) * 100
}

/**
 * Calculate approximate p-value from bootstrap difference
 */
function calculateBootstrapPValue(diff: {
  lowerBound: number
  upperBound: number
  estimate: number
  standardError: number
}): number {
  // Approximate: if 0 is within CI, p > alpha
  // Use z-score approximation
  if (diff.standardError === 0) return 1

  const z = Math.abs(diff.estimate) / diff.standardError
  // Two-tailed p-value approximation
  return 2 * (1 - normalCDFApprox(z))
}

/**
 * Quick normal CDF approximation
 */
function normalCDFApprox(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

/**
 * Generate LTV comparison message
 */
function generateLTVMessage(
  lift: { day30: number; day60: number; day90: number },
  significant: { day30: boolean; day60: boolean; day90: boolean },
  longTermDifferent: boolean
): string {
  const parts: string[] = []

  if (significant.day30) {
    parts.push(`30-day LTV: ${lift.day30 > 0 ? '+' : ''}${lift.day30.toFixed(1)}% (significant)`)
  } else {
    parts.push(`30-day LTV: ${lift.day30 > 0 ? '+' : ''}${lift.day30.toFixed(1)}%`)
  }

  if (significant.day90) {
    parts.push(`90-day LTV: ${lift.day90 > 0 ? '+' : ''}${lift.day90.toFixed(1)}% (significant)`)
  } else {
    parts.push(`90-day LTV: ${lift.day90 > 0 ? '+' : ''}${lift.day90.toFixed(1)}%`)
  }

  if (longTermDifferent) {
    parts.push('Note: Long-term impact differs from short-term. Consider waiting for more data.')
  }

  return parts.join('. ')
}

/**
 * Check if enough time has passed for LTV analysis
 *
 * @param testEndDate - When the test ended
 * @param period - Analysis period in days (30, 60, or 90)
 * @returns Whether LTV analysis is available
 */
export function isLTVAnalysisAvailable(testEndDate: Date, period: number): boolean {
  const now = new Date()
  const daysSinceEnd = Math.floor(
    (now.getTime() - testEndDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysSinceEnd >= period
}

/**
 * Get available LTV periods for a test
 *
 * @param testEndDate - When the test ended
 * @returns Available periods (30, 60, and/or 90)
 */
export function getAvailableLTVPeriods(testEndDate: Date): number[] {
  const available: number[] = []
  for (const period of [30, 60, 90]) {
    if (isLTVAnalysisAvailable(testEndDate, period)) {
      available.push(period)
    }
  }
  return available
}

/**
 * LTV trend data point
 */
export interface LTVTrendPoint {
  day: number
  controlLTV: number
  variantLTV: number
  lift: number
}

/**
 * Calculate LTV trend over time
 *
 * @param customers - Customer data
 * @param controlId - Control variant ID
 * @param variantId - Treatment variant ID
 * @param maxDays - Maximum days to analyze (default 90)
 * @param interval - Day interval for data points (default 7)
 * @returns Array of LTV trend points
 */
export function calculateLTVTrend(
  customers: CustomerLTVData[],
  controlId: string,
  variantId: string,
  maxDays: number = 90,
  interval: number = 7
): LTVTrendPoint[] {
  const controlCustomers = customers.filter((c) => c.variantId === controlId)
  const variantCustomers = customers.filter((c) => c.variantId === variantId)

  const trend: LTVTrendPoint[] = []

  for (let day = interval; day <= maxDays; day += interval) {
    const controlLTVs = getLTVArray(controlCustomers, day)
    const variantLTVs = getLTVArray(variantCustomers, day)

    const controlLTV = mean(controlLTVs)
    const variantLTV = mean(variantLTVs)
    const lift = calculateLift(controlLTV, variantLTV)

    trend.push({
      day,
      controlLTV,
      variantLTV,
      lift,
    })
  }

  return trend
}

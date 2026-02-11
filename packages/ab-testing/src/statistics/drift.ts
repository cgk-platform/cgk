/**
 * Population Drift Detection
 *
 * Monitors for changes in visitor composition during a test.
 * Drift can invalidate results if the population in the latter part
 * of the test differs significantly from the early population.
 */

import { chiSquaredCDF, mean } from './core.js'

/**
 * Drift detection result
 */
export interface DriftResult {
  /** Whether significant drift was detected */
  detected: boolean
  /** Overall severity of drift */
  severity: 'none' | 'low' | 'medium' | 'high'
  /** Drift analysis for each dimension */
  dimensions: DriftDimension[]
  /** Overall drift score (0-1) */
  overallDriftScore: number
  /** Human-readable message */
  message: string
  /** Recommendations */
  recommendations: string[]
}

/**
 * Drift analysis for a single dimension
 */
export interface DriftDimension {
  /** Dimension name (e.g., 'device_type', 'country') */
  dimension: string
  /** Drift score for this dimension (0-1) */
  driftScore: number
  /** Distribution in early period */
  before: Record<string, number>
  /** Distribution in late period */
  after: Record<string, number>
  /** Whether drift is statistically significant */
  significant: boolean
  /** Chi-squared statistic */
  chiSquared: number
  /** P-value */
  pValue: number
  /** Categories with largest shifts */
  majorShifts: Array<{
    category: string
    beforePercent: number
    afterPercent: number
    shift: number
  }>
}

/**
 * Visitor data for drift detection
 */
export interface VisitorData {
  /** Visitor ID */
  visitorId: string
  /** Assignment timestamp */
  assignedAt: Date
  /** Device type */
  deviceType?: string
  /** Country code */
  country?: string
  /** UTM source */
  utmSource?: string
  /** UTM medium */
  utmMedium?: string
  /** Browser */
  browser?: string
  /** Operating system */
  os?: string
  /** Custom dimensions */
  customDimensions?: Record<string, string>
}

/**
 * Configuration for drift detection
 */
export interface DriftConfig {
  /** Significance level for drift detection (default 0.05) */
  significanceLevel?: number
  /** Dimensions to analyze (default: device_type, country, utmSource) */
  dimensions?: string[]
  /** What percentage of data to use for early period (default 0.25) */
  earlyPeriodPercent?: number
  /** What percentage of data to use for late period (default 0.25) */
  latePeriodPercent?: number
  /** Minimum samples per period (default 100) */
  minimumSamples?: number
}

/**
 * Detect population drift by comparing early vs late visitor composition
 *
 * @param visitors - Array of visitor data sorted by assignment time
 * @param config - Drift detection configuration
 * @returns Drift detection result
 */
export function detectDrift(
  visitors: VisitorData[],
  config: DriftConfig = {}
): DriftResult {
  const {
    significanceLevel = 0.05,
    dimensions = ['deviceType', 'country', 'utmSource'],
    earlyPeriodPercent = 0.25,
    latePeriodPercent = 0.25,
    minimumSamples = 100,
  } = config

  // Sort by assignment time
  const sorted = [...visitors].sort(
    (a, b) => a.assignedAt.getTime() - b.assignedAt.getTime()
  )

  const n = sorted.length

  // Check minimum sample size
  if (n < minimumSamples * 2) {
    return createInsufficientDataResult(n, minimumSamples * 2)
  }

  // Split into early and late periods
  const earlyCount = Math.floor(n * earlyPeriodPercent)
  const lateStart = n - Math.floor(n * latePeriodPercent)

  const earlyPeriod = sorted.slice(0, earlyCount)
  const latePeriod = sorted.slice(lateStart)

  // Analyze each dimension
  const dimensionResults: DriftDimension[] = []

  for (const dim of dimensions) {
    const dimResult = analyzeDimensionDrift(
      earlyPeriod,
      latePeriod,
      dim,
      significanceLevel
    )
    dimensionResults.push(dimResult)
  }

  // Calculate overall drift score
  const significantDrifts = dimensionResults.filter((d) => d.significant)
  const overallScore = mean(dimensionResults.map((d) => d.driftScore))

  // Determine severity
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none'
  if (significantDrifts.length >= 2 || overallScore > 0.7) {
    severity = 'high'
  } else if (significantDrifts.length === 1 || overallScore > 0.5) {
    severity = 'medium'
  } else if (overallScore > 0.3) {
    severity = 'low'
  }

  // Generate message and recommendations
  const { message, recommendations } = generateDriftMessage(
    severity,
    significantDrifts,
    dimensionResults
  )

  return {
    detected: significantDrifts.length > 0,
    severity,
    dimensions: dimensionResults,
    overallDriftScore: overallScore,
    message,
    recommendations,
  }
}

/**
 * Analyze drift for a single dimension
 */
function analyzeDimensionDrift(
  earlyPeriod: VisitorData[],
  latePeriod: VisitorData[],
  dimension: string,
  significanceLevel: number
): DriftDimension {
  // Get distributions
  const earlyDist = getDistribution(earlyPeriod, dimension)
  const lateDist = getDistribution(latePeriod, dimension)

  // Perform chi-squared test
  const { chiSquared, pValue } = chiSquaredTest(earlyDist, lateDist)

  // Calculate drift score (1 - pValue, clamped)
  const driftScore = Math.min(1, Math.max(0, 1 - pValue))

  // Find major shifts
  const majorShifts = findMajorShifts(earlyDist, lateDist)

  return {
    dimension,
    driftScore,
    before: earlyDist,
    after: lateDist,
    significant: pValue < significanceLevel,
    chiSquared,
    pValue,
    majorShifts,
  }
}

/**
 * Get distribution of values for a dimension
 */
function getDistribution(
  visitors: VisitorData[],
  dimension: string
): Record<string, number> {
  const counts: Record<string, number> = {}
  let total = 0

  for (const visitor of visitors) {
    let value: string | undefined

    // Get value based on dimension
    switch (dimension) {
      case 'deviceType':
        value = visitor.deviceType
        break
      case 'country':
        value = visitor.country
        break
      case 'utmSource':
        value = visitor.utmSource
        break
      case 'utmMedium':
        value = visitor.utmMedium
        break
      case 'browser':
        value = visitor.browser
        break
      case 'os':
        value = visitor.os
        break
      default:
        value = visitor.customDimensions?.[dimension]
    }

    const key = value || '(unknown)'
    counts[key] = (counts[key] || 0) + 1
    total++
  }

  // Convert to proportions
  const distribution: Record<string, number> = {}
  for (const [key, count] of Object.entries(counts)) {
    distribution[key] = total > 0 ? count / total : 0
  }

  return distribution
}

/**
 * Chi-squared test for comparing two distributions
 */
function chiSquaredTest(
  dist1: Record<string, number>,
  dist2: Record<string, number>
): { chiSquared: number; pValue: number; df: number } {
  // Get all unique categories
  const categoriesSet = new Set([...Object.keys(dist1), ...Object.keys(dist2)])
  const categories = Array.from(categoriesSet)

  // Calculate chi-squared
  let chiSquared = 0
  let validCategories = 0

  for (const category of categories) {
    const p1 = dist1[category] || 0
    const p2 = dist2[category] || 0

    // Pool the expected proportion
    const pooled = (p1 + p2) / 2

    // Only include if expected > 0
    if (pooled > 0) {
      chiSquared += Math.pow(p1 - pooled, 2) / pooled
      chiSquared += Math.pow(p2 - pooled, 2) / pooled
      validCategories++
    }
  }

  // Degrees of freedom
  const df = Math.max(1, validCategories - 1)

  // P-value
  const pValue = 1 - chiSquaredCDF(chiSquared, df)

  return { chiSquared, pValue, df }
}

/**
 * Find categories with the largest distribution shifts
 */
function findMajorShifts(
  before: Record<string, number>,
  after: Record<string, number>
): Array<{
  category: string
  beforePercent: number
  afterPercent: number
  shift: number
}> {
  const categoriesSet = new Set([...Object.keys(before), ...Object.keys(after)])
  const categories = Array.from(categoriesSet)
  const shifts: Array<{
    category: string
    beforePercent: number
    afterPercent: number
    shift: number
  }> = []

  for (const category of categories) {
    const beforePercent = (before[category] || 0) * 100
    const afterPercent = (after[category] || 0) * 100
    const shift = afterPercent - beforePercent

    if (Math.abs(shift) > 1) {
      // Only report shifts > 1 percentage point
      shifts.push({
        category,
        beforePercent,
        afterPercent,
        shift,
      })
    }
  }

  // Sort by absolute shift descending
  shifts.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))

  return shifts.slice(0, 5) // Top 5 shifts
}

/**
 * Generate message and recommendations
 */
function generateDriftMessage(
  severity: 'none' | 'low' | 'medium' | 'high',
  significantDrifts: DriftDimension[],
  _allDimensions: DriftDimension[]
): { message: string; recommendations: string[] } {
  const recommendations: string[] = []

  if (severity === 'high') {
    const driftDims = significantDrifts.map((d) => d.dimension).join(', ')

    recommendations.push('HIGH SEVERITY: Significant population drift detected.')
    recommendations.push(
      'Results may not generalize to the overall population.'
    )
    recommendations.push('Consider:')
    recommendations.push('  - Segmenting analysis by drifting dimensions')
    recommendations.push('  - Extending the test to collect more stable data')
    recommendations.push('  - Investigating external factors (campaigns, seasonality)')
    recommendations.push(
      '  - Using only data from the stable period for final analysis'
    )

    for (const drift of significantDrifts) {
      if (drift.majorShifts.length > 0) {
        const shift = drift.majorShifts[0]!
        recommendations.push(
          `  - ${drift.dimension}: "${shift.category}" shifted from ${shift.beforePercent.toFixed(1)}% to ${shift.afterPercent.toFixed(1)}%`
        )
      }
    }

    return {
      message: `Significant drift detected in ${driftDims}. Results may not generalize.`,
      recommendations,
    }
  }

  if (severity === 'medium') {
    const driftDim = significantDrifts[0]?.dimension || 'unknown'

    recommendations.push('MODERATE: Some population drift detected.')
    recommendations.push('Consider segmented analysis to verify results hold.')
    recommendations.push('Monitor for continued drift.')

    return {
      message: `Moderate drift in ${driftDim}. Consider segmented analysis.`,
      recommendations,
    }
  }

  if (severity === 'low') {
    recommendations.push('Minor drift detected but within acceptable range.')
    recommendations.push('Continue monitoring.')

    return {
      message: 'Minor population drift detected. Results are likely still valid.',
      recommendations,
    }
  }

  return {
    message: 'Population composition is stable. No significant drift detected.',
    recommendations: [],
  }
}

/**
 * Create result for insufficient data
 */
function createInsufficientDataResult(current: number, required: number): DriftResult {
  return {
    detected: false,
    severity: 'none',
    dimensions: [],
    overallDriftScore: 0,
    message: `Insufficient data (${current}/${required} visitors)`,
    recommendations: ['Wait for more data before analyzing drift.'],
  }
}

/**
 * Detect time-based drift (changes in when visitors arrive)
 */
export function detectTimeDrift(
  visitors: VisitorData[]
): {
  detected: boolean
  weekdayDistributionChanged: boolean
  hourDistributionChanged: boolean
  message: string
} {
  if (visitors.length < 100) {
    return {
      detected: false,
      weekdayDistributionChanged: false,
      hourDistributionChanged: false,
      message: 'Insufficient data for time drift analysis',
    }
  }

  // Sort by time
  const sorted = [...visitors].sort(
    (a, b) => a.assignedAt.getTime() - b.assignedAt.getTime()
  )

  const n = sorted.length
  const earlyPeriod = sorted.slice(0, Math.floor(n * 0.25))
  const latePeriod = sorted.slice(-Math.floor(n * 0.25))

  // Analyze weekday distribution
  const earlyWeekdays = getWeekdayDistribution(earlyPeriod)
  const lateWeekdays = getWeekdayDistribution(latePeriod)
  const weekdayTest = chiSquaredTest(earlyWeekdays, lateWeekdays)

  // Analyze hour distribution
  const earlyHours = getHourDistribution(earlyPeriod)
  const lateHours = getHourDistribution(latePeriod)
  const hourTest = chiSquaredTest(earlyHours, lateHours)

  const weekdayChanged = weekdayTest.pValue < 0.05
  const hourChanged = hourTest.pValue < 0.05
  const detected = weekdayChanged || hourChanged

  let message = 'No significant time-based drift detected.'
  if (weekdayChanged && hourChanged) {
    message =
      'Both day-of-week and hour-of-day distributions have changed significantly.'
  } else if (weekdayChanged) {
    message = 'Day-of-week distribution has changed significantly.'
  } else if (hourChanged) {
    message = 'Hour-of-day distribution has changed significantly.'
  }

  return {
    detected,
    weekdayDistributionChanged: weekdayChanged,
    hourDistributionChanged: hourChanged,
    message,
  }
}

/**
 * Get weekday distribution
 */
function getWeekdayDistribution(visitors: VisitorData[]): Record<string, number> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
  const counts: Record<string, number> = {}
  days.forEach((d) => (counts[d] = 0))

  for (const v of visitors) {
    const dayIndex = v.assignedAt.getDay()
    const day = days[dayIndex]
    if (day !== undefined) {
      counts[day] = (counts[day] ?? 0) + 1
    }
  }

  const total = visitors.length
  for (const day of days) {
    counts[day] = total > 0 ? counts[day]! / total : 0
  }

  return counts
}

/**
 * Get hour distribution (bucketed into 4-hour blocks)
 */
function getHourDistribution(visitors: VisitorData[]): Record<string, number> {
  const buckets = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'] as const
  const counts: Record<string, number> = {}
  buckets.forEach((b) => (counts[b] = 0))

  for (const v of visitors) {
    const hour = v.assignedAt.getHours()
    const bucketIdx = Math.floor(hour / 4)
    const bucket = buckets[bucketIdx]
    if (bucket !== undefined) {
      counts[bucket] = (counts[bucket] ?? 0) + 1
    }
  }

  const total = visitors.length
  for (const bucket of buckets) {
    counts[bucket] = total > 0 ? counts[bucket]! / total : 0
  }

  return counts
}

/**
 * SRM (Sample Ratio Mismatch) Detection
 *
 * Detects when the actual traffic split differs significantly from
 * the expected ratio. SRM indicates a bug in the assignment logic
 * and invalidates test results.
 */

import { chiSquaredCDF } from './core.js'

/**
 * SRM detection result
 */
export interface SRMResult {
  /** Whether SRM was detected */
  detected: boolean
  /** Chi-squared test statistic */
  chiSquared: number
  /** P-value from chi-squared test */
  pValue: number
  /** Expected ratio for each variant */
  expectedRatio: Record<string, number>
  /** Observed ratio for each variant */
  observedRatio: Record<string, number>
  /** Deviation from expected (percentage points) */
  deviation: Record<string, number>
  /** Severity of the mismatch */
  severity: 'none' | 'warning' | 'critical'
  /** Human-readable message */
  message: string
  /** Recommendations for addressing SRM */
  recommendations: string[]
}

/**
 * Variant data for SRM detection
 */
export interface SRMVariantData {
  /** Variant ID */
  id: string
  /** Expected allocation percentage (0-100) */
  expectedAllocation: number
  /** Observed visitor count */
  observedVisitors: number
}

/**
 * Configuration for SRM detection
 */
export interface SRMConfig {
  /** Significance level for warning (default 0.05) */
  warningThreshold?: number
  /** Significance level for critical (default 0.001) */
  criticalThreshold?: number
  /** Minimum sample size to perform test (default 100) */
  minimumSampleSize?: number
}

/**
 * Detect Sample Ratio Mismatch using chi-squared test
 *
 * Tests whether the observed traffic split differs significantly
 * from the expected allocation ratios.
 *
 * @param variants - Array of variant data with expected and observed counts
 * @param config - SRM detection configuration
 * @returns SRM detection result
 */
export function detectSRM(
  variants: SRMVariantData[],
  config: SRMConfig = {}
): SRMResult {
  const {
    warningThreshold = 0.05,
    criticalThreshold = 0.001,
    minimumSampleSize = 100,
  } = config

  // Validate inputs
  if (variants.length < 2) {
    return createNullResult('At least 2 variants required for SRM detection')
  }

  // Calculate totals
  const totalVisitors = variants.reduce((sum, v) => sum + v.observedVisitors, 0)
  const totalAllocation = variants.reduce((sum, v) => sum + v.expectedAllocation, 0)

  // Check minimum sample size
  if (totalVisitors < minimumSampleSize) {
    return createNullResult(
      `Insufficient data (${totalVisitors}/${minimumSampleSize} visitors)`
    )
  }

  // Normalize allocations if they don't sum to 100
  const normalizedAllocations = variants.map((v) => ({
    ...v,
    normalizedAllocation: v.expectedAllocation / totalAllocation,
  }))

  // Calculate chi-squared statistic
  let chiSquared = 0
  const expectedRatio: Record<string, number> = {}
  const observedRatio: Record<string, number> = {}
  const deviation: Record<string, number> = {}

  for (const v of normalizedAllocations) {
    const expected = v.normalizedAllocation * totalVisitors
    const observed = v.observedVisitors

    // Avoid division by zero
    if (expected > 0) {
      chiSquared += Math.pow(observed - expected, 2) / expected
    }

    expectedRatio[v.id] = v.normalizedAllocation
    observedRatio[v.id] = totalVisitors > 0 ? observed / totalVisitors : 0
    deviation[v.id] = (observedRatio[v.id]! - expectedRatio[v.id]!) * 100
  }

  // Degrees of freedom = k - 1
  const df = variants.length - 1
  const pValue = 1 - chiSquaredCDF(chiSquared, df)

  // Determine severity
  let severity: 'none' | 'warning' | 'critical' = 'none'
  if (pValue < criticalThreshold) {
    severity = 'critical'
  } else if (pValue < warningThreshold) {
    severity = 'warning'
  }

  // Generate message and recommendations
  const { message, recommendations } = generateSRMMessage(
    severity,
    pValue,
    deviation,
    variants
  )

  return {
    detected: pValue < warningThreshold,
    chiSquared,
    pValue,
    expectedRatio,
    observedRatio,
    deviation,
    severity,
    message,
    recommendations,
  }
}

/**
 * Generate human-readable message and recommendations
 */
function generateSRMMessage(
  severity: 'none' | 'warning' | 'critical',
  pValue: number,
  deviation: Record<string, number>,
  variants: SRMVariantData[]
): { message: string; recommendations: string[] } {
  const recommendations: string[] = []

  if (severity === 'critical') {
    // Find the variant with the largest deviation
    const maxDeviation = Math.max(...Object.values(deviation).map(Math.abs))
    const mostAffectedVariant = Object.entries(deviation).find(
      ([, d]) => Math.abs(d) === maxDeviation
    )?.[0]

    recommendations.push(
      'CRITICAL: Stop the test immediately. Results are invalid.'
    )
    recommendations.push('Investigate the following potential causes:')
    recommendations.push('  - Bug in assignment logic or hashing algorithm')
    recommendations.push('  - Bot or crawler traffic affecting specific variants')
    recommendations.push('  - Caching issues causing incorrect assignment persistence')
    recommendations.push('  - Redirect loops or errors on specific variant URLs')
    recommendations.push('  - Ad blockers or browser extensions affecting tracking')

    if (mostAffectedVariant) {
      const variant = variants.find((v) => v.id === mostAffectedVariant)
      if (variant) {
        recommendations.push(
          `Focus investigation on variant "${variant.id}" which has ${Math.abs(deviation[mostAffectedVariant]!).toFixed(2)}pp deviation.`
        )
      }
    }

    return {
      message: `CRITICAL: Traffic split significantly differs from expected (p=${pValue.toExponential(2)}). Test results are INVALID.`,
      recommendations,
    }
  }

  if (severity === 'warning') {
    recommendations.push('WARNING: Traffic imbalance detected.')
    recommendations.push('Continue monitoring but investigate if imbalance grows.')
    recommendations.push('Check for:')
    recommendations.push('  - Bot traffic patterns')
    recommendations.push('  - Geographic or device-specific issues')
    recommendations.push('  - Recent code deployments')

    return {
      message: `WARNING: Slight traffic imbalance detected (p=${pValue.toFixed(4)}). Monitor closely.`,
      recommendations,
    }
  }

  return {
    message: 'Traffic split is within expected range. No SRM detected.',
    recommendations: [],
  }
}

/**
 * Create a null result when SRM test cannot be performed
 */
function createNullResult(reason: string): SRMResult {
  return {
    detected: false,
    chiSquared: 0,
    pValue: 1,
    expectedRatio: {},
    observedRatio: {},
    deviation: {},
    severity: 'none',
    message: reason,
    recommendations: [],
  }
}

/**
 * Calculate expected visitors per variant
 *
 * @param totalVisitors - Total expected visitors
 * @param allocations - Map of variant ID to allocation percentage
 * @returns Map of variant ID to expected visitors
 */
export function calculateExpectedVisitors(
  totalVisitors: number,
  allocations: Record<string, number>
): Record<string, number> {
  const totalAllocation = Object.values(allocations).reduce((a, b) => a + b, 0)
  const expected: Record<string, number> = {}

  for (const [variantId, allocation] of Object.entries(allocations)) {
    expected[variantId] = (allocation / totalAllocation) * totalVisitors
  }

  return expected
}

/**
 * Check if SRM is improving or worsening over time
 *
 * @param dailySRMResults - Array of daily SRM results
 * @returns Trend analysis
 */
export function analyzeSRMTrend(
  dailySRMResults: Array<{ date: string; pValue: number }>
): {
  trend: 'improving' | 'worsening' | 'stable'
  recentPValue: number
  pValueChange: number
} {
  if (dailySRMResults.length < 2) {
    return {
      trend: 'stable',
      recentPValue: dailySRMResults[0]?.pValue ?? 1,
      pValueChange: 0,
    }
  }

  // Sort by date descending
  const sorted = [...dailySRMResults].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const recentPValue = sorted[0]!.pValue
  const oldestPValue = sorted[sorted.length - 1]!.pValue
  const pValueChange = recentPValue - oldestPValue

  // Determine trend
  let trend: 'improving' | 'worsening' | 'stable' = 'stable'

  if (pValueChange > 0.05 && recentPValue > 0.05) {
    // p-value increased and now above threshold = improving
    trend = 'improving'
  } else if (pValueChange < -0.05 || recentPValue < 0.01) {
    // p-value decreased significantly = worsening
    trend = 'worsening'
  }

  return {
    trend,
    recentPValue,
    pValueChange,
  }
}

/**
 * SRM check for specific segments
 *
 * Checks if SRM exists for specific user segments (e.g., mobile vs desktop)
 *
 * @param segments - Map of segment name to variant data
 * @param config - SRM configuration
 * @returns SRM results by segment
 */
export function detectSegmentSRM(
  segments: Record<string, SRMVariantData[]>,
  config: SRMConfig = {}
): Record<string, SRMResult> {
  const results: Record<string, SRMResult> = {}

  for (const [segmentName, variants] of Object.entries(segments)) {
    results[segmentName] = detectSRM(variants, config)
  }

  return results
}

/**
 * Common SRM patterns and their likely causes
 */
export const SRM_PATTERNS = {
  CONSISTENT_BIAS: {
    pattern: 'One variant consistently receives more traffic',
    causes: [
      'Assignment algorithm bias',
      'Caching of variant assignments',
      'Bot traffic targeting specific URLs',
    ],
  },
  VARIANT_ZERO_BIAS: {
    pattern: 'Control variant has significantly more traffic',
    causes: [
      'Redirect failures for treatment variants',
      'JavaScript errors on treatment pages',
      'Default fallback to control on errors',
    ],
  },
  MOBILE_ONLY: {
    pattern: 'SRM only appears on mobile traffic',
    causes: [
      'Mobile-specific rendering issues',
      'App traffic not properly assigned',
      'Mobile bots affecting counts',
    ],
  },
  SPECIFIC_SOURCE: {
    pattern: 'SRM only appears for specific traffic sources',
    causes: [
      'UTM parameter handling issues',
      'Landing page misconfigurations',
      'Affiliate traffic routing',
    ],
  },
} as const

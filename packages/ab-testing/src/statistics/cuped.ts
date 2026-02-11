/**
 * CUPED (Controlled-experiment Using Pre-Experiment Data)
 *
 * Variance reduction technique that uses pre-experiment behavior as a
 * covariate to reduce noise and accelerate time-to-significance.
 * Can reduce variance by 20-50% for correlated metrics.
 */

import { mean, variance, covariance, correlation } from './core.js'

/**
 * CUPED adjustment result
 */
export interface CUPEDResult {
  /** Adjusted metric value */
  adjustedMetric: number
  /** Percentage reduction in variance */
  varianceReduction: number
  /** Name of the covariate used */
  covariate: string
  /** Correlation between covariate and metric */
  covariateCorrelation: number
  /** Original variance before adjustment */
  originalVariance: number
  /** Adjusted variance after CUPED */
  adjustedVariance: number
  /** Theta coefficient used for adjustment */
  theta: number
  /** Whether CUPED was applied (requires sufficient correlation) */
  applied: boolean
}

/**
 * Visitor pre-experiment data for CUPED
 */
export interface PreExperimentData {
  /** Visitor ID */
  visitorId: string
  /** Revenue in pre-experiment period */
  revenue: number
  /** Number of sessions in pre-experiment period */
  sessions: number
  /** Number of purchases in pre-experiment period */
  purchases: number
  /** Page views in pre-experiment period */
  pageViews: number
}

/**
 * Configuration for CUPED analysis
 */
export interface CUPEDConfig {
  /** Minimum correlation required to apply CUPED (default 0.1) */
  minCorrelation?: number
  /** Lookback period in days for pre-experiment data (default 14) */
  lookbackDays?: number
  /** Which covariate to use */
  covariate?: 'revenue' | 'sessions' | 'purchases' | 'pageViews'
}

/**
 * Apply CUPED variance reduction to experiment metrics
 *
 * Uses the formula: Y_adjusted = Y - theta * (X - E[X])
 * Where theta = Cov(X,Y) / Var(X)
 *
 * @param experimentMetric - Array of metric values during experiment
 * @param preExperimentMetric - Array of same metric before experiment (same visitors, same order)
 * @param config - CUPED configuration
 * @returns CUPED result with adjusted values and statistics
 */
export function applyCUPED(
  experimentMetric: number[],
  preExperimentMetric: number[],
  config: CUPEDConfig = {}
): CUPEDResult {
  const { minCorrelation = 0.1, covariate = 'pre_experiment_metric' } = config

  // Validate input lengths match
  if (experimentMetric.length !== preExperimentMetric.length) {
    throw new Error('Experiment and pre-experiment arrays must have same length')
  }

  if (experimentMetric.length < 3) {
    return {
      adjustedMetric: mean(experimentMetric),
      varianceReduction: 0,
      covariate,
      covariateCorrelation: 0,
      originalVariance: variance(experimentMetric),
      adjustedVariance: variance(experimentMetric),
      theta: 0,
      applied: false,
    }
  }

  // Calculate statistics
  const covXY = covariance(preExperimentMetric, experimentMetric)
  const varX = variance(preExperimentMetric)
  const meanX = mean(preExperimentMetric)
  const corr = correlation(preExperimentMetric, experimentMetric)

  // Check if correlation is sufficient
  if (Math.abs(corr) < minCorrelation || varX === 0) {
    return {
      adjustedMetric: mean(experimentMetric),
      varianceReduction: 0,
      covariate,
      covariateCorrelation: corr,
      originalVariance: variance(experimentMetric),
      adjustedVariance: variance(experimentMetric),
      theta: 0,
      applied: false,
    }
  }

  // Optimal theta coefficient
  const theta = covXY / varX

  // Apply CUPED adjustment: Y_adjusted = Y - theta * (X - E[X])
  const adjustedValues = experimentMetric.map((y, i) =>
    y - theta * (preExperimentMetric[i]! - meanX)
  )

  // Calculate variance reduction
  const originalVar = variance(experimentMetric)
  const adjustedVar = variance(adjustedValues)
  const varianceReduction =
    originalVar > 0 ? ((originalVar - adjustedVar) / originalVar) * 100 : 0

  return {
    adjustedMetric: mean(adjustedValues),
    varianceReduction: Math.max(0, varianceReduction),
    covariate,
    covariateCorrelation: corr,
    originalVariance: originalVar,
    adjustedVariance: adjustedVar,
    theta,
    applied: true,
  }
}

/**
 * Apply CUPED to compare two groups (control vs variant)
 *
 * @param controlExperiment - Control group experiment metrics
 * @param controlPreExperiment - Control group pre-experiment metrics
 * @param variantExperiment - Variant group experiment metrics
 * @param variantPreExperiment - Variant group pre-experiment metrics
 * @param config - CUPED configuration
 * @returns Adjusted difference and statistics
 */
export function applyCUPEDComparison(
  controlExperiment: number[],
  controlPreExperiment: number[],
  variantExperiment: number[],
  variantPreExperiment: number[],
  config: CUPEDConfig = {}
): {
  adjustedDifference: number
  originalDifference: number
  controlCUPED: CUPEDResult
  variantCUPED: CUPEDResult
  combinedVarianceReduction: number
} {
  // Calculate CUPED for each group
  const controlCUPED = applyCUPED(controlExperiment, controlPreExperiment, config)
  const variantCUPED = applyCUPED(variantExperiment, variantPreExperiment, config)

  // Original difference (without CUPED)
  const originalDifference = mean(variantExperiment) - mean(controlExperiment)

  // Adjusted difference (with CUPED)
  const adjustedDifference = variantCUPED.adjustedMetric - controlCUPED.adjustedMetric

  // Combined variance reduction (weighted average by sample size)
  const totalSamples = controlExperiment.length + variantExperiment.length
  const combinedVarianceReduction =
    (controlCUPED.varianceReduction * controlExperiment.length +
      variantCUPED.varianceReduction * variantExperiment.length) /
    totalSamples

  return {
    adjustedDifference,
    originalDifference,
    controlCUPED,
    variantCUPED,
    combinedVarianceReduction,
  }
}

/**
 * Calculate adjusted values for all visitors in a group
 *
 * @param experimentMetrics - Map of visitorId -> experiment metric
 * @param preExperimentMetrics - Map of visitorId -> pre-experiment metric
 * @param config - CUPED configuration
 * @returns Map of visitorId -> adjusted metric, plus CUPED statistics
 */
export function calculateAdjustedValues(
  experimentMetrics: Map<string, number>,
  preExperimentMetrics: Map<string, number>,
  config: CUPEDConfig = {}
): {
  adjustedValues: Map<string, number>
  cupedResult: CUPEDResult
} {
  // Get visitors that appear in both maps
  const commonVisitors = Array.from(experimentMetrics.keys()).filter((v) =>
    preExperimentMetrics.has(v)
  )

  if (commonVisitors.length === 0) {
    return {
      adjustedValues: new Map(),
      cupedResult: {
        adjustedMetric: 0,
        varianceReduction: 0,
        covariate: config.covariate || 'pre_experiment_metric',
        covariateCorrelation: 0,
        originalVariance: 0,
        adjustedVariance: 0,
        theta: 0,
        applied: false,
      },
    }
  }

  // Build aligned arrays
  const expArray: number[] = []
  const preExpArray: number[] = []

  for (const visitorId of commonVisitors) {
    expArray.push(experimentMetrics.get(visitorId)!)
    preExpArray.push(preExperimentMetrics.get(visitorId)!)
  }

  // Apply CUPED to get theta
  const cupedResult = applyCUPED(expArray, preExpArray, config)

  // Calculate adjusted values for all visitors
  const adjustedValues = new Map<string, number>()
  const meanX = mean(preExpArray)

  for (let i = 0; i < commonVisitors.length; i++) {
    const visitorId = commonVisitors[i]!
    const y = expArray[i]!
    const x = preExpArray[i]!

    if (cupedResult.applied) {
      adjustedValues.set(visitorId, y - cupedResult.theta * (x - meanX))
    } else {
      adjustedValues.set(visitorId, y)
    }
  }

  return { adjustedValues, cupedResult }
}

/**
 * Select the best covariate for CUPED based on correlation
 *
 * @param experimentMetric - Experiment metric values
 * @param covariates - Map of covariate name -> values (aligned with experiment)
 * @returns Best covariate name and its correlation
 */
export function selectBestCovariate(
  experimentMetric: number[],
  covariates: Record<string, number[]>
): { covariate: string; correlation: number } | null {
  let bestCovariate: string | null = null
  let bestCorrelation = 0

  for (const [name, values] of Object.entries(covariates)) {
    if (values.length !== experimentMetric.length) continue

    const corr = Math.abs(correlation(values, experimentMetric))
    if (corr > bestCorrelation) {
      bestCorrelation = corr
      bestCovariate = name
    }
  }

  if (!bestCovariate) return null

  return { covariate: bestCovariate, correlation: bestCorrelation }
}

/**
 * Estimate variance reduction before running experiment
 *
 * Uses historical data to estimate how much CUPED will reduce variance.
 * Useful for determining if CUPED is worth implementing.
 *
 * @param historicalMetric - Historical metric values
 * @param lagDays - Number of days to use as lag (default 14)
 * @returns Estimated variance reduction percentage
 */
export function estimateVarianceReduction(
  historicalMetric: number[],
  lagDays: number = 14
): number {
  if (historicalMetric.length <= lagDays) {
    return 0
  }

  // Split into "pre" and "post" periods
  const preMetric = historicalMetric.slice(0, -lagDays)
  const postMetric = historicalMetric.slice(lagDays)

  // Align arrays (use overlapping portion)
  const n = Math.min(preMetric.length, postMetric.length)
  const pre = preMetric.slice(-n)
  const post = postMetric.slice(0, n)

  // Calculate correlation
  const corr = correlation(pre, post)

  // Variance reduction is approximately r^2
  return Math.pow(corr, 2) * 100
}

/**
 * Generate CUPED report with recommendations
 */
export interface CUPEDReport {
  /** Whether CUPED should be used */
  recommended: boolean
  /** Estimated variance reduction */
  estimatedVarianceReduction: number
  /** Expected sample size reduction */
  sampleSizeReduction: number
  /** Best covariate to use */
  bestCovariate: string
  /** Correlation with experiment metric */
  correlation: number
  /** Minimum recommended correlation */
  minimumRecommendedCorrelation: number
  /** Recommendations */
  recommendations: string[]
}

/**
 * Generate a CUPED recommendation report
 *
 * @param experimentMetric - Experiment metric values
 * @param preExperimentMetric - Pre-experiment metric values
 * @param config - CUPED configuration
 * @returns Recommendation report
 */
export function generateCUPEDReport(
  experimentMetric: number[],
  preExperimentMetric: number[],
  config: CUPEDConfig = {}
): CUPEDReport {
  const minCorrelation = config.minCorrelation || 0.1
  const corr = correlation(preExperimentMetric, experimentMetric)
  const absCorr = Math.abs(corr)

  // Estimated variance reduction (r^2)
  const estimatedVarianceReduction = Math.pow(corr, 2) * 100

  // Sample size reduction (1 / (1 - r^2))
  const sampleSizeReduction =
    absCorr > 0 ? (1 - 1 / (1 / (1 - Math.pow(corr, 2)))) * 100 : 0

  const recommendations: string[] = []

  if (absCorr < 0.1) {
    recommendations.push(
      'Correlation is very low. CUPED will provide minimal benefit.'
    )
    recommendations.push('Consider using a different covariate with higher correlation.')
  } else if (absCorr < 0.3) {
    recommendations.push('Correlation is moderate. CUPED will provide some benefit.')
    recommendations.push(
      `Expected variance reduction: ${estimatedVarianceReduction.toFixed(1)}%`
    )
  } else if (absCorr < 0.5) {
    recommendations.push('Good correlation. CUPED is recommended.')
    recommendations.push(
      `Expected variance reduction: ${estimatedVarianceReduction.toFixed(1)}%`
    )
  } else {
    recommendations.push('Excellent correlation. CUPED is highly recommended.')
    recommendations.push(
      `Expected variance reduction: ${estimatedVarianceReduction.toFixed(1)}%`
    )
    recommendations.push(
      `This could reduce required sample size by approximately ${sampleSizeReduction.toFixed(0)}%`
    )
  }

  return {
    recommended: absCorr >= minCorrelation,
    estimatedVarianceReduction,
    sampleSizeReduction,
    bestCovariate: config.covariate || 'pre_experiment_metric',
    correlation: corr,
    minimumRecommendedCorrelation: minCorrelation,
    recommendations,
  }
}

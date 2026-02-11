/**
 * Novelty Effect Detection
 *
 * Identifies if early lift is temporary due to users reacting to
 * newness rather than actual value. Fits exponential decay model
 * to detect lift degradation over time.
 */

import { mean, standardDeviation } from './core.js'

/**
 * Novelty effect detection result
 */
export interface NoveltyResult {
  /** Whether novelty effect was detected */
  detected: boolean
  /** Rate of lift decay (higher = faster decay) */
  decayRate: number
  /** Projected long-term stabilized lift */
  stabilizedLift: number
  /** Current observed lift */
  currentLift: number
  /** Initial lift at start of test */
  initialLift: number
  /** Confidence in stability assessment (0-1 based on R^2) */
  confidenceInStability: number
  /** Days until lift is expected to stabilize */
  daysToStabilize: number | null
  /** Human-readable message */
  message: string
  /** Recommendation for action */
  recommendation: string
  /** Fit statistics */
  fitStatistics: {
    r2: number
    rmse: number
    mape: number
  }
}

/**
 * Daily data for novelty detection
 */
export interface DailyLiftData {
  /** Date string (YYYY-MM-DD) */
  date: string
  /** Control group data */
  control: {
    visitors: number
    conversions: number
  }
  /** Variant group data */
  variant: {
    visitors: number
    conversions: number
  }
}

/**
 * Configuration for novelty detection
 */
export interface NoveltyConfig {
  /** Minimum days of data required (default 7) */
  minimumDays?: number
  /** Threshold for lift decay to be considered significant (default 0.2 = 20%) */
  decayThreshold?: number
  /** R^2 threshold for good exponential fit (default 0.6) */
  fitThreshold?: number
  /** How close to stabilized to consider "stable" (default 0.05 = 5%) */
  stabilityThreshold?: number
}

/**
 * Exponential decay model parameters
 */
interface DecayModel {
  /** Initial lift (a in: lift(t) = a * exp(-b * t) + c) */
  initialAmplitude: number
  /** Decay rate (b) */
  decayRate: number
  /** Stabilized lift (c) */
  asymptote: number
  /** R-squared goodness of fit */
  r2: number
}

/**
 * Detect novelty effect by analyzing lift over time
 *
 * Fits an exponential decay model: lift(t) = a * exp(-b * t) + c
 * Where c is the stabilized long-term lift.
 *
 * @param dailyData - Array of daily lift data
 * @param config - Novelty detection configuration
 * @returns Novelty detection result
 */
export function detectNoveltyEffect(
  dailyData: DailyLiftData[],
  config: NoveltyConfig = {}
): NoveltyResult {
  const {
    minimumDays = 7,
    decayThreshold = 0.2,
    fitThreshold = 0.6,
    stabilityThreshold = 0.05,
  } = config

  // Check minimum data requirement
  if (dailyData.length < minimumDays) {
    return createInsufficientDataResult(dailyData.length, minimumDays)
  }

  // Calculate daily lift
  const dailyLift = dailyData.map((d) => {
    const controlRate =
      d.control.visitors > 0 ? d.control.conversions / d.control.visitors : 0
    const variantRate =
      d.variant.visitors > 0 ? d.variant.conversions / d.variant.visitors : 0
    return controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0
  })

  // Filter out extreme outliers (more than 3 std dev from mean)
  const meanLift = mean(dailyLift)
  const stdLift = standardDeviation(dailyLift)
  const filteredLift = dailyLift.map((lift) =>
    Math.abs(lift - meanLift) > 3 * stdLift ? meanLift : lift
  )

  // Fit exponential decay model
  const model = fitExponentialDecay(filteredLift)

  // Current and initial lift
  const initialLift = filteredLift[0] ?? 0
  const currentLift = filteredLift[filteredLift.length - 1] ?? 0

  // Calculate fit statistics
  const predictions = filteredLift.map((_, i) =>
    model.initialAmplitude * Math.exp(-model.decayRate * i) + model.asymptote
  )
  const fitStatistics = calculateFitStatistics(filteredLift, predictions)

  // Determine if novelty effect is present
  const liftDecayPercent =
    initialLift !== 0 ? (initialLift - currentLift) / Math.abs(initialLift) : 0
  const isDecaying = liftDecayPercent > decayThreshold
  const isGoodFit = model.r2 > fitThreshold
  const isApproachingStability =
    Math.abs(currentLift - model.asymptote) / Math.abs(initialLift - model.asymptote) <
    1 - stabilityThreshold

  const noveltyDetected = isDecaying && isGoodFit && !isApproachingStability

  // Calculate days to stabilize
  const daysToStabilize = calculateDaysToStabilize(
    model,
    currentLift,
    filteredLift.length,
    stabilityThreshold
  )

  // Generate message and recommendation
  const { message, recommendation } = generateNoveltyMessage(
    noveltyDetected,
    model,
    initialLift,
    currentLift,
    isApproachingStability,
    daysToStabilize
  )

  return {
    detected: noveltyDetected,
    decayRate: model.decayRate,
    stabilizedLift: model.asymptote,
    currentLift,
    initialLift,
    confidenceInStability: model.r2,
    daysToStabilize,
    message,
    recommendation,
    fitStatistics,
  }
}

/**
 * Fit exponential decay model using Levenberg-Marquardt inspired approach
 *
 * Model: y = a * exp(-b * x) + c
 */
function fitExponentialDecay(data: number[]): DecayModel {
  const n = data.length
  if (n < 3) {
    return {
      initialAmplitude: 0,
      decayRate: 0,
      asymptote: mean(data),
      r2: 0,
    }
  }

  // Initial parameter estimates
  const firstQuarter = data.slice(0, Math.ceil(n / 4))
  const lastQuarter = data.slice(-Math.ceil(n / 4))
  const initialY = mean(firstQuarter)
  const finalY = mean(lastQuarter)

  // Estimate asymptote as average of last quarter
  let c = finalY

  // Estimate initial amplitude
  let a = initialY - c

  // Estimate decay rate from half-life
  // Find index where lift is approximately halfway between initial and final
  const halfwayLift = (initialY + finalY) / 2
  let halfwayIdx = data.findIndex(
    (d, i) => i > 0 && Math.abs(d - halfwayLift) < Math.abs(data[i - 1]! - halfwayLift)
  )
  if (halfwayIdx < 1) halfwayIdx = Math.floor(n / 2)

  // b = ln(2) / half-life
  let b = halfwayIdx > 0 ? Math.log(2) / halfwayIdx : 0.1

  // Refine parameters using gradient descent
  const learningRate = 0.001
  const iterations = 1000
  const epsilon = 1e-8

  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0
    let gradB = 0
    let gradC = 0

    for (let i = 0; i < n; i++) {
      const expTerm = Math.exp(-b * i)
      const predicted = a * expTerm + c
      const error = predicted - data[i]!

      gradA += 2 * error * expTerm
      gradB += 2 * error * a * (-i) * expTerm
      gradC += 2 * error
    }

    // Update parameters
    a -= learningRate * gradA / n
    b -= learningRate * gradB / n
    c -= learningRate * gradC / n

    // Constrain b to be non-negative
    b = Math.max(0, b)

    // Check convergence
    if (
      Math.abs(gradA / n) < epsilon &&
      Math.abs(gradB / n) < epsilon &&
      Math.abs(gradC / n) < epsilon
    ) {
      break
    }
  }

  // Calculate R^2
  const r2 = calculateR2(data, (i) => a * Math.exp(-b * i) + c)

  return {
    initialAmplitude: a,
    decayRate: b,
    asymptote: c,
    r2,
  }
}

/**
 * Calculate R^2 (coefficient of determination)
 */
function calculateR2(
  actual: number[],
  predictFn: (index: number) => number
): number {
  const n = actual.length
  const actualMean = mean(actual)

  let ssRes = 0
  let ssTot = 0

  for (let i = 0; i < n; i++) {
    const predicted = predictFn(i)
    ssRes += Math.pow(actual[i]! - predicted, 2)
    ssTot += Math.pow(actual[i]! - actualMean, 2)
  }

  if (ssTot === 0) return 0
  return Math.max(0, 1 - ssRes / ssTot)
}

/**
 * Calculate fit statistics
 */
function calculateFitStatistics(
  actual: number[],
  predicted: number[]
): { r2: number; rmse: number; mape: number } {
  const n = actual.length
  const actualMean = mean(actual)

  let ssRes = 0
  let ssTot = 0
  let sumSquaredError = 0
  let sumAbsPercentError = 0
  let mapeCount = 0

  for (let i = 0; i < n; i++) {
    const a = actual[i]!
    const p = predicted[i]!

    ssRes += Math.pow(a - p, 2)
    ssTot += Math.pow(a - actualMean, 2)
    sumSquaredError += Math.pow(a - p, 2)

    if (Math.abs(a) > 0.001) {
      sumAbsPercentError += Math.abs((a - p) / a)
      mapeCount++
    }
  }

  return {
    r2: ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0,
    rmse: Math.sqrt(sumSquaredError / n),
    mape: mapeCount > 0 ? (sumAbsPercentError / mapeCount) * 100 : 0,
  }
}

/**
 * Calculate days until lift stabilizes
 */
function calculateDaysToStabilize(
  model: DecayModel,
  _currentLift: number,
  currentDay: number,
  stabilityThreshold: number
): number | null {
  if (model.decayRate <= 0) return null

  // Lift is considered stable when it's within threshold of asymptote
  const targetDistance =
    Math.abs(model.initialAmplitude) * stabilityThreshold

  // Solve: |a * exp(-b * t)| = targetDistance
  // t = -ln(targetDistance / |a|) / b
  if (Math.abs(model.initialAmplitude) < targetDistance) {
    return 0 // Already stable
  }

  const t = -Math.log(targetDistance / Math.abs(model.initialAmplitude)) / model.decayRate
  const daysRemaining = Math.ceil(t) - currentDay

  return daysRemaining > 0 ? daysRemaining : 0
}

/**
 * Generate message and recommendation
 */
function generateNoveltyMessage(
  detected: boolean,
  model: DecayModel,
  initialLift: number,
  currentLift: number,
  isStable: boolean,
  daysToStabilize: number | null
): { message: string; recommendation: string } {
  if (!detected && isStable) {
    return {
      message: `Lift appears stable at ${currentLift.toFixed(1)}%. No significant novelty effect detected.`,
      recommendation: 'Results can be trusted. Consider concluding the test if statistical significance is reached.',
    }
  }

  if (!detected && !isStable) {
    return {
      message: `Lift pattern does not match novelty decay. Current lift: ${currentLift.toFixed(1)}%.`,
      recommendation: 'Continue monitoring. Lift may stabilize or follow a non-standard pattern.',
    }
  }

  // Novelty detected
  const decayPercent = ((initialLift - model.asymptote) / initialLift) * 100

  let timeMessage = ''
  if (daysToStabilize !== null && daysToStabilize > 0) {
    timeMessage = ` Estimated ${daysToStabilize} more days until stabilization.`
  }

  return {
    message: `Novelty effect detected. Initial lift of ${initialLift.toFixed(1)}% is decaying toward ${model.asymptote.toFixed(1)}% (${decayPercent.toFixed(0)}% decay).${timeMessage}`,
    recommendation: `Wait for lift to stabilize (projected: ${model.asymptote.toFixed(1)}%) before making decisions. Do not ship based on initial high lift.`,
  }
}

/**
 * Create result for insufficient data
 */
function createInsufficientDataResult(
  current: number,
  required: number
): NoveltyResult {
  return {
    detected: false,
    decayRate: 0,
    stabilizedLift: 0,
    currentLift: 0,
    initialLift: 0,
    confidenceInStability: 0,
    daysToStabilize: null,
    message: `Insufficient data (${current}/${required} days)`,
    recommendation: 'Wait for more data before analyzing novelty effect.',
    fitStatistics: { r2: 0, rmse: 0, mape: 0 },
  }
}

/**
 * Check for reverse novelty (improvement over time)
 *
 * Some tests show improvement over time as users learn the new experience.
 * This is the opposite of novelty decay.
 */
export function detectLearningEffect(
  dailyData: DailyLiftData[],
  config: NoveltyConfig = {}
): {
  detected: boolean
  growthRate: number
  currentLift: number
  projectedLift: number
  message: string
} {
  const { minimumDays = 7 } = config

  if (dailyData.length < minimumDays) {
    return {
      detected: false,
      growthRate: 0,
      currentLift: 0,
      projectedLift: 0,
      message: `Insufficient data (${dailyData.length}/${minimumDays} days)`,
    }
  }

  // Calculate daily lift
  const dailyLift = dailyData.map((d) => {
    const controlRate =
      d.control.visitors > 0 ? d.control.conversions / d.control.visitors : 0
    const variantRate =
      d.variant.visitors > 0 ? d.variant.conversions / d.variant.visitors : 0
    return controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0
  })

  // Check if lift is increasing
  const firstHalf = dailyLift.slice(0, Math.floor(dailyLift.length / 2))
  const secondHalf = dailyLift.slice(Math.floor(dailyLift.length / 2))

  const firstHalfMean = mean(firstHalf)
  const secondHalfMean = mean(secondHalf)
  const currentLift = dailyLift[dailyLift.length - 1] ?? 0

  // Simple growth rate estimate
  const growthRate =
    firstHalfMean !== 0 ? (secondHalfMean - firstHalfMean) / Math.abs(firstHalfMean) : 0

  // Learning effect detected if consistent positive growth
  const detected = growthRate > 0.2 && secondHalfMean > firstHalfMean

  // Project future lift (simple linear extrapolation)
  const projectedLift = currentLift + (secondHalfMean - firstHalfMean)

  return {
    detected,
    growthRate,
    currentLift,
    projectedLift,
    message: detected
      ? `Learning effect detected. Lift improving from ${firstHalfMean.toFixed(1)}% to ${secondHalfMean.toFixed(1)}%. May continue to grow.`
      : 'No significant learning effect detected.',
  }
}

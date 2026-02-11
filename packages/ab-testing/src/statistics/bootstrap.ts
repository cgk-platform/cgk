/**
 * Bootstrap Confidence Intervals
 *
 * Provides non-parametric confidence interval estimation through
 * resampling. Works for any metric without distribution assumptions.
 */

import { mean, standardDeviation } from './core.js'

/**
 * Bootstrap estimation result
 */
export interface BootstrapResult {
  /** Point estimate (mean of original data) */
  estimate: number
  /** Lower bound of confidence interval */
  lowerBound: number
  /** Upper bound of confidence interval */
  upperBound: number
  /** Confidence level used */
  confidenceLevel: number
  /** Standard error of the bootstrap distribution */
  standardError: number
  /** Number of bootstrap samples used */
  samples: number
}

/**
 * Options for bootstrap estimation
 */
export interface BootstrapOptions {
  /** Confidence level (default 0.95) */
  confidenceLevel?: number
  /** Number of bootstrap samples (default 10000) */
  numSamples?: number
  /** Random seed for reproducibility */
  seed?: number
  /** Method for confidence interval calculation */
  method?: 'percentile' | 'bca' | 'basic'
}

/**
 * Seeded random number generator for reproducibility
 */
class SeededRandom {
  private seed: number

  constructor(seed?: number) {
    this.seed = seed ?? Date.now()
  }

  /**
   * Generate random number in [0, 1)
   * Uses a simple linear congruential generator
   */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296
    return this.seed / 4294967296
  }

  /**
   * Generate random integer in [0, max)
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }
}

/**
 * Resample array with replacement
 *
 * @param data - Original data array
 * @param size - Sample size (defaults to original size)
 * @param rng - Random number generator
 * @returns Resampled array
 */
export function resampleWithReplacement(
  data: number[],
  size?: number,
  rng?: SeededRandom
): number[] {
  const n = size ?? data.length
  const random = rng ?? new SeededRandom()
  const sample: number[] = new Array(n)

  for (let i = 0; i < n; i++) {
    const idx = random.nextInt(data.length)
    sample[i] = data[idx]!
  }

  return sample
}

/**
 * Bootstrap confidence interval for any metric
 * Uses the percentile method by default
 *
 * @param data - Array of values to estimate
 * @param options - Bootstrap options
 * @returns Bootstrap result with confidence interval
 */
export function bootstrapConfidenceInterval(
  data: number[],
  options: BootstrapOptions = {}
): BootstrapResult {
  const {
    confidenceLevel = 0.95,
    numSamples = 10000,
    seed,
    method = 'percentile',
  } = options

  if (data.length === 0) {
    return {
      estimate: 0,
      lowerBound: 0,
      upperBound: 0,
      confidenceLevel,
      standardError: 0,
      samples: 0,
    }
  }

  if (data.length === 1) {
    const value = data[0]!
    return {
      estimate: value,
      lowerBound: value,
      upperBound: value,
      confidenceLevel,
      standardError: 0,
      samples: 1,
    }
  }

  const rng = new SeededRandom(seed)
  const bootstrapMeans: number[] = new Array(numSamples)
  const originalMean = mean(data)

  // Generate bootstrap samples
  for (let i = 0; i < numSamples; i++) {
    const sample = resampleWithReplacement(data, data.length, rng)
    bootstrapMeans[i] = mean(sample)
  }

  // Sort for percentile calculation
  bootstrapMeans.sort((a, b) => a - b)

  // Calculate confidence interval based on method
  const alpha = 1 - confidenceLevel
  let lowerBound: number
  let upperBound: number

  switch (method) {
    case 'bca':
      // Bias-corrected and accelerated bootstrap
      ({ lowerBound, upperBound } = bcaConfidenceInterval(
        data,
        bootstrapMeans,
        originalMean,
        alpha
      ))
      break
    case 'basic':
      // Basic bootstrap (pivot method)
      ({ lowerBound, upperBound } = basicConfidenceInterval(
        bootstrapMeans,
        originalMean,
        alpha
      ))
      break
    case 'percentile':
    default:
      // Percentile method
      ({ lowerBound, upperBound } = percentileConfidenceInterval(
        bootstrapMeans,
        alpha
      ))
  }

  return {
    estimate: originalMean,
    lowerBound,
    upperBound,
    confidenceLevel,
    standardError: standardDeviation(bootstrapMeans, false),
    samples: numSamples,
  }
}

/**
 * Percentile method for confidence interval
 */
function percentileConfidenceInterval(
  bootstrapMeans: number[],
  alpha: number
): { lowerBound: number; upperBound: number } {
  const n = bootstrapMeans.length
  const lowerIdx = Math.floor(n * (alpha / 2))
  const upperIdx = Math.floor(n * (1 - alpha / 2))

  return {
    lowerBound: bootstrapMeans[lowerIdx] ?? 0,
    upperBound: bootstrapMeans[upperIdx] ?? 0,
  }
}

/**
 * Basic bootstrap (pivot method) for confidence interval
 */
function basicConfidenceInterval(
  bootstrapMeans: number[],
  originalMean: number,
  alpha: number
): { lowerBound: number; upperBound: number } {
  const n = bootstrapMeans.length
  const lowerIdx = Math.floor(n * (1 - alpha / 2))
  const upperIdx = Math.floor(n * (alpha / 2))

  return {
    lowerBound: 2 * originalMean - (bootstrapMeans[lowerIdx] ?? 0),
    upperBound: 2 * originalMean - (bootstrapMeans[upperIdx] ?? 0),
  }
}

/**
 * BCa (Bias-Corrected and Accelerated) confidence interval
 * More accurate than percentile for skewed distributions
 */
function bcaConfidenceInterval(
  data: number[],
  bootstrapMeans: number[],
  originalMean: number,
  alpha: number
): { lowerBound: number; upperBound: number } {
  const n = bootstrapMeans.length

  // Bias correction factor (z0)
  const below = bootstrapMeans.filter((m) => m < originalMean).length
  const z0 = normalQuantileApprox(below / n)

  // Acceleration factor (a) using jackknife
  const jackknife = jackknifeMeans(data)
  const jackMean = mean(jackknife)
  let num = 0
  let den = 0
  for (const j of jackknife) {
    const diff = jackMean - j
    num += Math.pow(diff, 3)
    den += Math.pow(diff, 2)
  }
  const a = den > 0 ? num / (6 * Math.pow(den, 1.5)) : 0

  // Adjusted percentiles
  const zAlpha = normalQuantileApprox(alpha / 2)
  const zAlphaUpper = normalQuantileApprox(1 - alpha / 2)

  const adjustedLower = normalCDFApprox(
    z0 + (z0 + zAlpha) / (1 - a * (z0 + zAlpha))
  )
  const adjustedUpper = normalCDFApprox(
    z0 + (z0 + zAlphaUpper) / (1 - a * (z0 + zAlphaUpper))
  )

  const lowerIdx = Math.max(0, Math.min(n - 1, Math.floor(n * adjustedLower)))
  const upperIdx = Math.max(0, Math.min(n - 1, Math.floor(n * adjustedUpper)))

  return {
    lowerBound: bootstrapMeans[lowerIdx] ?? 0,
    upperBound: bootstrapMeans[upperIdx] ?? 0,
  }
}

/**
 * Calculate jackknife leave-one-out means
 */
function jackknifeMeans(data: number[]): number[] {
  const n = data.length
  const total = data.reduce((a, b) => a + b, 0)
  const jackknife: number[] = new Array(n)

  for (let i = 0; i < n; i++) {
    jackknife[i] = (total - data[i]!) / (n - 1)
  }

  return jackknife
}

/**
 * Fast approximation of normal CDF for BCa calculation
 */
function normalCDFApprox(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))

  return x > 0 ? 1 - p : p
}

/**
 * Fast approximation of normal quantile for BCa calculation
 */
function normalQuantileApprox(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p === 0.5) return 0

  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p))
  const c0 = 2.515517
  const c1 = 0.802853
  const c2 = 0.010328
  const d1 = 1.432788
  const d2 = 0.189269
  const d3 = 0.001308

  const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t)

  return p < 0.5 ? -z : z
}

/**
 * Bootstrap difference between two groups
 * Used to compare variant vs control with confidence bounds
 *
 * @param control - Control group values
 * @param variant - Variant group values
 * @param options - Bootstrap options
 * @returns Bootstrap result for the difference
 */
export function bootstrapDifference(
  control: number[],
  variant: number[],
  options: BootstrapOptions = {}
): BootstrapResult {
  const { confidenceLevel = 0.95, numSamples = 10000, seed } = options

  if (control.length === 0 || variant.length === 0) {
    return {
      estimate: 0,
      lowerBound: 0,
      upperBound: 0,
      confidenceLevel,
      standardError: 0,
      samples: 0,
    }
  }

  const rng = new SeededRandom(seed)
  const differences: number[] = new Array(numSamples)

  // Original difference
  const originalDiff = mean(variant) - mean(control)

  // Generate bootstrap samples
  for (let i = 0; i < numSamples; i++) {
    const controlSample = resampleWithReplacement(control, control.length, rng)
    const variantSample = resampleWithReplacement(variant, variant.length, rng)
    differences[i] = mean(variantSample) - mean(controlSample)
  }

  // Sort for percentile calculation
  differences.sort((a, b) => a - b)

  // Percentile confidence interval
  const alpha = 1 - confidenceLevel
  const lowerIdx = Math.floor(numSamples * (alpha / 2))
  const upperIdx = Math.floor(numSamples * (1 - alpha / 2))

  return {
    estimate: originalDiff,
    lowerBound: differences[lowerIdx] ?? 0,
    upperBound: differences[upperIdx] ?? 0,
    confidenceLevel,
    standardError: standardDeviation(differences, false),
    samples: numSamples,
  }
}

/**
 * Bootstrap ratio of two groups (e.g., relative lift)
 *
 * @param control - Control group values
 * @param variant - Variant group values
 * @param options - Bootstrap options
 * @returns Bootstrap result for the ratio (variant/control - 1)
 */
export function bootstrapRatio(
  control: number[],
  variant: number[],
  options: BootstrapOptions = {}
): BootstrapResult {
  const { confidenceLevel = 0.95, numSamples = 10000, seed } = options

  if (control.length === 0 || variant.length === 0) {
    return {
      estimate: 0,
      lowerBound: 0,
      upperBound: 0,
      confidenceLevel,
      standardError: 0,
      samples: 0,
    }
  }

  const rng = new SeededRandom(seed)
  const ratios: number[] = []

  const controlMean = mean(control)
  const variantMean = mean(variant)
  const originalRatio = controlMean > 0 ? (variantMean / controlMean - 1) * 100 : 0

  // Generate bootstrap samples
  for (let i = 0; i < numSamples; i++) {
    const controlSample = resampleWithReplacement(control, control.length, rng)
    const variantSample = resampleWithReplacement(variant, variant.length, rng)

    const cMean = mean(controlSample)
    const vMean = mean(variantSample)

    // Skip samples where control mean is zero or negative
    if (cMean > 0) {
      ratios.push((vMean / cMean - 1) * 100)
    }
  }

  if (ratios.length === 0) {
    return {
      estimate: originalRatio,
      lowerBound: 0,
      upperBound: 0,
      confidenceLevel,
      standardError: 0,
      samples: 0,
    }
  }

  // Sort for percentile calculation
  ratios.sort((a, b) => a - b)

  const alpha = 1 - confidenceLevel
  const lowerIdx = Math.floor(ratios.length * (alpha / 2))
  const upperIdx = Math.floor(ratios.length * (1 - alpha / 2))

  return {
    estimate: originalRatio,
    lowerBound: ratios[lowerIdx] ?? 0,
    upperBound: ratios[upperIdx] ?? 0,
    confidenceLevel,
    standardError: standardDeviation(ratios, false),
    samples: ratios.length,
  }
}

/**
 * Bootstrap for conversion rate comparison
 * Generates confidence interval for the difference in proportions
 *
 * @param controlConversions - Number of conversions in control
 * @param controlVisitors - Number of visitors in control
 * @param variantConversions - Number of conversions in variant
 * @param variantVisitors - Number of visitors in variant
 * @param options - Bootstrap options
 * @returns Bootstrap result for conversion rate difference (in percentage points)
 */
export function bootstrapConversionRate(
  controlConversions: number,
  controlVisitors: number,
  variantConversions: number,
  variantVisitors: number,
  options: BootstrapOptions = {}
): BootstrapResult {
  const { confidenceLevel = 0.95, numSamples = 10000, seed } = options

  if (controlVisitors <= 0 || variantVisitors <= 0) {
    return {
      estimate: 0,
      lowerBound: 0,
      upperBound: 0,
      confidenceLevel,
      standardError: 0,
      samples: 0,
    }
  }

  const rng = new SeededRandom(seed)
  const differences: number[] = new Array(numSamples)

  // Original rates
  const controlRate = controlConversions / controlVisitors
  const variantRate = variantConversions / variantVisitors
  const originalDiff = (variantRate - controlRate) * 100

  // Generate bootstrap samples using binomial draws
  for (let i = 0; i < numSamples; i++) {
    // Simulate conversions for each group
    let cConv = 0
    let vConv = 0

    for (let j = 0; j < controlVisitors; j++) {
      if (rng.next() < controlRate) cConv++
    }
    for (let j = 0; j < variantVisitors; j++) {
      if (rng.next() < variantRate) vConv++
    }

    const cRate = cConv / controlVisitors
    const vRate = vConv / variantVisitors
    differences[i] = (vRate - cRate) * 100
  }

  // Sort for percentile calculation
  differences.sort((a, b) => a - b)

  const alpha = 1 - confidenceLevel
  const lowerIdx = Math.floor(numSamples * (alpha / 2))
  const upperIdx = Math.floor(numSamples * (1 - alpha / 2))

  return {
    estimate: originalDiff,
    lowerBound: differences[lowerIdx] ?? 0,
    upperBound: differences[upperIdx] ?? 0,
    confidenceLevel,
    standardError: standardDeviation(differences, false),
    samples: numSamples,
  }
}

/**
 * Core Statistical Methods
 *
 * Provides Z-test, Welch's t-test, and supporting statistical functions
 * for A/B test significance calculations.
 */

/**
 * Significance test result
 */
export interface SignificanceResult {
  /** Z-score or t-score */
  zScore: number
  /** Two-tailed p-value */
  pValue: number
  /** Whether result is statistically significant */
  isSignificant: boolean
  /** Percentage improvement over control */
  improvement: number
  /** Confidence level used (0.9, 0.95, 0.99) */
  confidenceLevel: number
  /** Confidence interval for the difference */
  confidenceInterval: {
    lower: number
    upper: number
  }
}

/**
 * Variant data for conversion rate tests
 */
export interface ConversionData {
  visitors: number
  conversions: number
}

/**
 * Variant data for revenue tests
 */
export interface RevenueData {
  visitors: number
  revenue: number
  revenueVariance: number
}

/**
 * Critical Z values for common confidence levels
 */
const CRITICAL_Z: Record<number, number> = {
  0.9: 1.645,
  0.95: 1.96,
  0.99: 2.576,
}

/**
 * Standard normal cumulative distribution function (CDF)
 * Uses the Abramowitz and Stegun approximation
 *
 * @param x - Z-score
 * @returns Probability P(Z <= x)
 */
export function normalCDF(x: number): number {
  // Constants for approximation
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  // Save the sign of x
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.SQRT2

  // Abramowitz and Stegun formula 7.1.26
  const t = 1.0 / (1.0 + p * x)
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

/**
 * Inverse of the standard normal CDF (quantile function)
 * Uses Acklam's algorithm
 *
 * @param p - Probability (0 < p < 1)
 * @returns Z-score
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive)')
  }

  // Coefficients for rational approximation
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ]
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ]
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ]
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q: number
  let r: number

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    )
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5
    r = q * q
    return (
      ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) *
        q) /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
    )
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p))
    return (
      -(
        (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
        ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
      )
    )
  }
}

/**
 * Chi-squared cumulative distribution function
 * Uses the regularized incomplete gamma function
 *
 * @param x - Chi-squared value
 * @param df - Degrees of freedom
 * @returns Probability P(Chi2 <= x)
 */
export function chiSquaredCDF(x: number, df: number): number {
  if (x <= 0) return 0
  if (df <= 0) throw new Error('Degrees of freedom must be positive')

  return regularizedGammaP(df / 2, x / 2)
}

/**
 * Regularized incomplete gamma function P(a, x)
 * Uses series expansion for small x and continued fraction for large x
 */
function regularizedGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0

  if (x < a + 1) {
    // Use series expansion
    return gammaSeries(a, x)
  } else {
    // Use continued fraction
    return 1 - gammaContinuedFraction(a, x)
  }
}

/**
 * Gamma function series expansion
 */
function gammaSeries(a: number, x: number): number {
  const maxIterations = 200
  const epsilon = 3e-12

  let sum = 1 / a
  let term = sum

  for (let n = 1; n < maxIterations; n++) {
    term *= x / (a + n)
    sum += term
    if (Math.abs(term) < Math.abs(sum) * epsilon) {
      break
    }
  }

  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

/**
 * Gamma function continued fraction
 */
function gammaContinuedFraction(a: number, x: number): number {
  const maxIterations = 200
  const epsilon = 3e-12

  let b = x + 1 - a
  let c = 1 / 1e-30
  let d = 1 / b
  let h = d

  for (let i = 1; i <= maxIterations; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = b + an / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < epsilon) break
  }

  return h * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

/**
 * Log gamma function using Lanczos approximation
 */
function logGamma(x: number): number {
  const g = 7
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]

  if (x < 0.5) {
    return (
      Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
    )
  }

  x -= 1
  let a = coefficients[0]!
  const t = x + g + 0.5

  for (let i = 1; i < g + 2; i++) {
    a += coefficients[i]! / (x + i)
  }

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/**
 * Student's t-distribution CDF
 * Uses the regularized incomplete beta function
 *
 * @param t - t-statistic
 * @param df - Degrees of freedom
 * @returns Probability P(T <= t)
 */
export function studentTCDF(t: number, df: number): number {
  if (df <= 0) throw new Error('Degrees of freedom must be positive')

  const x = df / (df + t * t)
  const prob = 0.5 * regularizedBetaI(df / 2, 0.5, x)

  return t >= 0 ? 1 - prob : prob
}

/**
 * Regularized incomplete beta function I_x(a, b)
 */
function regularizedBetaI(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return 0
  if (x === 0) return 0
  if (x === 1) return 1

  const bt =
    x === 0 || x === 1
      ? 0
      : Math.exp(
          logGamma(a + b) -
            logGamma(a) -
            logGamma(b) +
            a * Math.log(x) +
            b * Math.log(1 - x)
        )

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(a, b, x)) / a
  } else {
    return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b
  }
}

/**
 * Continued fraction for incomplete beta function
 */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200
  const epsilon = 3e-12

  let m = 1
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap

  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  let h = d

  for (; m <= maxIterations; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < epsilon) break
  }

  return h
}

/**
 * Two-sample Z-test for conversion rates
 * Determines if the difference between variants is statistically significant
 *
 * @param control - Control variant data
 * @param variant - Treatment variant data
 * @param confidenceLevel - Confidence level (0.9, 0.95, 0.99)
 * @returns Significance test result
 */
export function calculateSignificance(
  control: ConversionData,
  variant: ConversionData,
  confidenceLevel: 0.9 | 0.95 | 0.99 = 0.95
): SignificanceResult {
  // Validate inputs
  if (control.visitors <= 0 || variant.visitors <= 0) {
    return createNullResult(confidenceLevel)
  }

  // Conversion rates
  const p1 = control.conversions / control.visitors // Control rate
  const p2 = variant.conversions / variant.visitors // Variant rate
  const n1 = control.visitors
  const n2 = variant.visitors

  // Pooled proportion under null hypothesis
  const pooled = (control.conversions + variant.conversions) / (n1 + n2)

  // Standard error of difference
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))

  // Z-score
  const zScore = se > 0 ? (p2 - p1) / se : 0

  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // Critical Z for confidence level
  const criticalZ = CRITICAL_Z[confidenceLevel] || 1.96

  // Improvement percentage
  const improvement = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0

  // Confidence interval for the difference (not pooled SE)
  const seDiff = Math.sqrt(
    (p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2
  )
  const marginOfError = criticalZ * seDiff

  return {
    zScore,
    pValue,
    isSignificant: Math.abs(zScore) >= criticalZ,
    improvement,
    confidenceLevel,
    confidenceInterval: {
      lower: (p2 - p1 - marginOfError) * 100,
      upper: (p2 - p1 + marginOfError) * 100,
    },
  }
}

/**
 * Welch's t-test for revenue per visitor (continuous metric)
 * More robust than pooled t-test when variances are unequal
 *
 * @param control - Control revenue data
 * @param variant - Treatment revenue data
 * @param confidenceLevel - Confidence level (0.9, 0.95, 0.99)
 * @returns Significance test result
 */
export function calculateRevenueSignificance(
  control: RevenueData,
  variant: RevenueData,
  confidenceLevel: 0.9 | 0.95 | 0.99 = 0.95
): SignificanceResult {
  // Validate inputs
  if (control.visitors <= 1 || variant.visitors <= 1) {
    return createNullResult(confidenceLevel)
  }

  // Revenue per visitor
  const rpv1 = control.revenue / control.visitors
  const rpv2 = variant.revenue / variant.visitors

  // Standard errors
  const se1Sq = control.revenueVariance / control.visitors
  const se2Sq = variant.revenueVariance / variant.visitors

  // Welch's t-test standard error
  const se = Math.sqrt(se1Sq + se2Sq)

  if (se === 0) {
    return createNullResult(confidenceLevel)
  }

  // t-statistic
  const tScore = (rpv2 - rpv1) / se

  // Welch-Satterthwaite degrees of freedom
  const df =
    Math.pow(se1Sq + se2Sq, 2) /
    (Math.pow(se1Sq, 2) / (control.visitors - 1) +
      Math.pow(se2Sq, 2) / (variant.visitors - 1))

  // Two-tailed p-value
  const pValue = 2 * (1 - studentTCDF(Math.abs(tScore), df))

  // Critical value for confidence level
  const alpha = 1 - confidenceLevel
  const criticalT = getTCriticalValue(df, alpha)

  // Improvement percentage
  const improvement = rpv1 > 0 ? ((rpv2 - rpv1) / rpv1) * 100 : 0

  // Confidence interval
  const marginOfError = criticalT * se

  return {
    zScore: tScore,
    pValue,
    isSignificant: Math.abs(tScore) >= criticalT,
    improvement,
    confidenceLevel,
    confidenceInterval: {
      lower: ((rpv2 - rpv1 - marginOfError) / rpv1) * 100,
      upper: ((rpv2 - rpv1 + marginOfError) / rpv1) * 100,
    },
  }
}

/**
 * Get critical t-value for given degrees of freedom and alpha
 * Uses approximation for large df, lookup table for small df
 */
function getTCriticalValue(df: number, alpha: number): number {
  // For large df, t approaches normal
  if (df > 100) {
    return normalQuantile(1 - alpha / 2)
  }

  // Approximation for moderate df
  const g1 = 0.3275911
  const g2 = 0.362
  const g3 = 0.7
  const g4 = 1.3

  const z = normalQuantile(1 - alpha / 2)
  const g = (z * z - 1) / 4 / df

  return z * (1 + g + g * g * (g1 + g2 / df) + g * g * g * (g3 + g4 / df))
}

/**
 * Create a null result when calculation is not possible
 */
function createNullResult(confidenceLevel: number): SignificanceResult {
  return {
    zScore: 0,
    pValue: 1,
    isSignificant: false,
    improvement: 0,
    confidenceLevel,
    confidenceInterval: {
      lower: 0,
      upper: 0,
    },
  }
}

/**
 * Calculate sample size needed for desired power
 *
 * @param baselineRate - Control conversion rate (0-1)
 * @param mde - Minimum detectable effect (relative, e.g., 0.1 for 10%)
 * @param power - Statistical power (default 0.8)
 * @param alpha - Significance level (default 0.05)
 * @returns Sample size per variant
 */
export function calculateSampleSize(
  baselineRate: number,
  mde: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  if (baselineRate <= 0 || baselineRate >= 1) {
    throw new Error('Baseline rate must be between 0 and 1')
  }
  if (mde <= 0) {
    throw new Error('MDE must be positive')
  }

  const p1 = baselineRate
  const p2 = baselineRate * (1 + mde)

  if (p2 >= 1) {
    throw new Error('Target rate exceeds 100%')
  }

  // Z values
  const zAlpha = normalQuantile(1 - alpha / 2)
  const zBeta = normalQuantile(power)

  // Sample size formula
  const pooledP = (p1 + p2) / 2
  const numerator = Math.pow(
    zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
    2
  )
  const denominator = Math.pow(p2 - p1, 2)

  return Math.ceil(numerator / denominator)
}

/**
 * Calculate statistical power given sample size
 *
 * @param sampleSize - Sample size per variant
 * @param baselineRate - Control conversion rate (0-1)
 * @param mde - Minimum detectable effect (relative)
 * @param alpha - Significance level (default 0.05)
 * @returns Power (0-1)
 */
export function calculatePower(
  sampleSize: number,
  baselineRate: number,
  mde: number,
  alpha: number = 0.05
): number {
  const p1 = baselineRate
  const p2 = baselineRate * (1 + mde)

  const pooledP = (p1 + p2) / 2
  const se = Math.sqrt(2 * pooledP * (1 - pooledP) / sampleSize)
  const seDiff = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / sampleSize)

  const zAlpha = normalQuantile(1 - alpha / 2)
  const threshold = zAlpha * se

  const zBeta = (Math.abs(p2 - p1) - threshold) / seDiff

  return normalCDF(zBeta)
}

/**
 * Calculate basic descriptive statistics
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function variance(values: number[], useSample: boolean = true): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const sumSq = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0)
  return sumSq / (useSample ? values.length - 1 : values.length)
}

export function standardDeviation(values: number[], useSample: boolean = true): number {
  return Math.sqrt(variance(values, useSample))
}

export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0
  const meanX = mean(x)
  const meanY = mean(y)
  let sum = 0
  for (let i = 0; i < x.length; i++) {
    sum += (x[i]! - meanX) * (y[i]! - meanY)
  }
  return sum / (x.length - 1)
}

export function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y)
  const stdX = standardDeviation(x)
  const stdY = standardDeviation(y)
  if (stdX === 0 || stdY === 0) return 0
  return cov / (stdX * stdY)
}

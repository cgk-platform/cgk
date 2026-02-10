# PHASE-2AT: A/B Testing Statistical Methods

**Duration**: 1 week (Week 12-13)
**Depends On**: PHASE-2AT-ABTESTING-CORE (partial - types and schema)
**Parallel With**: PHASE-2AT-ABTESTING-CORE (latter half)
**Blocks**: PHASE-2AT-ABTESTING-ADMIN

---

## Goal

Implement statistical analysis methods for A/B test evaluation including significance testing, variance reduction (CUPED), quality detection (SRM, novelty, drift), guardrails, and LTV analysis. These methods enable tenants to make confident decisions about which variants win.

---

## Success Criteria

- [ ] Z-test calculates statistical significance correctly
- [ ] Bootstrap confidence intervals provide uncertainty ranges
- [ ] CUPED reduces variance and accelerates time-to-significance
- [ ] SRM detection alerts when traffic split is off (chi-squared test)
- [ ] Novelty effect detection identifies temporary lift decay
- [ ] Drift detection monitors for population changes during test
- [ ] Guardrails auto-stop tests when protected metrics degrade
- [ ] LTV analysis tracks cohort performance at 30/60/90 days
- [ ] Holm-Bonferroni correction applied for 3+ variant tests
- [ ] All calculations are tenant-isolated
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### Statistical Methods Library

```
packages/ab-testing/src/statistics/
├── core.ts           # Z-test, Chi-squared, p-value calculation
├── bootstrap.ts      # Bootstrap confidence intervals
├── cuped.ts          # Variance reduction using pre-experiment data
├── srm.ts            # Sample Ratio Mismatch detection
├── novelty.ts        # Novelty effect detection
├── drift.ts          # Population drift detection
├── multiple-testing.ts  # Holm-Bonferroni correction
└── index.ts          # Public exports
```

### Z-Test for Significance

**Purpose**: Determines if the difference between variants is statistically significant.

```typescript
// packages/ab-testing/src/statistics/core.ts

export interface SignificanceResult {
  zScore: number
  pValue: number
  isSignificant: boolean
  improvement: number  // % improvement over control
  confidenceLevel: number
}

/**
 * Two-sample Z-test for conversion rates.
 * Returns whether the difference is statistically significant.
 */
export function calculateSignificance(
  control: { visitors: number; conversions: number },
  variant: { visitors: number; conversions: number },
  confidenceLevel: 0.9 | 0.95 | 0.99 = 0.95
): SignificanceResult {
  const p1 = control.conversions / control.visitors  // Control rate
  const p2 = variant.conversions / variant.visitors  // Variant rate
  const n1 = control.visitors
  const n2 = variant.visitors

  // Pooled proportion
  const pooled = (control.conversions + variant.conversions) / (n1 + n2)

  // Standard error
  const se = Math.sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2))

  // Z-score
  const zScore = se > 0 ? (p2 - p1) / se : 0

  // P-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // Critical Z for confidence level
  const criticalZ = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576
  }[confidenceLevel]

  return {
    zScore,
    pValue,
    isSignificant: Math.abs(zScore) >= criticalZ,
    improvement: p1 > 0 ? ((p2 - p1) / p1) * 100 : 0,
    confidenceLevel
  }
}

/**
 * Welch's t-test for revenue per visitor (continuous metric).
 */
export function calculateRevenueSignificance(
  control: { visitors: number; revenue: number; revenueVariance: number },
  variant: { visitors: number; revenue: number; revenueVariance: number },
  confidenceLevel: 0.9 | 0.95 | 0.99 = 0.95
): SignificanceResult {
  const rpv1 = control.revenue / control.visitors
  const rpv2 = variant.revenue / variant.visitors

  // Welch's t-test SE
  const se = Math.sqrt(
    control.revenueVariance / control.visitors +
    variant.revenueVariance / variant.visitors
  )

  const tScore = se > 0 ? (rpv2 - rpv1) / se : 0
  const pValue = 2 * (1 - studentTCDF(Math.abs(tScore), /* df calculation */))

  // ... rest similar to z-test
}
```

### Bootstrap Confidence Intervals

**Purpose**: Provides confidence ranges without assuming normal distribution. Works for any metric.

```typescript
// packages/ab-testing/src/statistics/bootstrap.ts

export interface BootstrapResult {
  estimate: number
  lowerBound: number
  upperBound: number
  confidenceLevel: number
  standardError: number
  samples: number
}

/**
 * Bootstrap confidence interval for any metric.
 * Resamples data with replacement to estimate uncertainty.
 */
export function bootstrapConfidenceInterval(
  data: number[],
  confidenceLevel: number = 0.95,
  numSamples: number = 10000
): BootstrapResult {
  const bootstrapMeans: number[] = []
  const n = data.length

  // Resample with replacement
  for (let i = 0; i < numSamples; i++) {
    const sample = resampleWithReplacement(data, n)
    bootstrapMeans.push(mean(sample))
  }

  // Sort for percentile calculation
  bootstrapMeans.sort((a, b) => a - b)

  // Percentile method
  const alpha = 1 - confidenceLevel
  const lowerIdx = Math.floor(numSamples * (alpha / 2))
  const upperIdx = Math.floor(numSamples * (1 - alpha / 2))

  return {
    estimate: mean(data),
    lowerBound: bootstrapMeans[lowerIdx],
    upperBound: bootstrapMeans[upperIdx],
    confidenceLevel,
    standardError: standardDeviation(bootstrapMeans),
    samples: numSamples
  }
}

/**
 * Bootstrap difference between two groups.
 * Used to compare variant vs control with confidence bounds.
 */
export function bootstrapDifference(
  control: number[],
  variant: number[],
  confidenceLevel: number = 0.95,
  numSamples: number = 10000
): BootstrapResult {
  const differences: number[] = []

  for (let i = 0; i < numSamples; i++) {
    const controlSample = resampleWithReplacement(control, control.length)
    const variantSample = resampleWithReplacement(variant, variant.length)
    differences.push(mean(variantSample) - mean(controlSample))
  }

  differences.sort((a, b) => a - b)

  const alpha = 1 - confidenceLevel
  const lowerIdx = Math.floor(numSamples * (alpha / 2))
  const upperIdx = Math.floor(numSamples * (1 - alpha / 2))

  return {
    estimate: mean(variant) - mean(control),
    lowerBound: differences[lowerIdx],
    upperBound: differences[upperIdx],
    confidenceLevel,
    standardError: standardDeviation(differences),
    samples: numSamples
  }
}
```

### CUPED (Variance Reduction)

**Purpose**: Reduces variance by using pre-experiment behavior as covariate. Accelerates time-to-significance by 20-50%.

```typescript
// packages/ab-testing/src/statistics/cuped.ts

export interface CUPEDResult {
  adjustedMetric: number
  varianceReduction: number  // Percentage reduction
  covariate: string
  covariateCorrelation: number
  originalVariance: number
  adjustedVariance: number
}

/**
 * CUPED adjustment using pre-experiment metric as covariate.
 *
 * Formula: Y_adjusted = Y - θ * (X - E[X])
 * Where θ = Cov(X,Y) / Var(X)
 */
export function applyCUPED(
  experimentMetric: number[],    // Y: metric during experiment
  preExperimentMetric: number[], // X: same metric before experiment
): CUPEDResult {
  // Calculate covariance and variance
  const covXY = covariance(preExperimentMetric, experimentMetric)
  const varX = variance(preExperimentMetric)
  const meanX = mean(preExperimentMetric)

  // Optimal theta
  const theta = varX > 0 ? covXY / varX : 0

  // Adjusted values
  const adjustedValues = experimentMetric.map((y, i) =>
    y - theta * (preExperimentMetric[i] - meanX)
  )

  const originalVar = variance(experimentMetric)
  const adjustedVar = variance(adjustedValues)

  return {
    adjustedMetric: mean(adjustedValues),
    varianceReduction: originalVar > 0
      ? ((originalVar - adjustedVar) / originalVar) * 100
      : 0,
    covariate: 'pre_experiment_metric',
    covariateCorrelation: correlation(preExperimentMetric, experimentMetric),
    originalVariance: originalVar,
    adjustedVariance: adjustedVar
  }
}

/**
 * Get pre-experiment data for CUPED.
 * Uses visitor behavior from 7-30 days before test start.
 */
export async function getPreExperimentData(
  tenantId: string,
  testId: string,
  visitorIds: string[],
  lookbackDays: number = 14
): Promise<Map<string, { revenue: number; sessions: number }>> {
  // Query visitor behavior before test started
  // Returns map of visitorId -> pre-experiment metrics
}
```

### SRM Detection (Sample Ratio Mismatch)

**Purpose**: Detects if traffic split is off from expected ratio. Compromised ratio = invalid results.

```typescript
// packages/ab-testing/src/statistics/srm.ts

export interface SRMResult {
  detected: boolean
  chiSquared: number
  pValue: number
  expectedRatio: Record<string, number>
  observedRatio: Record<string, number>
  severity: 'none' | 'warning' | 'critical'
  message: string
}

/**
 * Chi-squared test for Sample Ratio Mismatch.
 * Alerts when traffic split differs significantly from expected.
 */
export function detectSRM(
  variants: Array<{
    id: string
    expectedAllocation: number  // 0-100
    observedVisitors: number
  }>
): SRMResult {
  const totalVisitors = variants.reduce((sum, v) => sum + v.observedVisitors, 0)
  const totalAllocation = variants.reduce((sum, v) => sum + v.expectedAllocation, 0)

  // Calculate chi-squared statistic
  let chiSquared = 0
  const expectedRatio: Record<string, number> = {}
  const observedRatio: Record<string, number> = {}

  for (const v of variants) {
    const expected = (v.expectedAllocation / totalAllocation) * totalVisitors
    const observed = v.observedVisitors
    chiSquared += Math.pow(observed - expected, 2) / expected

    expectedRatio[v.id] = v.expectedAllocation / totalAllocation
    observedRatio[v.id] = observed / totalVisitors
  }

  // Degrees of freedom = k - 1
  const df = variants.length - 1
  const pValue = 1 - chiSquaredCDF(chiSquared, df)

  // Severity thresholds
  let severity: 'none' | 'warning' | 'critical' = 'none'
  if (pValue < 0.001) severity = 'critical'
  else if (pValue < 0.05) severity = 'warning'

  return {
    detected: pValue < 0.05,
    chiSquared,
    pValue,
    expectedRatio,
    observedRatio,
    severity,
    message: severity === 'critical'
      ? 'CRITICAL: Traffic split significantly differs from expected. Test results may be invalid.'
      : severity === 'warning'
      ? 'WARNING: Slight traffic imbalance detected. Monitor closely.'
      : 'Traffic split is within expected range.'
  }
}
```

### Novelty Effect Detection

**Purpose**: Identifies if early lift is temporary (users react to newness, not value).

```typescript
// packages/ab-testing/src/statistics/novelty.ts

export interface NoveltyResult {
  detected: boolean
  decayRate: number        // Rate of lift decay over time
  stabilizedLift: number   // Projected long-term lift
  currentLift: number      // Current observed lift
  confidenceInStability: number  // 0-1
  message: string
  recommendation: string
}

/**
 * Detect novelty effect by analyzing lift over time.
 * Looks for decay pattern in daily conversion rates.
 */
export function detectNoveltyEffect(
  dailyData: Array<{
    date: string
    control: { visitors: number; conversions: number }
    variant: { visitors: number; conversions: number }
  }>,
  minimumDays: number = 7
): NoveltyResult {
  if (dailyData.length < minimumDays) {
    return {
      detected: false,
      decayRate: 0,
      stabilizedLift: 0,
      currentLift: 0,
      confidenceInStability: 0,
      message: `Insufficient data (${dailyData.length}/${minimumDays} days)`,
      recommendation: 'Wait for more data before analyzing novelty effect.'
    }
  }

  // Calculate daily lift
  const dailyLift = dailyData.map(d => {
    const controlRate = d.control.conversions / d.control.visitors
    const variantRate = d.variant.conversions / d.variant.visitors
    return controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0
  })

  // Fit exponential decay: lift(t) = a * exp(-b * t) + c
  // Where c is the stabilized lift
  const { decayRate, stabilizedLift, r2 } = fitExponentialDecay(dailyLift)

  const currentLift = dailyLift[dailyLift.length - 1]
  const initialLift = dailyLift[0]

  // Novelty detected if:
  // 1. Initial lift > stabilized lift by significant margin
  // 2. Decay pattern fits well (r2 > 0.6)
  // 3. Current lift is closer to stabilized than initial
  const noveltyDetected =
    initialLift > stabilizedLift * 1.3 &&
    r2 > 0.6 &&
    Math.abs(currentLift - stabilizedLift) < Math.abs(currentLift - initialLift)

  return {
    detected: noveltyDetected,
    decayRate,
    stabilizedLift,
    currentLift,
    confidenceInStability: r2,
    message: noveltyDetected
      ? `Novelty effect detected. Initial lift of ${initialLift.toFixed(1)}% is decaying toward ${stabilizedLift.toFixed(1)}%.`
      : 'No significant novelty effect detected. Lift appears stable.',
    recommendation: noveltyDetected
      ? `Wait for lift to stabilize (projected: ${stabilizedLift.toFixed(1)}%) before making decisions.`
      : 'Lift is stable. Results can be trusted.'
  }
}
```

### Drift Detection

**Purpose**: Monitors for population changes during test (seasonality, marketing campaigns, etc.).

```typescript
// packages/ab-testing/src/statistics/drift.ts

export interface DriftResult {
  detected: boolean
  severity: 'none' | 'low' | 'medium' | 'high'
  dimensions: DriftDimension[]
  overallDriftScore: number  // 0-1
  message: string
}

interface DriftDimension {
  dimension: string  // 'device', 'country', 'utm_source', etc.
  driftScore: number
  before: Record<string, number>  // Distribution before
  after: Record<string, number>   // Distribution after
  significant: boolean
}

/**
 * Detect population drift by comparing early vs late visitor composition.
 * Uses chi-squared test on categorical distributions.
 */
export function detectDrift(
  earlyPeriod: VisitorData[],  // First 25% of test
  latePeriod: VisitorData[],   // Last 25% of test
  dimensions: string[] = ['device_type', 'country', 'utm_source']
): DriftResult {
  const dimensionResults: DriftDimension[] = []

  for (const dim of dimensions) {
    const earlyDist = getDistribution(earlyPeriod, dim)
    const lateDist = getDistribution(latePeriod, dim)

    const chiSquared = chiSquaredTest(earlyDist, lateDist)
    const pValue = 1 - chiSquaredCDF(chiSquared.statistic, chiSquared.df)

    dimensionResults.push({
      dimension: dim,
      driftScore: 1 - pValue,
      before: earlyDist,
      after: lateDist,
      significant: pValue < 0.05
    })
  }

  const significantDrifts = dimensionResults.filter(d => d.significant)
  const overallScore = mean(dimensionResults.map(d => d.driftScore))

  let severity: 'none' | 'low' | 'medium' | 'high' = 'none'
  if (significantDrifts.length >= 2) severity = 'high'
  else if (significantDrifts.length === 1) severity = 'medium'
  else if (overallScore > 0.3) severity = 'low'

  return {
    detected: significantDrifts.length > 0,
    severity,
    dimensions: dimensionResults,
    overallDriftScore: overallScore,
    message: severity === 'high'
      ? `Significant drift detected in ${significantDrifts.map(d => d.dimension).join(', ')}. Results may not generalize.`
      : severity === 'medium'
      ? `Moderate drift in ${significantDrifts[0]?.dimension}. Consider segmented analysis.`
      : 'Population composition is stable.'
  }
}
```

### Guardrails

**Purpose**: Protects key metrics during experiments. Auto-stops if guardrails are violated.

```typescript
// packages/ab-testing/src/guardrails/types.ts

export interface Guardrail {
  id: string
  testId: string
  tenantId: string
  metricName: string
  threshold: number
  operator: 'greater_than' | 'less_than' | 'within_percent'
  percentTolerance?: number  // For 'within_percent'
  action: 'warn' | 'pause' | 'stop'
  enabled: boolean
}

export interface GuardrailEvaluation {
  guardrail: Guardrail
  currentValue: number
  baselineValue: number
  violated: boolean
  message: string
}

// packages/ab-testing/src/guardrails/evaluate.ts

export async function evaluateGuardrails(
  tenantId: string,
  testId: string
): Promise<GuardrailEvaluation[]> {
  const guardrails = await getTestGuardrails(tenantId, testId)
  const metrics = await getGuardrailMetrics(tenantId, testId)
  const results: GuardrailEvaluation[] = []

  for (const guard of guardrails) {
    if (!guard.enabled) continue

    const current = metrics[guard.metricName]?.variant
    const baseline = metrics[guard.metricName]?.control

    const violated = evaluateCondition(guard, current, baseline)

    results.push({
      guardrail: guard,
      currentValue: current,
      baselineValue: baseline,
      violated,
      message: violated
        ? `Guardrail violated: ${guard.metricName} ${formatViolation(guard, current, baseline)}`
        : `Guardrail OK: ${guard.metricName} within acceptable range`
    })

    if (violated && guard.action === 'stop') {
      await stopTest(tenantId, testId, `Guardrail violated: ${guard.metricName}`)
    } else if (violated && guard.action === 'pause') {
      await pauseTest(tenantId, testId, `Guardrail warning: ${guard.metricName}`)
    }
  }

  return results
}
```

### LTV Analysis

**Purpose**: Tracks long-term impact beyond immediate conversion. Shows 30/60/90 day cohort performance.

```typescript
// packages/ab-testing/src/analysis/ltv.ts

export interface LTVAnalysis {
  variant: string
  cohortDate: string
  day30LTV: number
  day60LTV: number
  day90LTV: number
  orderCount: {
    day30: number
    day60: number
    day90: number
  }
  repurchaseRate: {
    day30: number
    day60: number
    day90: number
  }
}

export async function analyzeLTV(
  tenantId: string,
  testId: string
): Promise<LTVAnalysis[]> {
  // Get customers who converted during the test
  const converters = await getTestConverters(tenantId, testId)

  const analysis: LTVAnalysis[] = []

  for (const variant of ['control', ...variants]) {
    const cohort = converters.filter(c => c.variantId === variant)

    const ltv = {
      variant,
      cohortDate: formatDate(testStartDate),
      day30LTV: await calculateLTV(cohort, 30),
      day60LTV: await calculateLTV(cohort, 60),
      day90LTV: await calculateLTV(cohort, 90),
      orderCount: {
        day30: await countOrders(cohort, 30),
        day60: await countOrders(cohort, 60),
        day90: await countOrders(cohort, 90)
      },
      repurchaseRate: {
        day30: await repurchaseRate(cohort, 30),
        day60: await repurchaseRate(cohort, 60),
        day90: await repurchaseRate(cohort, 90)
      }
    }

    analysis.push(ltv)
  }

  return analysis
}
```

### Holm-Bonferroni Correction

**Purpose**: Adjusts significance thresholds for multiple comparisons (3+ variants).

```typescript
// packages/ab-testing/src/statistics/multiple-testing.ts

export interface HolmResult {
  comparisons: Array<{
    variantA: string
    variantB: string
    originalPValue: number
    adjustedAlpha: number
    isSignificant: boolean
  }>
  familyWiseErrorRate: number
}

/**
 * Holm-Bonferroni correction for multiple comparisons.
 * Controls family-wise error rate when testing 3+ variants.
 */
export function holmBonferroniCorrection(
  pValues: Array<{ comparison: string; pValue: number }>,
  alpha: number = 0.05
): HolmResult {
  // Sort by p-value ascending
  const sorted = [...pValues].sort((a, b) => a.pValue - b.pValue)
  const m = sorted.length  // Number of comparisons

  const results = sorted.map((item, i) => {
    // Adjusted alpha = alpha / (m - i)
    const adjustedAlpha = alpha / (m - i)
    return {
      ...item,
      adjustedAlpha,
      isSignificant: item.pValue < adjustedAlpha
    }
  })

  // After first non-significant, all subsequent are non-significant
  let foundNonSignificant = false
  for (const result of results) {
    if (foundNonSignificant) {
      result.isSignificant = false
    } else if (!result.isSignificant) {
      foundNonSignificant = true
    }
  }

  return {
    comparisons: results,
    familyWiseErrorRate: alpha
  }
}
```

---

## Constraints

- All statistical calculations MUST be reproducible
- CUPED requires at least 7 days of pre-experiment data
- SRM check should run daily on active tests
- Guardrail evaluations should run hourly
- LTV analysis only available 30+ days after test completion
- Bootstrap should use at least 10,000 samples for stability

---

## Pattern References

**RAWDOG code to reference:**
- `src/lib/ab-testing/stats/core.ts` - Significance calculations
- `src/lib/ab-testing/statistics/cuped.ts` - CUPED implementation
- `src/lib/ab-testing/quality-control/srm-detection.ts` - SRM detection
- `src/lib/ab-testing/statistics/novelty.ts` - Novelty effect
- `src/lib/ab-testing/statistics/drift.ts` - Drift detection
- `src/lib/ab-testing/guardrails/` - Guardrail evaluation
- `src/lib/ab-testing/stats/results.ts` - Results aggregation

---

## Tasks

### [PARALLEL] Core Statistics
- [ ] Implement Z-test for conversion rates
- [ ] Implement Welch's t-test for revenue
- [ ] Add helper functions (normalCDF, chiSquaredCDF, etc.)

### [PARALLEL] Bootstrap
- [ ] Implement bootstrap confidence intervals
- [ ] Add bootstrap difference between groups
- [ ] Optimize for performance (Web Workers if needed)

### [PARALLEL] CUPED
- [ ] Implement variance reduction algorithm
- [ ] Build pre-experiment data fetcher
- [ ] Add CUPED toggle in test settings

### [PARALLEL] Quality Detection
- [ ] Implement SRM chi-squared test
- [ ] Build novelty effect detection
- [ ] Create drift detection across dimensions
- [ ] Add background job for daily quality checks

### [SEQUENTIAL after quality] Guardrails
- [ ] Create guardrail configuration schema
- [ ] Build evaluation engine
- [ ] Implement auto-pause/stop actions
- [ ] Add guardrail dashboard data

### [SEQUENTIAL after core stats] LTV Analysis
- [ ] Build cohort tracking for converters
- [ ] Implement 30/60/90 day LTV calculation
- [ ] Add repurchase rate metrics
- [ ] Create LTV comparison view data

### [PARALLEL with all] Multiple Testing
- [ ] Implement Holm-Bonferroni correction
- [ ] Apply to 3+ variant test results
- [ ] Add correction indication in results

---

## Definition of Done

- [ ] Significance calculations match expected statistical formulas
- [ ] Bootstrap provides valid confidence intervals
- [ ] CUPED reduces variance by 20%+ on correlated data
- [ ] SRM correctly identifies traffic imbalances
- [ ] Novelty detection flags decaying lift patterns
- [ ] Guardrails auto-stop tests when violated
- [ ] LTV shows cohort performance at 30/60/90 days
- [ ] All calculations tenant-isolated
- [ ] `npx tsc --noEmit` passes

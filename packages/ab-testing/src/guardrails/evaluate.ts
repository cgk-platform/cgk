/**
 * Guardrail Evaluation Engine
 *
 * Evaluates guardrails against current test metrics and
 * triggers appropriate actions when violated.
 */

import type {
  Guardrail,
  GuardrailEvaluation,
  GuardrailMetrics,
  GuardrailOperator,
  GuardrailAlert,
} from './types.js'

/**
 * Evaluation context with callbacks for actions
 */
export interface EvaluationContext {
  /** Callback to get guardrails for a test */
  getGuardrails: (tenantId: string, testId: string) => Promise<Guardrail[]>
  /** Callback to get current metrics */
  getMetrics: (tenantId: string, testId: string) => Promise<GuardrailMetrics>
  /** Callback to pause a test */
  pauseTest?: (tenantId: string, testId: string, reason: string) => Promise<void>
  /** Callback to stop a test */
  stopTest?: (tenantId: string, testId: string, reason: string) => Promise<void>
  /** Callback to create an alert */
  createAlert?: (alert: Omit<GuardrailAlert, 'id' | 'createdAt'>) => Promise<void>
  /** Callback to log evaluation */
  logEvaluation?: (evaluation: GuardrailEvaluation) => Promise<void>
}

/**
 * Result of evaluating all guardrails for a test
 */
export interface GuardrailEvaluationResult {
  /** Test ID */
  testId: string
  /** Tenant ID */
  tenantId: string
  /** Individual guardrail evaluations */
  evaluations: GuardrailEvaluation[]
  /** Whether any guardrail was violated */
  hasViolations: boolean
  /** Number of violations by action type */
  violationCounts: {
    warn: number
    pause: number
    stop: number
  }
  /** Actions taken */
  actionsTaken: string[]
  /** Overall status */
  status: 'ok' | 'warning' | 'paused' | 'stopped'
  /** Timestamp */
  evaluatedAt: Date
}

/**
 * Evaluate all guardrails for a test
 *
 * @param tenantId - Tenant ID for isolation
 * @param testId - Test ID to evaluate
 * @param context - Evaluation context with callbacks
 * @returns Evaluation result
 */
export async function evaluateGuardrails(
  tenantId: string,
  testId: string,
  context: EvaluationContext
): Promise<GuardrailEvaluationResult> {
  const evaluatedAt = new Date()
  const actionsTaken: string[] = []

  // Get guardrails and metrics
  const guardrails = await context.getGuardrails(tenantId, testId)
  const metrics = await context.getMetrics(tenantId, testId)

  // Evaluate each guardrail
  const evaluations: GuardrailEvaluation[] = []
  const violationCounts = { warn: 0, pause: 0, stop: 0 }

  // Sort by priority (lower = higher priority)
  const sortedGuardrails = [...guardrails]
    .filter((g) => g.enabled)
    .sort((a, b) => a.priority - b.priority)

  for (const guardrail of sortedGuardrails) {
    const evaluation = evaluateSingleGuardrail(guardrail, metrics, evaluatedAt)
    evaluations.push(evaluation)

    // Log evaluation if callback provided
    if (context.logEvaluation) {
      await context.logEvaluation(evaluation)
    }

    if (evaluation.violated) {
      violationCounts[guardrail.action]++

      // Create alert
      if (context.createAlert) {
        await context.createAlert({
          tenantId,
          testId,
          guardrailId: guardrail.id,
          severity: guardrail.action === 'stop' ? 'critical' : 'warning',
          message: evaluation.message,
          evaluation,
          acknowledged: false,
        })
      }
    }
  }

  // Take actions based on violations (highest severity first)
  let status: 'ok' | 'warning' | 'paused' | 'stopped' = 'ok'

  if (violationCounts.stop > 0) {
    const stopViolation = evaluations.find(
      (e) => e.violated && e.guardrail.action === 'stop'
    )
    if (stopViolation && context.stopTest) {
      await context.stopTest(tenantId, testId, stopViolation.message)
      actionsTaken.push(`Test stopped: ${stopViolation.message}`)
      status = 'stopped'
    }
  } else if (violationCounts.pause > 0) {
    const pauseViolation = evaluations.find(
      (e) => e.violated && e.guardrail.action === 'pause'
    )
    if (pauseViolation && context.pauseTest) {
      await context.pauseTest(tenantId, testId, pauseViolation.message)
      actionsTaken.push(`Test paused: ${pauseViolation.message}`)
      status = 'paused'
    }
  } else if (violationCounts.warn > 0) {
    status = 'warning'
    const warnViolations = evaluations.filter(
      (e) => e.violated && e.guardrail.action === 'warn'
    )
    for (const v of warnViolations) {
      actionsTaken.push(`Warning: ${v.message}`)
    }
  }

  return {
    testId,
    tenantId,
    evaluations,
    hasViolations: violationCounts.warn + violationCounts.pause + violationCounts.stop > 0,
    violationCounts,
    actionsTaken,
    status,
    evaluatedAt,
  }
}

/**
 * Evaluate a single guardrail
 */
export function evaluateSingleGuardrail(
  guardrail: Guardrail,
  metrics: GuardrailMetrics,
  evaluatedAt: Date = new Date()
): GuardrailEvaluation {
  // Get metric values
  const metricData = metrics[guardrail.metricName]

  if (!metricData) {
    return {
      guardrail,
      currentValue: 0,
      baselineValue: 0,
      violated: false,
      severity: 'none',
      percentDifference: 0,
      message: `Metric "${guardrail.metricName}" not available`,
      evaluatedAt,
    }
  }

  const { control: baselineValue, variant: currentValue } = metricData

  // Calculate percent difference
  const percentDifference =
    baselineValue !== 0
      ? ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100
      : 0

  // Check if violated
  const violated = evaluateCondition(
    guardrail.operator,
    currentValue,
    baselineValue,
    guardrail.threshold,
    guardrail.percentTolerance
  )

  // Determine severity
  let severity: 'none' | 'warning' | 'critical' = 'none'
  if (violated) {
    severity = guardrail.action === 'stop' ? 'critical' : 'warning'
  }

  // Generate message
  const message = generateEvaluationMessage(
    guardrail,
    currentValue,
    baselineValue,
    percentDifference,
    violated
  )

  return {
    guardrail,
    currentValue,
    baselineValue,
    violated,
    severity,
    percentDifference,
    message,
    evaluatedAt,
  }
}

/**
 * Evaluate the guardrail condition
 */
function evaluateCondition(
  operator: GuardrailOperator,
  currentValue: number,
  baselineValue: number,
  threshold: number,
  percentTolerance?: number
): boolean {
  // For percent-based operators, we compare the percent change
  const percentChange =
    baselineValue !== 0
      ? ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100
      : 0

  switch (operator) {
    case 'greater_than':
      // Threshold is the minimum acceptable percent change
      // Violated if actual change is LESS than threshold
      // e.g., threshold = -10 means "change must be > -10%"
      // violated if change <= -10%
      return percentChange < threshold

    case 'less_than':
      // Threshold is the maximum acceptable percent change
      // Violated if actual change is MORE than threshold
      return percentChange > threshold

    case 'greater_than_or_equal':
      return percentChange < threshold

    case 'less_than_or_equal':
      return percentChange > threshold

    case 'within_percent': {
      // Value must be within X% of baseline
      const tolerance = percentTolerance ?? threshold
      return Math.abs(percentChange) > tolerance
    }

    case 'outside_percent': {
      // Value must be outside X% of baseline (for detecting significant changes)
      const tolerance = percentTolerance ?? threshold
      return Math.abs(percentChange) < tolerance
    }

    default:
      return false
  }
}

/**
 * Generate human-readable evaluation message
 */
function generateEvaluationMessage(
  guardrail: Guardrail,
  currentValue: number,
  baselineValue: number,
  percentDifference: number,
  violated: boolean
): string {
  const metricName = formatMetricName(guardrail.metricName)
  const changeDirection = percentDifference >= 0 ? 'increased' : 'decreased'
  const absChange = Math.abs(percentDifference).toFixed(1)
  const valueInfo = `(variant: ${currentValue.toFixed(2)}, control: ${baselineValue.toFixed(2)})`

  if (violated) {
    switch (guardrail.action) {
      case 'stop':
        return `CRITICAL: ${metricName} ${changeDirection} by ${absChange}% ${valueInfo} (threshold: ${guardrail.threshold}%). Test should be stopped.`
      case 'pause':
        return `WARNING: ${metricName} ${changeDirection} by ${absChange}% ${valueInfo} (threshold: ${guardrail.threshold}%). Test paused.`
      case 'warn':
        return `ALERT: ${metricName} ${changeDirection} by ${absChange}% ${valueInfo} (threshold: ${guardrail.threshold}%).`
    }
  }

  return `OK: ${metricName} within acceptable range (${percentDifference >= 0 ? '+' : ''}${percentDifference.toFixed(1)}%).`
}

/**
 * Format metric name for display
 */
function formatMetricName(metricName: string): string {
  return metricName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Check if a test should be auto-stopped based on guardrails
 */
export function shouldAutoStop(evaluations: GuardrailEvaluation[]): {
  shouldStop: boolean
  reason: string | null
} {
  const stopViolation = evaluations.find(
    (e) => e.violated && e.guardrail.action === 'stop'
  )

  if (stopViolation) {
    return {
      shouldStop: true,
      reason: stopViolation.message,
    }
  }

  return {
    shouldStop: false,
    reason: null,
  }
}

/**
 * Check if a test should be auto-paused based on guardrails
 */
export function shouldAutoPause(evaluations: GuardrailEvaluation[]): {
  shouldPause: boolean
  reason: string | null
} {
  const pauseViolation = evaluations.find(
    (e) => e.violated && e.guardrail.action === 'pause'
  )

  if (pauseViolation) {
    return {
      shouldPause: true,
      reason: pauseViolation.message,
    }
  }

  return {
    shouldPause: false,
    reason: null,
  }
}

/**
 * Get summary of guardrail status for a test
 */
export function getGuardrailSummary(result: GuardrailEvaluationResult): {
  healthy: number
  warning: number
  critical: number
  total: number
  statusMessage: string
} {
  const healthy = result.evaluations.filter((e) => !e.violated).length
  const warning = result.violationCounts.warn + result.violationCounts.pause
  const critical = result.violationCounts.stop
  const total = result.evaluations.length

  let statusMessage: string
  if (critical > 0) {
    statusMessage = `${critical} critical guardrail(s) violated`
  } else if (warning > 0) {
    statusMessage = `${warning} guardrail warning(s)`
  } else {
    statusMessage = 'All guardrails healthy'
  }

  return {
    healthy,
    warning,
    critical,
    total,
    statusMessage,
  }
}

/**
 * Calculate minimum sample size before evaluating guardrails
 */
export function getMinimumSampleForGuardrails(guardrails: Guardrail[]): number {
  // Need enough samples to detect meaningful changes
  // Use the most sensitive threshold to determine minimum
  let minSamples = 100

  for (const guardrail of guardrails) {
    if (guardrail.operator === 'within_percent' || guardrail.operator === 'outside_percent') {
      const tolerance = guardrail.percentTolerance ?? guardrail.threshold
      // Smaller tolerance requires more samples
      const needed = Math.ceil(1000 / Math.max(1, tolerance))
      minSamples = Math.max(minSamples, needed)
    }
  }

  return Math.min(minSamples, 1000) // Cap at 1000
}

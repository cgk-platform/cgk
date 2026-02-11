/**
 * Threshold evaluation logic for health monitoring
 *
 * Determines alert severity based on metric values and thresholds.
 */

import type { AlertSeverity, HealthStatus, ThresholdConfig } from './types.js'

/**
 * Threshold evaluation result
 */
export type ThresholdResult = 'healthy' | 'warning' | 'critical'

/**
 * Evaluate a metric against thresholds (higher is worse)
 *
 * Use for metrics like latency, error rate, memory usage
 * where exceeding the threshold is bad.
 *
 * @param value - Current metric value
 * @param thresholds - Warning and critical thresholds
 * @returns Evaluation result
 */
export function evaluateThreshold(
  value: number,
  thresholds: ThresholdConfig
): ThresholdResult {
  if (value >= thresholds.critical) return 'critical'
  if (value >= thresholds.warning) return 'warning'
  return 'healthy'
}

/**
 * Evaluate a metric against thresholds (lower is worse)
 *
 * Use for metrics like rate limit remaining, availability
 * where going below the threshold is bad.
 *
 * @param value - Current metric value
 * @param thresholds - Warning and critical thresholds
 * @returns Evaluation result
 */
export function evaluateThresholdInverse(
  value: number,
  thresholds: ThresholdConfig
): ThresholdResult {
  if (value <= thresholds.critical) return 'critical'
  if (value <= thresholds.warning) return 'warning'
  return 'healthy'
}

/**
 * Convert threshold result to health status
 */
export function thresholdResultToHealthStatus(result: ThresholdResult): HealthStatus {
  switch (result) {
    case 'healthy':
      return 'healthy'
    case 'warning':
      return 'degraded'
    case 'critical':
      return 'unhealthy'
  }
}

/**
 * Convert threshold result to alert severity
 */
export function thresholdResultToSeverity(result: ThresholdResult): AlertSeverity | null {
  switch (result) {
    case 'critical':
      return 'p1'
    case 'warning':
      return 'p2'
    case 'healthy':
      return null
  }
}

/**
 * Determine if an alert should be created based on threshold result
 */
export function shouldAlert(result: ThresholdResult): boolean {
  return result !== 'healthy'
}

/**
 * Evaluate latency-based health status
 *
 * @param latencyMs - Response time in milliseconds
 * @param healthyThreshold - Max latency for healthy status (default 100ms)
 * @param degradedThreshold - Max latency for degraded status (default 500ms)
 * @returns Health status
 */
export function evaluateLatencyHealth(
  latencyMs: number,
  healthyThreshold = 100,
  degradedThreshold = 500
): HealthStatus {
  if (latencyMs < healthyThreshold) return 'healthy'
  if (latencyMs < degradedThreshold) return 'degraded'
  return 'unhealthy'
}

/**
 * Aggregate multiple health statuses into overall status
 *
 * Returns the worst status among all inputs.
 */
export function aggregateHealthStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.length === 0) return 'unknown'
  if (statuses.includes('unhealthy')) return 'unhealthy'
  if (statuses.includes('degraded')) return 'degraded'
  if (statuses.includes('unknown')) return 'unknown'
  return 'healthy'
}

/**
 * Count health statuses
 */
export function countHealthStatuses(statuses: HealthStatus[]): {
  healthy: number
  degraded: number
  unhealthy: number
  unknown: number
} {
  const counts = { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 }
  for (const status of statuses) {
    counts[status]++
  }
  return counts
}

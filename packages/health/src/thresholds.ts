/**
 * Health monitoring thresholds configuration
 *
 * These define when metrics trigger warning/critical alerts.
 * Thresholds can be overridden per-tenant via settings.
 */

import type { ThresholdConfig } from './types.js'

/**
 * Default threshold configurations for all monitored metrics
 */
export const DEFAULT_THRESHOLDS = {
  database: {
    connectionPool: { warning: 70, critical: 90 } as ThresholdConfig,
    queryLatencyP95: { warning: 200, critical: 500 } as ThresholdConfig,
    failedQueries: { warning: 5, critical: 20 } as ThresholdConfig,
  },
  redis: {
    memoryUsage: { warning: 70, critical: 90 } as ThresholdConfig,
    connectionCount: { warning: 100, critical: 200 } as ThresholdConfig,
    evictionRate: { warning: 10, critical: 100 } as ThresholdConfig,
  },
  api: {
    errorRate: { warning: 1, critical: 5 } as ThresholdConfig,
    latencyP95: { warning: 500, critical: 2000 } as ThresholdConfig,
    latencyP99: { warning: 1000, critical: 5000 } as ThresholdConfig,
  },
  inngest: {
    failedJobsHour: { warning: 10, critical: 50 } as ThresholdConfig,
    pendingJobs: { warning: 1000, critical: 5000 } as ThresholdConfig,
    avgExecutionTime: { warning: 30000, critical: 60000 } as ThresholdConfig,
  },
  webhooks: {
    deliveryFailure: { warning: 5, critical: 20 } as ThresholdConfig,
    queueDepth: { warning: 100, critical: 500 } as ThresholdConfig,
    avgDeliveryTime: { warning: 5000, critical: 30000 } as ThresholdConfig,
  },
  shopify: {
    rateLimitRemaining: { warning: 20, critical: 5 } as ThresholdConfig,
    syncLag: { warning: 300, critical: 900 } as ThresholdConfig,
  },
  stripe: {
    webhookDelay: { warning: 60, critical: 300 } as ThresholdConfig,
    failedPayments: { warning: 5, critical: 20 } as ThresholdConfig,
  },
  mcp: {
    responseTime: { warning: 1000, critical: 5000 } as ThresholdConfig,
    errorRate: { warning: 5, critical: 20 } as ThresholdConfig,
  },
  general: {
    latencyMs: { warning: 500, critical: 2000 } as ThresholdConfig,
    errorRate: { warning: 5, critical: 20 } as ThresholdConfig,
  },
} as const

export type ThresholdCategory = keyof typeof DEFAULT_THRESHOLDS
export type ThresholdMetric<T extends ThresholdCategory> = keyof (typeof DEFAULT_THRESHOLDS)[T]

/**
 * Get threshold for a specific service and metric
 */
export function getThreshold(
  category: ThresholdCategory,
  metric: string
): ThresholdConfig {
  const categoryThresholds = DEFAULT_THRESHOLDS[category] as Record<string, ThresholdConfig>
  return categoryThresholds[metric] || DEFAULT_THRESHOLDS.general.latencyMs
}

/**
 * Merge custom thresholds with defaults
 */
export function mergeThresholds(
  category: ThresholdCategory,
  customThresholds?: Partial<Record<string, ThresholdConfig>>
): Record<string, ThresholdConfig> {
  const defaults = DEFAULT_THRESHOLDS[category] as Record<string, ThresholdConfig>
  if (!customThresholds) {
    return { ...defaults }
  }

  // Filter out undefined values from custom thresholds
  const validCustom: Record<string, ThresholdConfig> = {}
  for (const [key, value] of Object.entries(customThresholds)) {
    if (value !== undefined) {
      validCustom[key] = value
    }
  }

  return {
    ...defaults,
    ...validCustom,
  }
}

/**
 * Guardrail Types
 *
 * Defines types for A/B test guardrails that protect key metrics
 * during experiments.
 */

/**
 * Guardrail definition
 */
export interface Guardrail {
  /** Unique identifier */
  id: string
  /** Test this guardrail belongs to */
  testId: string
  /** Tenant ID for isolation */
  tenantId: string
  /** Name of the metric to monitor */
  metricName: GuardrailMetric
  /** Human-readable description */
  description?: string
  /** Threshold value */
  threshold: number
  /** Comparison operator */
  operator: GuardrailOperator
  /** Tolerance percentage for 'within_percent' operator */
  percentTolerance?: number
  /** Action to take when violated */
  action: GuardrailAction
  /** Whether this guardrail is active */
  enabled: boolean
  /** Priority (lower = higher priority) */
  priority: number
  /** When the guardrail was created */
  createdAt: Date
  /** When the guardrail was last updated */
  updatedAt: Date
}

/**
 * Common guardrail metrics
 */
export type GuardrailMetric =
  | 'conversion_rate'
  | 'revenue_per_visitor'
  | 'average_order_value'
  | 'add_to_cart_rate'
  | 'checkout_rate'
  | 'bounce_rate'
  | 'page_load_time'
  | 'error_rate'
  | 'refund_rate'
  | 'custom'

/**
 * Guardrail comparison operators
 */
export type GuardrailOperator =
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'within_percent'
  | 'outside_percent'

/**
 * Actions when guardrail is violated
 */
export type GuardrailAction = 'warn' | 'pause' | 'stop'

/**
 * Result of evaluating a single guardrail
 */
export interface GuardrailEvaluation {
  /** The guardrail that was evaluated */
  guardrail: Guardrail
  /** Current value of the metric in variant */
  currentValue: number
  /** Baseline value of the metric in control */
  baselineValue: number
  /** Whether the guardrail was violated */
  violated: boolean
  /** Severity of the violation (if violated) */
  severity: 'none' | 'warning' | 'critical'
  /** Percentage difference from baseline */
  percentDifference: number
  /** Human-readable message */
  message: string
  /** Timestamp of evaluation */
  evaluatedAt: Date
}

/**
 * Input for creating a guardrail
 */
export interface CreateGuardrailInput {
  testId: string
  metricName: GuardrailMetric
  description?: string
  threshold: number
  operator: GuardrailOperator
  percentTolerance?: number
  action: GuardrailAction
  priority?: number
}

/**
 * Input for updating a guardrail
 */
export interface UpdateGuardrailInput {
  description?: string
  threshold?: number
  operator?: GuardrailOperator
  percentTolerance?: number
  action?: GuardrailAction
  enabled?: boolean
  priority?: number
}

/**
 * Metrics data for guardrail evaluation
 */
export interface GuardrailMetrics {
  /** Metric values by variant */
  [metricName: string]: {
    control: number
    variant: number
    controlSampleSize: number
    variantSampleSize: number
  }
}

/**
 * Test status change request
 */
export interface TestStatusChange {
  testId: string
  tenantId: string
  newStatus: 'paused' | 'completed'
  reason: string
  triggeredBy: 'guardrail' | 'manual' | 'scheduled'
  guardrailId?: string
  timestamp: Date
}

/**
 * Guardrail alert notification
 */
export interface GuardrailAlert {
  id: string
  tenantId: string
  testId: string
  guardrailId: string
  severity: 'warning' | 'critical'
  message: string
  evaluation: GuardrailEvaluation
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  createdAt: Date
}

/**
 * Common guardrail presets
 */
export const GUARDRAIL_PRESETS: Record<string, CreateGuardrailInput[]> = {
  revenue_protection: [
    {
      testId: '', // To be filled in
      metricName: 'revenue_per_visitor',
      description: 'Protect against significant revenue decrease',
      threshold: -10,
      operator: 'greater_than',
      action: 'stop',
    },
    {
      testId: '',
      metricName: 'conversion_rate',
      description: 'Protect against significant conversion rate drop',
      threshold: -15,
      operator: 'greater_than',
      action: 'pause',
    },
  ],
  user_experience: [
    {
      testId: '',
      metricName: 'bounce_rate',
      description: 'Alert if bounce rate increases significantly',
      threshold: 20,
      operator: 'less_than',
      action: 'warn',
    },
    {
      testId: '',
      metricName: 'error_rate',
      description: 'Stop if error rate exceeds threshold',
      threshold: 5,
      operator: 'less_than',
      action: 'stop',
    },
  ],
  ecommerce: [
    {
      testId: '',
      metricName: 'add_to_cart_rate',
      description: 'Protect add to cart rate',
      threshold: -20,
      operator: 'greater_than',
      action: 'warn',
    },
    {
      testId: '',
      metricName: 'checkout_rate',
      description: 'Protect checkout completion rate',
      threshold: -15,
      operator: 'greater_than',
      action: 'pause',
    },
    {
      testId: '',
      metricName: 'refund_rate',
      description: 'Alert if refund rate increases',
      threshold: 50,
      operator: 'less_than',
      action: 'warn',
    },
  ],
}

/**
 * Get preset guardrails for a test
 */
export function getPresetGuardrails(
  presetName: keyof typeof GUARDRAIL_PRESETS,
  testId: string
): CreateGuardrailInput[] {
  const presets = GUARDRAIL_PRESETS[presetName]
  if (!presets) return []

  return presets.map((preset) => ({
    ...preset,
    testId,
  }))
}

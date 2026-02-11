/**
 * A/B Testing Guardrails
 *
 * Protects key metrics during experiments by monitoring for
 * significant degradation and automatically taking action.
 */

// Types
export {
  type Guardrail,
  type GuardrailMetric,
  type GuardrailOperator,
  type GuardrailAction,
  type GuardrailEvaluation,
  type GuardrailMetrics,
  type GuardrailAlert,
  type TestStatusChange,
  type CreateGuardrailInput,
  type UpdateGuardrailInput,
  GUARDRAIL_PRESETS,
  getPresetGuardrails,
} from './types.js'

// Evaluation
export {
  evaluateGuardrails,
  evaluateSingleGuardrail,
  shouldAutoStop,
  shouldAutoPause,
  getGuardrailSummary,
  getMinimumSampleForGuardrails,
  type EvaluationContext,
  type GuardrailEvaluationResult,
} from './evaluate.js'

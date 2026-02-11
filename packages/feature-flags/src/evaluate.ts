/**
 * Flag Evaluation Logic
 *
 * Implements the full evaluation order:
 * 1. Flag disabled/archived -> return default
 * 2. Schedule check -> outside window returns default
 * 3. User override (highest priority)
 * 4. Tenant override
 * 5. Disabled tenants list
 * 6. Enabled tenants list
 * 7. Enabled users list
 * 8. Percentage rollout (consistent hash)
 * 9. Variant selection (weighted hash)
 * 10. Default value
 */

import { isInRollout, selectVariantSync } from './hash.js'
import type {
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  FlagOverride,
  ScheduleWindow,
} from './types.js'

/**
 * Evaluate a feature flag
 *
 * @param flag - The flag to evaluate
 * @param context - Evaluation context (tenant, user, environment)
 * @param overrides - Active overrides for this flag
 * @returns Evaluation result
 */
export function evaluateFlag(
  flag: FeatureFlag,
  context: EvaluationContext,
  overrides: FlagOverride[] = []
): EvaluationResult {
  const startTime = performance.now()

  // 1. Flag disabled/archived -> return default
  if (flag.status === 'disabled' || flag.status === 'archived') {
    return createResult(flag, flag.defaultValue, 'flag_disabled', startTime)
  }

  // 2. Environment check (if specified)
  if (flag.targeting.environments && flag.targeting.environments.length > 0) {
    const currentEnv = context.environment || getEnvironment()
    if (!flag.targeting.environments.includes(currentEnv)) {
      return createResult(flag, flag.defaultValue, 'environment_mismatch', startTime)
    }
  }

  // 3. Schedule check -> outside window returns default
  if (flag.targeting.schedule) {
    if (!isWithinSchedule(flag.targeting.schedule)) {
      return createResult(flag, flag.defaultValue, 'schedule_inactive', startTime)
    }
  }

  // 4. User override (highest priority)
  if (context.userId) {
    const userOverride = overrides.find(
      (o) => o.userId === context.userId && !o.tenantId && isOverrideActive(o)
    )
    if (userOverride) {
      return createResult(flag, userOverride.value, 'user_override', startTime)
    }
  }

  // 5. Tenant override
  if (context.tenantId) {
    const tenantOverride = overrides.find(
      (o) => o.tenantId === context.tenantId && !o.userId && isOverrideActive(o)
    )
    if (tenantOverride) {
      return createResult(flag, tenantOverride.value, 'tenant_override', startTime)
    }
  }

  // 6. Disabled tenants list
  if (context.tenantId && flag.targeting.disabledTenants?.length) {
    if (flag.targeting.disabledTenants.includes(context.tenantId)) {
      return createResult(flag, flag.defaultValue, 'disabled_tenant', startTime)
    }
  }

  // 7. Enabled tenants list
  if (context.tenantId && flag.targeting.enabledTenants?.length) {
    if (flag.targeting.enabledTenants.includes(context.tenantId)) {
      return createResult(flag, true, 'enabled_tenant', startTime)
    }
  }

  // 8. Enabled users list
  if (context.userId && flag.targeting.enabledUsers?.length) {
    if (flag.targeting.enabledUsers.includes(context.userId)) {
      return createResult(flag, true, 'enabled_user', startTime)
    }
  }

  // 9. Variant selection (for variant type)
  if (flag.type === 'variant' && flag.targeting.variants?.length) {
    const identifier = getHashIdentifier(context)
    const variant = selectVariantSync(identifier, flag.salt, flag.targeting.variants)
    return createResult(flag, variant, 'variant_selection', startTime, variant)
  }

  // 10. Percentage rollout (for percentage type or any type with percentage)
  if (flag.targeting.percentage !== undefined && flag.targeting.percentage > 0) {
    const identifier = getHashIdentifier(context)
    if (isInRollout(identifier, flag.salt, flag.targeting.percentage)) {
      if (flag.type === 'percentage') {
        return createResult(flag, true, 'percentage_rollout', startTime)
      }
      // For variant flags with percentage, select variant
      if (flag.type === 'variant' && flag.targeting.variants?.length) {
        const variant = selectVariantSync(identifier, flag.salt, flag.targeting.variants)
        return createResult(flag, variant, 'percentage_rollout', startTime, variant)
      }
      return createResult(flag, true, 'percentage_rollout', startTime)
    }
    // Not in rollout, return default
    return createResult(flag, flag.defaultValue, 'default_value', startTime)
  }

  // 11. Schedule active (if we got here, schedule was checked and is active)
  if (flag.type === 'schedule' && flag.targeting.schedule) {
    return createResult(flag, true, 'schedule_active', startTime)
  }

  // 12. Default value
  return createResult(flag, flag.defaultValue, 'default_value', startTime)
}

/**
 * Check if within schedule window
 */
function isWithinSchedule(schedule: ScheduleWindow): boolean {
  const now = new Date()
  const start = new Date(schedule.startDate)
  const end = new Date(schedule.endDate)

  // Handle timezone if specified
  if (schedule.timezone && schedule.timezone !== 'UTC') {
    // For now, we use UTC. Timezone support could be added with date-fns-tz
    // This is a simplification - in production, use proper timezone handling
  }

  return now >= start && now <= end
}

/**
 * Check if override is still active (not expired)
 */
function isOverrideActive(override: FlagOverride): boolean {
  if (!override.expiresAt) return true
  return new Date() < new Date(override.expiresAt)
}

/**
 * Get identifier for hashing
 * Prefers userId, falls back to tenantId, then 'anonymous'
 */
function getHashIdentifier(context: EvaluationContext): string {
  return context.userId || context.tenantId || 'anonymous'
}

/**
 * Get current environment
 */
function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV || process.env.VERCEL_ENV || 'development'
  if (env === 'production') return 'production'
  if (env === 'preview' || env === 'staging') return 'staging'
  return 'development'
}

/**
 * Create evaluation result
 */
function createResult(
  flag: FeatureFlag,
  value: boolean | string,
  reason: EvaluationResult['reason'],
  startTime: number,
  variant?: string
): EvaluationResult {
  const enabled = typeof value === 'boolean' ? value : true

  return {
    value,
    enabled,
    reason,
    variant,
    flagKey: flag.key,
    metadata: {
      evaluationTimeMs: performance.now() - startTime,
    },
  }
}

/**
 * Evaluate multiple flags at once
 */
export function evaluateFlags(
  flags: FeatureFlag[],
  context: EvaluationContext,
  overrides: FlagOverride[] = []
): Record<string, EvaluationResult> {
  const results: Record<string, EvaluationResult> = {}

  for (const flag of flags) {
    const flagOverrides = overrides.filter((o) => o.flagId === flag.id || o.flagKey === flag.key)
    results[flag.key] = evaluateFlag(flag, context, flagOverrides)
  }

  return results
}

/**
 * Quick check if a flag is enabled (boolean result only)
 */
export function isFlagEnabled(
  flag: FeatureFlag,
  context: EvaluationContext,
  overrides: FlagOverride[] = []
): boolean {
  const result = evaluateFlag(flag, context, overrides)
  return result.enabled
}

/**
 * Get variant for a flag
 */
export function getFlagVariant(
  flag: FeatureFlag,
  context: EvaluationContext,
  overrides: FlagOverride[] = []
): string | undefined {
  const result = evaluateFlag(flag, context, overrides)
  return result.variant
}

/**
 * Feature Flags Server SDK
 *
 * Server-side helpers for evaluating feature flags in API routes
 * and server components.
 */

import { getGlobalFlagCache } from './cache.js'
import { evaluateFlag } from './evaluate.js'
import {
  getAllFlags as getAllFlagsFromDb,
  getFlagByKey,
  getOverridesForContext,
} from './repository.js'
import type {
  BulkEvaluationResult,
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
} from './types.js'

/**
 * Server-side flag service configuration
 */
export interface FlagServiceConfig {
  /** Enable caching (default: true) */
  cacheEnabled?: boolean
  /** Memory cache TTL in ms (default: 10000) */
  memoryCacheTtlMs?: number
  /** Redis cache TTL in seconds (default: 60) */
  redisCacheTtlSeconds?: number
}

/**
 * Initialize the flag service
 */
export function initFlagService(_config: FlagServiceConfig = {}): void {
  // Pre-warm the cache
  getAllFlags().catch((err) => {
    console.warn('[feature-flags] Failed to pre-warm cache:', err)
  })
}

/**
 * Get all feature flags (with caching)
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  const cache = getGlobalFlagCache()

  // Try cache first
  const cached = await cache.getAllFlags()
  if (cached.length > 0) {
    return cached
  }

  // Fetch from database
  const flags = await getAllFlagsFromDb()

  // Populate cache
  await cache.setAllFlags(flags)

  return flags
}

/**
 * Get a single flag by key (with caching)
 */
export async function getFlag(key: string): Promise<FeatureFlag | null> {
  const cache = getGlobalFlagCache()

  // Try cache first
  const cached = await cache.getFlag(key)
  if (cached) {
    return cached
  }

  // Fetch from database
  const flag = await getFlagByKey(key)
  if (!flag) {
    return null
  }

  // Populate cache
  await cache.setFlag(flag)

  return flag
}

/**
 * Check if a feature flag is enabled
 *
 * @example
 * ```ts
 * // In API route
 * const isNewCheckout = await isEnabled('checkout.new_flow', {
 *   tenantId: 'rawdog',
 *   userId: 'user_123'
 * })
 * ```
 */
export async function isEnabled(key: string, context: EvaluationContext = {}): Promise<boolean> {
  const flag = await getFlag(key)
  if (!flag) {
    return false
  }

  // Get overrides for this context
  const overrides = await getOverridesForContext(key, context.tenantId, context.userId)

  const result = evaluateFlag(flag, context, overrides)
  return result.enabled
}

/**
 * Get the variant for a feature flag
 *
 * @example
 * ```ts
 * const checkoutVariant = await getVariant('checkout.ab_test', {
 *   tenantId: 'rawdog',
 *   userId: 'user_123'
 * })
 * // Returns 'control' | 'v2' | 'v3'
 * ```
 */
export async function getVariant(
  key: string,
  context: EvaluationContext = {}
): Promise<string | null> {
  const flag = await getFlag(key)
  if (!flag || flag.type !== 'variant') {
    return null
  }

  const overrides = await getOverridesForContext(key, context.tenantId, context.userId)
  const result = evaluateFlag(flag, context, overrides)

  return result.variant || null
}

/**
 * Get the full evaluation result for a flag
 *
 * @example
 * ```ts
 * const result = await evaluate('checkout.new_flow', {
 *   tenantId: 'rawdog',
 *   userId: 'user_123'
 * })
 * // result.enabled, result.reason, result.variant
 * ```
 */
export async function evaluate(
  key: string,
  context: EvaluationContext = {}
): Promise<EvaluationResult> {
  const startTime = performance.now()
  const cache = getGlobalFlagCache()

  const flag = await getFlag(key)
  if (!flag) {
    return {
      value: false,
      enabled: false,
      reason: 'not_found',
      flagKey: key,
      metadata: {
        evaluationTimeMs: performance.now() - startTime,
      },
    }
  }

  const overrides = await getOverridesForContext(key, context.tenantId, context.userId)
  const result = evaluateFlag(flag, context, overrides)

  // Check if result came from cache
  const stats = cache.getStats()
  result.metadata = {
    ...result.metadata,
    evaluationTimeMs: performance.now() - startTime,
    fromCache: stats.memoryHits > 0 || stats.redisHits > 0,
    cacheLayer: stats.memoryHits > 0 ? 'memory' : stats.redisHits > 0 ? 'redis' : undefined,
  }

  return result
}

/**
 * Evaluate multiple flags at once
 *
 * More efficient than calling evaluate() multiple times
 *
 * @example
 * ```ts
 * const results = await evaluateFlags(
 *   ['checkout.new_flow', 'payments.wise_enabled'],
 *   { tenantId: 'rawdog' }
 * )
 * ```
 */
export async function evaluateFlags(
  keys: string[],
  context: EvaluationContext = {}
): Promise<BulkEvaluationResult> {
  const startTime = performance.now()

  // Get all flags at once
  const allFlags = await getAllFlags()
  const requestedFlags = allFlags.filter((f) => keys.includes(f.key))

  // Build a map of overrides per flag
  const overridesMap: Record<string, Awaited<ReturnType<typeof getOverridesForContext>>> = {}
  for (const flag of requestedFlags) {
    overridesMap[flag.key] = await getOverridesForContext(flag.key, context.tenantId, context.userId)
  }

  // Evaluate all flags
  const results: Record<string, EvaluationResult> = {}
  for (const flag of requestedFlags) {
    results[flag.key] = evaluateFlag(flag, context, overridesMap[flag.key])
  }

  // Add not-found entries for missing flags
  for (const key of keys) {
    if (!results[key]) {
      results[key] = {
        value: false,
        enabled: false,
        reason: 'not_found',
        flagKey: key,
      }
    }
  }

  return {
    results,
    evaluationTimeMs: performance.now() - startTime,
  }
}

/**
 * Evaluate all flags for a context
 *
 * Useful for sending to client for React hooks
 */
export async function evaluateAllFlags(
  context: EvaluationContext = {}
): Promise<BulkEvaluationResult> {
  const startTime = performance.now()

  const flags = await getAllFlags()
  const keys = flags.map((f) => f.key)

  // Reuse evaluateFlags
  const result = await evaluateFlags(keys, context)
  result.evaluationTimeMs = performance.now() - startTime

  return result
}

/**
 * Invalidate a flag in the cache
 *
 * Call this after updating a flag
 */
export async function invalidateFlag(key: string): Promise<void> {
  const cache = getGlobalFlagCache()
  await cache.invalidateFlag(key)
}

/**
 * Invalidate all flags in the cache
 */
export async function invalidateAllFlags(): Promise<void> {
  const cache = getGlobalFlagCache()
  await cache.invalidateAll()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const cache = getGlobalFlagCache()
  return cache.getStats()
}

/**
 * Create a context-bound flag evaluator
 *
 * Useful when you have a fixed context (e.g., in middleware)
 *
 * @example
 * ```ts
 * const flags = createFlagEvaluator({ tenantId: 'rawdog', userId: 'user_123' })
 *
 * if (await flags.isEnabled('checkout.new_flow')) {
 *   // ...
 * }
 * ```
 */
export function createFlagEvaluator(context: EvaluationContext) {
  return {
    isEnabled: (key: string) => isEnabled(key, context),
    getVariant: (key: string) => getVariant(key, context),
    evaluate: (key: string) => evaluate(key, context),
    evaluateMany: (keys: string[]) => evaluateFlags(keys, context),
    evaluateAll: () => evaluateAllFlags(context),
  }
}

/**
 * Type-safe flag check with default value
 *
 * @example
 * ```ts
 * const showNewCheckout = await isEnabledWithDefault('checkout.new_flow', false, context)
 * ```
 */
export async function isEnabledWithDefault(
  key: string,
  defaultValue: boolean,
  context: EvaluationContext = {}
): Promise<boolean> {
  const flag = await getFlag(key)
  if (!flag) {
    return defaultValue
  }

  const overrides = await getOverridesForContext(key, context.tenantId, context.userId)
  const result = evaluateFlag(flag, context, overrides)

  return result.enabled
}

/**
 * Get variant with default
 */
export async function getVariantWithDefault(
  key: string,
  defaultValue: string,
  context: EvaluationContext = {}
): Promise<string> {
  const variant = await getVariant(key, context)
  return variant ?? defaultValue
}

// =============================================================================
// Re-export Repository (database operations)
// =============================================================================
export {
  createFlag,
  createOverride,
  deleteFlag,
  deleteOverride,
  getAllAuditEntries,
  getAllFlags as getAllFlagsFromDb,
  getAuditLog,
  getCategories,
  getFlagById,
  getFlagByKey,
  getFlags,
  getOverridesForContext,
  getOverridesForFlag,
  killFlag,
  seedFlags,
  updateFlag,
} from './repository.js'

// =============================================================================
// Re-export Cache
// =============================================================================
export {
  createFlagCache,
  getGlobalFlagCache,
  MultiLayerFlagCache,
  resetGlobalFlagCache,
  type CacheStats,
  type FlagCache,
  type FlagCacheConfig,
} from './cache.js'

// =============================================================================
// Re-export Seeding
// =============================================================================
export {
  ensurePlatformFlagsExist,
  needsSeeding,
  seedPlatformFlags,
} from './seed.js'

// =============================================================================
// Re-export Types (for convenience)
// =============================================================================
export type {
  BulkEvaluationResult,
  CreateFlagInput,
  CreateOverrideInput,
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  FlagAuditEntry,
  FlagListFilters,
  FlagListPagination,
  FlagListResult,
  FlagOverride,
  FlagStatus,
  FlagTargeting,
  FlagType,
  FlagVariant,
  UpdateFlagInput,
} from './types.js'

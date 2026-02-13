/**
 * @cgk-platform/feature-flags - Feature Flag System
 *
 * Client-safe exports only. For server-side operations (database, caching),
 * import from '@cgk-platform/feature-flags/server'.
 *
 * @example
 * ```ts
 * // Client-safe (works in browser and server)
 * import { type FeatureFlag, isValidFlagKey, evaluateFlag } from '@cgk-platform/feature-flags'
 *
 * // Server-only (API routes, server components)
 * import { isEnabled, getVariant, createFlag } from '@cgk-platform/feature-flags/server'
 *
 * // React components
 * import { useFlag, FlagProvider } from '@cgk-platform/feature-flags/react'
 * ```
 */

// =============================================================================
// Types (client-safe)
// =============================================================================
export {
  FLAG_KEY_REGEX,
  isValidFlagKey,
  type BulkEvaluationResult,
  type CreateFlagInput,
  type CreateOverrideInput,
  type EvaluationContext,
  type EvaluationResult,
  type EvaluationReason,
  type FeatureFlag,
  type FlagAuditEntry,
  type FlagListFilters,
  type FlagListPagination,
  type FlagListResult,
  type FlagOverride,
  type FlagStatus,
  type FlagTargeting,
  type FlagType,
  type FlagVariant,
  type PlatformFlagCategory,
  type PlatformFlagDefinition,
  type ScheduleWindow,
  type UpdateFlagInput,
} from './types.js'

// =============================================================================
// Hashing (client-safe - uses Web Crypto API)
// =============================================================================
export {
  computeRolloutHash,
  computeRolloutHashSync,
  generateFlagSalt,
  isInRollout,
  isInRolloutAsync,
  selectVariant,
  selectVariantSync,
} from './hash.js'

// =============================================================================
// Pure Evaluation Logic (client-safe - no DB/cache deps)
// =============================================================================
export {
  evaluateFlag,
  evaluateFlags,
  getFlagVariant,
  isFlagEnabled,
} from './evaluate.js'

// =============================================================================
// Platform Flag Definitions (client-safe - just constants)
// =============================================================================
export {
  getPlatformFlagDefinition,
  getPlatformFlagKeys,
  getPlatformFlagsByCategory,
  PLATFORM_FLAG_CATEGORIES,
  PLATFORM_FLAGS,
} from './platform-flags.js'

// =============================================================================
// NOTE: For server-side operations, import from '@cgk-platform/feature-flags/server'
//
// Server-only exports (NOT available from main entry):
// - createFlag, updateFlag, deleteFlag, killFlag (repository)
// - getFlag, getAllFlags, getFlags (repository)
// - isEnabled, getVariant, evaluate (server SDK)
// - seedPlatformFlags, ensurePlatformFlagsExist (seeding)
// - createFlagCache, getGlobalFlagCache (caching)
// - invalidateFlag, invalidateAllFlags (cache invalidation)
// =============================================================================

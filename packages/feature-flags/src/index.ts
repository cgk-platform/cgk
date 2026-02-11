/**
 * @cgk/feature-flags - Feature Flag System
 *
 * Complete feature flag system with 6 flag types, consistent hashing
 * for stable rollouts, and multi-layer caching.
 *
 * @ai-pattern feature-flags
 * @ai-note Use isEnabled() for server-side checks, useFlag() for client-side
 */

// Types
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

// Hashing
export {
  computeRolloutHash,
  computeRolloutHashSync,
  generateFlagSalt,
  isInRollout,
  isInRolloutAsync,
  selectVariant,
  selectVariantSync,
} from './hash.js'

// Evaluation
export {
  evaluateFlag,
  evaluateFlags,
  getFlagVariant,
  isFlagEnabled,
} from './evaluate.js'

// Cache
export {
  createFlagCache,
  getGlobalFlagCache,
  MultiLayerFlagCache,
  resetGlobalFlagCache,
  type CacheStats,
  type FlagCache,
  type FlagCacheConfig,
} from './cache.js'

// Repository
export {
  createFlag,
  createOverride,
  deleteFlag,
  deleteOverride,
  getAllAuditEntries,
  getAllFlags,
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

// Platform flags
export {
  getPlatformFlagDefinition,
  getPlatformFlagKeys,
  getPlatformFlagsByCategory,
  PLATFORM_FLAG_CATEGORIES,
  PLATFORM_FLAGS,
} from './platform-flags.js'

// Seeding
export {
  ensurePlatformFlagsExist,
  needsSeeding,
  seedPlatformFlags,
} from './seed.js'

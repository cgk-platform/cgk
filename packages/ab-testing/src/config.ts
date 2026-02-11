/**
 * A/B Testing Configuration
 */

/**
 * Cookie configuration
 */
export const AB_COOKIE_NAME = '_cgk_ab'
export const AB_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year in seconds

/**
 * Visitor ID length (ULID-style)
 */
export const VISITOR_ID_LENGTH = 21

/**
 * Default confidence levels
 */
export const DEFAULT_CONFIDENCE_LEVEL = 0.95
export const SUPPORTED_CONFIDENCE_LEVELS = [0.9, 0.95, 0.99] as const

/**
 * MAB configuration
 */
export const MAB_CONFIG = {
  /** How often to recompute allocations (in ms) */
  reallocationIntervalMs: 60 * 60 * 1000, // 1 hour
  /** Minimum samples before MAB kicks in */
  minSamplesForMab: 100,
  /** Number of Monte Carlo samples for allocation estimation */
  monteCarloSamples: 1000,
  /** Minimum allocation for any variant (prevents starvation) */
  minAllocationPercent: 5,
  /** Exploration bonus for new variants */
  explorationBonus: 0.1,
} as const

/**
 * Event tracking configuration
 */
export const EVENT_CONFIG = {
  /** Maximum events to batch before flushing */
  maxBatchSize: 100,
  /** Maximum time to hold events before flushing (in ms) */
  maxBatchDelayMs: 1000,
  /** Event types in funnel order */
  funnelOrder: ['page_view', 'add_to_cart', 'begin_checkout', 'purchase'] as const,
} as const

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Cache TTL for test definitions (in seconds) */
  testCacheTtl: 60,
  /** Cache TTL for variant allocations (in seconds) */
  allocationCacheTtl: 300,
  /** Memory cache size limit */
  memoryCacheMaxSize: 1000,
} as const

/**
 * Targeting configuration
 */
export const TARGETING_CONFIG = {
  /** Maximum rules per test */
  maxRulesPerTest: 50,
  /** Maximum conditions per rule */
  maxConditionsPerRule: 10,
} as const

/**
 * Scheduling configuration
 */
export const SCHEDULE_CONFIG = {
  /** How often to check for scheduled tests (in ms) */
  checkIntervalMs: 60 * 1000, // 1 minute
  /** Default timezone */
  defaultTimezone: 'America/New_York',
} as const

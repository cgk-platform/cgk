/**
 * Feature Flag Types
 *
 * Defines all types for the feature flag system including
 * 6 flag types, evaluation context, and results.
 */

/**
 * Flag type enum - 6 supported flag types
 */
export type FlagType =
  | 'boolean' // Simple on/off
  | 'percentage' // Gradual rollout (0-100)
  | 'tenant_list' // Specific tenants enabled
  | 'user_list' // Specific users enabled
  | 'schedule' // Time-based enablement
  | 'variant' // A/B test variants

/**
 * Flag status
 */
export type FlagStatus = 'active' | 'archived' | 'disabled'

/**
 * Schedule window for schedule-type flags
 */
export interface ScheduleWindow {
  startDate: string // ISO date string
  endDate: string // ISO date string
  timezone?: string // IANA timezone (default: UTC)
}

/**
 * Variant definition for variant-type flags
 */
export interface FlagVariant {
  key: string // Variant identifier (e.g., 'control', 'v2', 'v3')
  weight: number // Weight for selection (relative, not percentage)
  description?: string
}

/**
 * Targeting rules for a flag
 */
export interface FlagTargeting {
  /** Tenants explicitly enabled (highest priority after user) */
  enabledTenants?: string[]
  /** Tenants explicitly disabled */
  disabledTenants?: string[]
  /** Users explicitly enabled (highest priority) */
  enabledUsers?: string[]
  /** Percentage of users to enable (0-100) */
  percentage?: number
  /** Schedule window for time-based flags */
  schedule?: ScheduleWindow
  /** Variants for A/B testing */
  variants?: FlagVariant[]
  /** Environment restrictions */
  environments?: ('development' | 'staging' | 'production')[]
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  id: string
  key: string // Unique flag key matching ^[a-z][a-z0-9._]+$
  name: string // Human-readable name
  description?: string
  type: FlagType
  status: FlagStatus
  defaultValue: boolean | string
  targeting: FlagTargeting
  /** Salt for consistent hashing (unique per flag for independent rollouts) */
  salt: string
  /** Flag category for organization */
  category?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

/**
 * Flag override for specific tenant/user
 */
export interface FlagOverride {
  id: string
  flagId: string
  flagKey: string
  /** Tenant ID for tenant-level override */
  tenantId?: string
  /** User ID for user-level override */
  userId?: string
  /** Override value (true/false for boolean, variant key for variant) */
  value: boolean | string
  /** Optional expiry for temporary overrides */
  expiresAt?: Date
  reason?: string
  createdAt: Date
  createdBy?: string
}

/**
 * Audit log entry for flag changes
 */
export interface FlagAuditEntry {
  id: string
  flagId: string
  flagKey: string
  action:
    | 'created'
    | 'updated'
    | 'archived'
    | 'restored'
    | 'deleted'
    | 'override_added'
    | 'override_removed'
    | 'kill_switch'
  /** Previous state (for updates) */
  previousValue?: unknown
  /** New state */
  newValue?: unknown
  /** User who made the change */
  userId?: string
  userEmail?: string
  /** IP address of the change */
  ipAddress?: string
  /** Reason for the change (especially for kill switch) */
  reason?: string
  createdAt: Date
}

/**
 * Context for flag evaluation
 */
export interface EvaluationContext {
  /** Current tenant ID (required for tenant-scoped flags) */
  tenantId?: string
  /** Current user ID (for user targeting) */
  userId?: string
  /** Current environment */
  environment?: 'development' | 'staging' | 'production'
  /** Additional attributes for custom targeting */
  attributes?: Record<string, string | number | boolean>
}

/**
 * Result of flag evaluation
 */
export interface EvaluationResult<T = boolean | string> {
  /** The evaluated value */
  value: T
  /** Whether the flag is enabled */
  enabled: boolean
  /** Reason for the evaluation result */
  reason: EvaluationReason
  /** Selected variant key (for variant flags) */
  variant?: string
  /** Flag key */
  flagKey: string
  /** Evaluation metadata */
  metadata?: {
    /** Time taken to evaluate in ms */
    evaluationTimeMs?: number
    /** Whether result came from cache */
    fromCache?: boolean
    /** Cache layer (memory or redis) */
    cacheLayer?: 'memory' | 'redis'
  }
}

/**
 * Reason for evaluation result
 */
export type EvaluationReason =
  | 'flag_disabled' // Flag is disabled/archived
  | 'default_value' // Using default value
  | 'user_override' // User-specific override
  | 'tenant_override' // Tenant-specific override
  | 'disabled_tenant' // Tenant is in disabled list
  | 'enabled_tenant' // Tenant is in enabled list
  | 'enabled_user' // User is in enabled list
  | 'percentage_rollout' // Percentage-based rollout
  | 'variant_selection' // Variant selected
  | 'schedule_active' // Within schedule window
  | 'schedule_inactive' // Outside schedule window
  | 'environment_match' // Environment matches
  | 'environment_mismatch' // Environment doesn't match
  | 'not_found' // Flag not found

/**
 * Flag key validation regex
 * Must start with lowercase letter, then lowercase letters, numbers, dots, or underscores
 */
export const FLAG_KEY_REGEX = /^[a-z][a-z0-9._]+$/

/**
 * Validate a flag key
 */
export function isValidFlagKey(key: string): boolean {
  return FLAG_KEY_REGEX.test(key)
}

/**
 * Platform flag category
 */
export type PlatformFlagCategory =
  | 'platform'
  | 'checkout'
  | 'payments'
  | 'mcp'
  | 'ai'
  | 'creators'
  | 'admin'

/**
 * Platform flag definition (for seeding)
 */
export interface PlatformFlagDefinition {
  key: string
  name: string
  description: string
  type: FlagType
  defaultValue: boolean | string
  category: PlatformFlagCategory
  targeting?: Partial<FlagTargeting>
}

/**
 * Flag list filters
 */
export interface FlagListFilters {
  category?: string
  type?: FlagType
  status?: FlagStatus
  search?: string
}

/**
 * Flag list pagination
 */
export interface FlagListPagination {
  page: number
  limit: number
}

/**
 * Flag list result
 */
export interface FlagListResult {
  flags: FeatureFlag[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Create flag input
 */
export interface CreateFlagInput {
  key: string
  name: string
  description?: string
  type: FlagType
  defaultValue: boolean | string
  targeting?: Partial<FlagTargeting>
  category?: string
  metadata?: Record<string, unknown>
}

/**
 * Update flag input
 */
export interface UpdateFlagInput {
  name?: string
  description?: string
  status?: FlagStatus
  defaultValue?: boolean | string
  targeting?: Partial<FlagTargeting>
  category?: string
  metadata?: Record<string, unknown>
}

/**
 * Create override input
 */
export interface CreateOverrideInput {
  flagKey: string
  tenantId?: string
  userId?: string
  value: boolean | string
  expiresAt?: Date
  reason?: string
}

/**
 * Multi-flag evaluation request
 */
export interface BulkEvaluationRequest {
  flagKeys: string[]
  context: EvaluationContext
}

/**
 * Multi-flag evaluation response
 */
export interface BulkEvaluationResult {
  results: Record<string, EvaluationResult>
  evaluationTimeMs: number
}

/**
 * @cgk-platform/ab-testing - Client Exports
 *
 * This module exports client-safe utilities for A/B testing.
 * For server-only functionality, import from '@cgk-platform/ab-testing/server'.
 */

// Types
export type {
  ABCookie,
  ABDailyMetrics,
  ABEvent,
  ABExclusionGroup,
  ABTargetingRule,
  ABTest,
  ABVariant,
  ABVisitor,
  AllocationMode,
  AssignmentResult,
  ConditionField,
  ConditionOperator,
  CreateTargetingRuleInput,
  CreateTestInput,
  CreateVariantInput,
  DeviceType,
  EventType,
  GoalEvent,
  OptimizationMetric,
  PaginatedResult,
  PaginationOptions,
  ShippingTestConfig,
  TargetingAction,
  TargetingCondition,
  TargetingResult,
  TestFilterOptions,
  TestStatus,
  TestType,
  TrackEventInput,
  UpdateTestInput,
  UpdateVariantInput,
  UrlType,
  VariantStats,
  VisitorContext,
} from './types.js'

// Configuration
export {
  AB_COOKIE_MAX_AGE,
  AB_COOKIE_NAME,
  CACHE_CONFIG,
  DEFAULT_CONFIDENCE_LEVEL,
  EVENT_CONFIG,
  MAB_CONFIG,
  SCHEDULE_CONFIG,
  SUPPORTED_CONFIDENCE_LEVELS,
  TARGETING_CONFIG,
  VISITOR_ID_LENGTH,
} from './config.js'

// Assignment (client-safe)
export {
  addAssignmentToCookie,
  cleanupCookie,
  estimateCookieSize,
  generateSetCookieHeader,
  generateVisitorId,
  getAssignmentFromCookie,
  getCookieName,
  getOrCreateVisitorId,
  isCookieNearLimit,
  parseABCookie,
  removeAssignmentFromCookie,
  serializeABCookie,
} from './assignment/cookies.js'

export { murmurHash3 as computeHash, getNormalizedHash as hashToPercentage } from './assignment/hash.js'

// Shipping (client-safe exports)
export {
  CART_ATTRIBUTES_UPDATE_MUTATION,
  cartNeedsSync,
  createShippingABTestSyncHook,
  extractShippingAssignmentFromCookie,
  syncShippingVariantToCart,
  type CartSyncState,
  type ShippingAssignment,
} from './shipping/index.js'

// Shipping types
export type {
  CartAttributeUpdate,
  CreateShippingTestInput,
  ShippingAttribution,
  ShippingRateVariant,
  ShippingTestConfig as ShippingTestConfigType,
  ShippingTestResults,
  ShippingVariantMetrics,
  ShippingVariantResults,
  ShopifyOrder,
} from './shipping/types.js'

// Shipping configuration (client-safe)
export {
  ALLOWED_SUFFIXES,
  buildRateName,
  CART_ATTRIBUTE_KEYS,
  extractSuffix,
  formatShippingPrice,
  MAX_SHIPPING_VARIANTS,
  MISMATCH_RATE_THRESHOLD,
  parseShippingPrice,
} from './shipping/config.js'

/**
 * @cgk-platform/ab-testing/server - Server-Only Exports
 *
 * This module exports server-side utilities that require database access.
 * These should never be imported in client-side code.
 */

// Re-export everything from index
export * from './index.js'

// Assignment (server-only)
export {
  applyAllocations,
  assignVariant,
  validateAllocations,
} from './assignment/allocate.js'

export {
  assignVisitor,
  getVariantIdFromCookie,
  getVisitorAssignments,
  isAssignedToTest,
  type AssignOptions,
  type FullAssignmentResult,
} from './assignment/assign.js'

// Targeting (server-only)
export {
  matchAllConditions,
  matchAnyCondition,
  matchCondition,
  validateCondition,
} from './targeting/conditions.js'

export {
  extractGeoFromHeaders,
  extractIpFromHeaders,
  getDeviceType,
  hashIp,
  isBot,
  parseUserAgent,
  type DeviceData,
  type GeoData,
} from './targeting/geo.js'

export {
  evaluateMultipleTests,
  evaluateTargeting,
  getForceAssignment,
  shouldExclude,
  TargetingTemplates,
  validateTargetingRules,
} from './targeting/evaluate.js'

// Tracking (server-only)
export {
  createEvent,
  createEventQueue,
  flushEvents,
  getEventQueue,
  getImpliedEvents,
  isConversionEvent,
  isRevenueEvent,
  isValidEventOrder,
  queueEvent,
  type EventBatch,
} from './tracking/events.js'

export {
  deserializeAttribution,
  extractAttributionFromCookie,
  filterByAttributionWindow,
  getVariantIdForTest,
  getVariantIdsFromAttribution,
  isAttributedToTest,
  isWithinAttributionWindow,
  mergeAttributions,
  serializeAttribution,
  type OrderAttribution,
} from './tracking/attribution.js'

// Statistics (server-only)
export * from './statistics/index.js'

// Guardrails (server-only)
export * from './guardrails/index.js'

// Analysis (server-only)
export * from './analysis/index.js'

// Shipping (server-only)
export {
  attributeShippingOrder,
  buildShippingCartAttributes,
  buildShippingConfig,
  calculateShippingResults,
  clearShippingAttributesFromCart,
  extractABDataFromAttributes,
  getMismatchCount,
  getMismatchRate,
  getNRPVChartData,
  getRecentMismatches,
  getShippingMetrics,
  getShippingResultsSummary,
  setShippingVariantInCart,
  validateCartSyncRequest,
  validateShippingTestInput,
  type CartSyncRequest,
  type ShopifyCartClient,
} from './shipping/index.js'

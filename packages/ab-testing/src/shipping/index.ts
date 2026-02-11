/**
 * Shipping A/B Testing Module
 *
 * Provides shipping threshold experiments with:
 * - Cart attribute integration for Shopify Functions
 * - Order attribution with mismatch detection
 * - Net Revenue Per Visitor (NRPV) calculations
 */

// Types
export type {
  CartAttributeUpdate,
  CreateShippingTestInput,
  ShippingAttribution,
  ShippingRateVariant,
  ShippingTestConfig,
  ShippingTestResults,
  ShippingVariantMetrics,
  ShippingVariantResults,
  ShopifyOrder,
} from './types.js'

// Configuration
export {
  ALLOWED_SUFFIXES,
  buildRateName,
  buildShippingConfig,
  CART_ATTRIBUTE_KEYS,
  extractSuffix,
  formatShippingPrice,
  MAX_SHIPPING_VARIANTS,
  MISMATCH_RATE_THRESHOLD,
  parseShippingPrice,
  validateShippingTestInput,
} from './config.js'

// Cart Bridge
export {
  buildShippingCartAttributes,
  clearShippingAttributesFromCart,
  extractABDataFromAttributes,
  setShippingVariantInCart,
  validateCartSyncRequest,
  type CartSyncRequest,
  type ShopifyCartClient,
} from './cart-bridge.js'

// Attribution
export {
  attributeShippingOrder,
  getMismatchCount,
  getMismatchRate,
  getRecentMismatches,
  getShippingMetrics,
} from './attribution.js'

// Results
export {
  calculateShippingResults,
  getNRPVChartData,
  getShippingResultsSummary,
} from './results.js'

// Client Hooks
export {
  CART_ATTRIBUTES_UPDATE_MUTATION,
  cartNeedsSync,
  createShippingABTestSyncHook,
  extractShippingAssignmentFromCookie,
  syncShippingVariantToCart,
  type CartSyncState,
  type ShippingAssignment,
} from './hooks.js'

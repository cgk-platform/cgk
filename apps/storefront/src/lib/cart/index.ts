/**
 * Cart module exports
 *
 * Provides cart management functionality including:
 * - Cart state and types
 * - Cookie-based persistence
 * - Tenant-aware attributes
 * - Server actions for cart operations
 */

// Types
export type {
  PlatformCartAttributes,
  CartState,
  CartLineWithProduct,
  AddToCartInput,
  CartContextValue,
  OptimisticUpdate,
} from './types'

export {
  formatMoney,
  getCartItemCount,
  isCartEmpty,
} from './types'

// Cart attributes
export {
  buildCartAttributes,
  parseCartAttributes,
  mergeCartAttributes,
  extractUtmParams,
  generateVisitorId,
  generateSessionId,
} from './attributes'

// Cookie management (client-side)
export {
  getCartIdFromCookie,
  setCartIdCookie,
  removeCartIdCookie,
  getVisitorIdFromCookie,
  setVisitorIdCookie,
  getSessionIdFromCookie,
  setSessionIdCookie,
  parseCartIdFromHeaders,
  parseVisitorIdFromHeaders,
  buildCartIdSetCookieHeader,
  buildVisitorIdSetCookieHeader,
} from './cookies'

// Server actions
export {
  getOrCreateCart,
  getCurrentCart,
  addToCart,
  updateCartLine,
  removeFromCart,
  getCheckoutUrl,
  updateCartAttribution,
  clearCart,
  applyDiscountCode,
  removeDiscountCodes,
} from './actions'

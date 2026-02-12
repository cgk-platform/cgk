/**
 * Cart types and interfaces
 *
 * Defines cart-related types including cart attributes for tenant tracking.
 */

import type { Cart, CartLine, Money } from '@cgk/commerce'

/**
 * Platform-specific cart attributes for tracking and routing
 * These are always prefixed with underscore to distinguish from user attributes
 */
export interface PlatformCartAttributes {
  /** Tenant slug for order routing - REQUIRED on every cart */
  _tenant: string
  /** Visitor identifier for analytics */
  _visitor_id: string
  /** Active A/B test ID (if any) */
  _ab_test_id?: string
  /** Assigned A/B test variant (if any) */
  _ab_variant_id?: string
  /** UTM source for attribution */
  _attribution_source?: string
  /** UTM campaign for attribution */
  _attribution_campaign?: string
  /** UTM medium for attribution */
  _attribution_medium?: string
  /** Applied free gift rule IDs */
  _free_gifts?: string
  /** Session ID for analytics */
  _session_id?: string
}

/**
 * Cart state for the UI
 */
export interface CartState {
  /** The cart object from commerce provider */
  cart: Cart | null
  /** Whether cart is loading */
  isLoading: boolean
  /** Whether cart is updating (add/remove/update operations) */
  isUpdating: boolean
  /** Error message if any operation failed */
  error: string | null
}

/**
 * Cart line with product info for display
 */
export interface CartLineWithProduct extends CartLine {
  /** Product handle for linking */
  productHandle?: string
  /** Product title for display */
  productTitle?: string
}

/**
 * Input for adding item to cart
 */
export interface AddToCartInput {
  /** Product variant ID */
  variantId: string
  /** Quantity to add */
  quantity: number
  /** Optional selling plan ID for subscriptions */
  sellingPlanId?: string
}

/**
 * Cart context value exposed by CartProvider
 */
export interface CartContextValue extends CartState {
  /** Add item to cart */
  addItem: (input: AddToCartInput) => Promise<void>
  /** Update line quantity */
  updateQuantity: (lineId: string, quantity: number) => Promise<void>
  /** Remove line from cart */
  removeItem: (lineId: string) => Promise<void>
  /** Redirect to checkout */
  checkout: () => void
  /** Get checkout URL without redirecting */
  getCheckoutUrl: () => string | null
  /** Clear any error state */
  clearError: () => void
  /** Refresh cart from server */
  refreshCart: () => Promise<void>
  /** Apply discount code to cart */
  applyDiscount: (code: string) => Promise<boolean>
  /** Remove all discount codes from cart */
  removeDiscounts: () => Promise<void>
}

/**
 * Optimistic update for cart operations
 */
export interface OptimisticUpdate {
  type: 'add' | 'update' | 'remove'
  lineId?: string
  previousCart: Cart | null
}

/**
 * Format money for display
 */
export function formatMoney(money: Money): string {
  const amount = parseFloat(money.amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(amount)
}

/**
 * Calculate total items in cart
 */
export function getCartItemCount(cart: Cart | null): number {
  if (!cart) return 0
  return cart.totalQuantity
}

/**
 * Check if cart is empty
 */
export function isCartEmpty(cart: Cart | null): boolean {
  return !cart || cart.lines.length === 0
}

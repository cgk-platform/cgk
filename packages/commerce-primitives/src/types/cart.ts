/**
 * Cart Query and Options Types
 *
 * Defines types for cart query options and cart-related operations.
 */

import type { Cart, CartLine, Money } from '@cgk-platform/commerce'

/**
 * Options for cart queries
 */
export interface CartQueryOptions {
  /** Include cart lines in response */
  includeLines?: boolean
  /** Include discount information */
  includeDiscounts?: boolean
  /** Include buyer identity information */
  includeBuyerIdentity?: boolean
  /** Include shipping estimate (if available) */
  includeShippingEstimate?: boolean
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
 * Cart line with additional product info for display
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
 * Cart totals summary
 */
export interface CartTotals {
  /** Subtotal before discounts/taxes/shipping */
  subtotal: Money
  /** Total discount amount */
  discount: Money
  /** Total tax amount */
  tax: Money | null
  /** Estimated shipping cost */
  shipping: Money | null
  /** Final total */
  total: Money
  /** Number of items in cart */
  itemCount: number
  /** Number of unique line items */
  lineCount: number
}

/**
 * Cart validation result
 */
export interface CartValidationResult {
  /** Whether the cart is valid */
  isValid: boolean
  /** Validation errors */
  errors: CartValidationError[]
  /** Warnings (non-blocking) */
  warnings: string[]
}

/**
 * Cart validation error
 */
export interface CartValidationError {
  /** Error code */
  code: 'OUT_OF_STOCK' | 'QUANTITY_EXCEEDED' | 'INVALID_VARIANT' | 'MISSING_REQUIRED_ATTRIBUTE'
  /** Error message */
  message: string
  /** Line ID if error is specific to a line */
  lineId?: string
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Optimistic update for cart operations
 */
export interface OptimisticUpdate {
  type: 'add' | 'update' | 'remove'
  lineId?: string
  previousCart: Cart | null
}

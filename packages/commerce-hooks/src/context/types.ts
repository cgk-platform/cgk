/**
 * Cart and Commerce Context Types
 *
 * Defines types for cart state, operations, and context values.
 */

import type { Cart, CartLine, Money, Product, Order, Discount } from '@cgk-platform/commerce'

// ---------------------------------------------------------------------------
// Cart Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Commerce Provider Types
// ---------------------------------------------------------------------------

/**
 * Cart action callbacks for server integration
 */
export interface CartActions {
  /** Get current cart from server */
  getCurrentCart: () => Promise<Cart | null>
  /** Add item to cart on server */
  addToCart: (variantId: string, quantity: number) => Promise<Cart>
  /** Update cart line quantity on server */
  updateCartLine: (lineId: string, quantity: number) => Promise<Cart>
  /** Remove item from cart on server */
  removeFromCart: (lineId: string) => Promise<Cart>
  /** Apply discount code on server */
  applyDiscountCode: (code: string) => Promise<Cart>
  /** Remove discount codes on server */
  removeDiscountCodes: () => Promise<Cart>
}

/**
 * Product action callbacks for server integration
 */
export interface ProductActions {
  /** Get products from server */
  getProducts: (params?: ProductListParams) => Promise<ProductListResult>
  /** Get single product by handle */
  getProductByHandle: (handle: string) => Promise<Product | null>
  /** Search products */
  searchProducts: (query: string, params?: ProductListParams) => Promise<ProductListResult>
}

/**
 * Order action callbacks for server integration
 */
export interface OrderActions {
  /** Get customer orders */
  getOrders: (params?: OrderListParams) => Promise<OrderListResult>
  /** Get single order by ID */
  getOrder: (id: string) => Promise<Order | null>
}

/**
 * Discount action callbacks for server integration
 */
export interface DiscountActions {
  /** Validate a discount code */
  validateCode: (code: string) => Promise<Discount | null>
}

/**
 * Combined commerce actions for provider
 */
export interface CommerceActions {
  cart: CartActions
  products?: ProductActions
  orders?: OrderActions
  discounts?: DiscountActions
}

// ---------------------------------------------------------------------------
// Hook Return Types
// ---------------------------------------------------------------------------

export interface ProductListParams {
  first?: number
  after?: string
  query?: string
  sortKey?: 'TITLE' | 'PRICE' | 'CREATED_AT' | 'UPDATED_AT' | 'BEST_SELLING'
  reverse?: boolean
  tag?: string
  collection?: string
}

export interface ProductListResult {
  products: Product[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface OrderListParams {
  first?: number
  after?: string
}

export interface OrderListResult {
  orders: Order[]
  hasNextPage: boolean
  endCursor: string | null
}

export interface UseProductsOptions extends ProductListParams {
  /** Skip initial fetch */
  skip?: boolean
}

export interface UseProductsReturn {
  products: Product[]
  isLoading: boolean
  error: string | null
  hasNextPage: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

export interface UseProductByHandleReturn {
  product: Product | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseCheckoutReturn {
  checkoutUrl: string | null
  isRedirecting: boolean
  redirectToCheckout: () => void
  getCheckoutUrl: () => string | null
}

export interface UseDiscountCodeReturn {
  isValidating: boolean
  discount: Discount | null
  error: string | null
  validate: (code: string) => Promise<boolean>
  reset: () => void
}

export interface UseOrdersOptions extends OrderListParams {
  /** Skip initial fetch */
  skip?: boolean
}

export interface UseOrdersReturn {
  orders: Order[]
  isLoading: boolean
  error: string | null
  hasNextPage: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

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

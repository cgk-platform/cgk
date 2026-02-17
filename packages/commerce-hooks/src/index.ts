/**
 * @cgk-platform/commerce-hooks
 *
 * React hooks and context providers for commerce operations.
 *
 * @example
 * ```tsx
 * import {
 *   CommerceProvider,
 *   CartProvider,
 *   useCart,
 *   useProducts,
 *   useCheckout,
 * } from '@cgk-platform/commerce-hooks'
 * ```
 */

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export { CartContext } from './context/CartContext'
export { CartProvider, type CartProviderProps } from './context/CartProvider'

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export {
  CommerceProvider,
  useCommerce,
  useCommerceOptional,
  useProductActions,
  useOrderActions,
  useDiscountActions,
  type CommerceConfig,
  type CommerceProviderProps,
} from './providers/CommerceProvider'

// ---------------------------------------------------------------------------
// Cart Hooks
// ---------------------------------------------------------------------------

export {
  useCart,
  useCartCount,
  useCartLoading,
  useCartUpdating,
  useCartError,
  useCartEmpty,
} from './hooks/useCart'

// ---------------------------------------------------------------------------
// Product Hooks
// ---------------------------------------------------------------------------

export {
  useProducts,
  useProductByHandle,
  useProductSearch,
} from './hooks/useProducts'

// ---------------------------------------------------------------------------
// Checkout Hooks
// ---------------------------------------------------------------------------

export {
  useCheckout,
  useCheckoutUrl,
  useCanCheckout,
} from './hooks/useCheckout'

// ---------------------------------------------------------------------------
// Discount Hooks
// ---------------------------------------------------------------------------

export {
  useDiscountCode,
  useCartDiscounts,
} from './hooks/useDiscountCode'

// ---------------------------------------------------------------------------
// Order Hooks
// ---------------------------------------------------------------------------

export {
  useOrders,
  useOrder,
  useOrderStatus,
} from './hooks/useOrders'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  // Context types
  CartContextValue,
  CartState,
  AddToCartInput,
  CartLineWithProduct,
  PlatformCartAttributes,
  OptimisticUpdate,
  // Action types
  CartActions,
  ProductActions,
  OrderActions,
  DiscountActions,
  CommerceActions,
  // Hook return types
  ProductListParams,
  ProductListResult,
  OrderListParams,
  OrderListResult,
  UseProductsOptions,
  UseProductsReturn,
  UseProductByHandleReturn,
  UseCheckoutReturn,
  UseDiscountCodeReturn,
  UseOrdersOptions,
  UseOrdersReturn,
} from './context/types'

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export {
  formatMoney,
  getCartItemCount,
  isCartEmpty,
} from './context/types'

// ---------------------------------------------------------------------------
// Re-exports from commerce
// ---------------------------------------------------------------------------

export type {
  Cart,
  CartLine,
  CartCost,
  CartLineCost,
  CartItemInput,
  CartAttribute,
  CartDiscountCode,
  CartDiscountAllocation,
  Product,
  ProductVariant,
  ProductImage,
  PriceRange,
  Money,
  SelectedOption,
  Order,
  OrderLineItem,
  Customer,
  Address,
  Checkout,
  CheckoutLineItem,
  Discount,
} from '@cgk-platform/commerce'

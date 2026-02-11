/**
 * @cgk/commerce - Commerce provider abstraction
 *
 * @ai-pattern commerce-abstraction
 * @ai-note Provider-agnostic commerce operations
 */

// Provider factory
export { createCommerceProvider } from './client'

// Shopify provider (direct access)
export { createShopifyProvider } from './providers'

// Full interface and operation types
export type {
  CommerceProvider,
  CommerceConfig,
  ProductOperations,
  CartOperations,
  CheckoutOperations,
  OrderOperations,
  CustomerOperations,
  DiscountOperations,
  WebhookHandler,
  ListParams,
  PaginatedResult,
  PageInfo,
} from './types'

// Domain model types
export type {
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
  Cart,
  CartCost,
  CartLine,
  CartLineCost,
  CartItemInput,
  CartAttribute,
  Checkout,
  CheckoutLineItem,
  Discount,
} from './types'

// Google Feed module
export * from './google-feed'

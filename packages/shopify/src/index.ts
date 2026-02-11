/**
 * @cgk/shopify - Shopify Admin and Storefront API clients
 *
 * @ai-pattern shopify-integration
 * @ai-note Provides typed clients for Shopify APIs
 */

// Client factories
export { createStorefrontClient, type StorefrontClient } from './storefront'
export { createAdminClient, type AdminClient } from './admin'

// Configuration
export type { ShopifyConfig, StorefrontConfig, AdminConfig } from './config'
export { DEFAULT_API_VERSION, normalizeStoreDomain } from './config'

// GraphQL helpers
export { storefrontQuery, adminQuery, initStorefront, initAdmin } from './graphql'

// Query modules
export {
  listProducts,
  getProductByHandle,
  getProductById,
  adminListProducts,
  adminGetProduct,
  type ListProductsParams,
  listOrders,
  getOrder,
  type ListOrdersParams,
  listCustomers,
  getCustomer,
  getCustomerOrders,
  type ListCustomersParams,
  createCart,
  getCart,
  addCartLines,
  updateCartLines,
  removeCartLines,
  type ShopifyCart,
  type CartLineInput,
} from './queries'

// Common types
export type {
  ShopifyProduct,
  ShopifyVariant,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyCollection,
  ShopifyAddress,
  ShopifyImage,
  ShopifyMoney,
  ShopifyLineItem,
  ShopifyPageInfo,
  ShopifyProductConnection,
} from './types'

// Webhook helpers
export { verifyWebhook, parseWebhook, type WebhookPayload, type WebhookTopic } from './webhooks'

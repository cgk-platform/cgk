/**
 * @cgk-platform/shopify - Shopify Admin and Storefront API clients
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
  updateCartAttributes,
  applyCartDiscountCodes,
  removeCartDiscountCodes,
  type ShopifyCart,
  type ShopifyCartDiscountCode,
  type ShopifyCartDiscountAllocation,
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

// OAuth module - Multi-tenant Shopify App
export {
  // Errors
  ShopifyError,
  type ShopifyErrorCode,
  // Encryption
  encryptToken,
  decryptToken,
  generateSecureToken,
  // Scopes
  PLATFORM_SCOPES,
  getScopesString,
  validateScopes,
  type PlatformScope,
  // Types
  type OAuthInitiateParams,
  type OAuthCallbackParams,
  type OAuthTokenResponse,
  type ConnectionStatus,
  type ShopifyConnection,
  type ShopifyCredentials,
  type OAuthStateRecord,
  type WebhookRegistration,
  type ConnectionHealthCheck,
  // Validation
  isValidShopDomain,
  validateShopDomain,
  normalizeShopDomain,
  verifyOAuthHmac,
  verifyWebhookHmac,
  isValidOAuthTimestamp,
  // OAuth flow
  initiateOAuth,
  getOAuthState,
  deleteOAuthState,
  handleOAuthCallback,
  disconnectStore,
  // Credentials
  getShopifyCredentials,
  isShopifyConnected,
  getShopifyConnection,
  checkConnectionHealth,
  updateLastWebhookAt,
  updateLastSyncAt,
  clearCredentialsCache,
  // Webhooks
  WEBHOOK_TOPICS,
  onWebhook,
  getTenantIdForShop,
  handleWebhook,
  registerWebhooks,
  unregisterWebhooks,
  type WebhookHandler,
} from './oauth'

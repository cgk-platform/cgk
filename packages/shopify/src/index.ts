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

// GraphQL helpers
export { storefrontQuery, adminQuery } from './graphql'

// Common types
export type {
  ShopifyProduct,
  ShopifyVariant,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyCollection,
} from './types'

// Webhook helpers
export { verifyWebhook, type WebhookPayload, type WebhookTopic } from './webhooks'

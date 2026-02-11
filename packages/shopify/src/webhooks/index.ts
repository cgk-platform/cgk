/**
 * @cgk/shopify Webhooks Module
 *
 * Shopify webhook handling infrastructure for the CGK platform
 *
 * @example
 * ```ts
 * // In your API route
 * import { handleShopifyWebhook, createWebhookRoute } from '@cgk/shopify/webhooks'
 *
 * // Option 1: Use the request handler directly
 * export async function POST(request: Request) {
 *   return handleShopifyWebhook(request)
 * }
 *
 * // Option 2: Use the route factory
 * export const POST = createWebhookRoute()
 * ```
 */

// Main handler
export { handleShopifyWebhook, createWebhookRoute } from './handler'

// Router
export { routeToHandler, hasHandler, getRegisteredTopics, registerHandler } from './router'

// Registration
export {
  registerWebhooks,
  registerSingleWebhook,
  syncWebhookRegistrations,
  unregisterWebhook,
  REQUIRED_TOPICS,
  OPTIONAL_TOPICS,
} from './register'

// Health monitoring
export {
  getWebhookHealth,
  getRecentWebhookEvents,
  getFailedWebhooksForRetry,
  recordWebhookSuccess,
  recordWebhookFailure,
  getWebhookEventsByTopic,
} from './health'

// Utilities
export {
  verifyShopifyWebhook,
  getTenantForShop,
  getShopifyCredentials,
  checkDuplicateWebhook,
  logWebhookEvent,
  updateWebhookStatus,
  getWebhookEvent,
  parseCents,
  mapFinancialStatus,
  mapFulfillmentStatus,
  extractResourceId,
  generateIdempotencyKey,
  headersToObject,
} from './utils'

// Types
export type {
  WebhookTopic,
  WebhookEventStatus,
  WebhookRegistrationStatus,
  WebhookEvent,
  WebhookRegistration,
  ShopifyConnection,
  ShopifyCredentials,
  WebhookHandler,
  WebhookSyncResult,
  WebhookHealthStatus,
  ShopifyOrderPayload,
  ShopifyCustomerPayload,
  ShopifyFulfillmentPayload,
  ShopifyRefundPayload,
  ShopifyAddressPayload,
} from './types'

// Individual handlers (for custom routing or testing)
export {
  handleOrderCreate,
  handleOrderUpdate,
  handleOrderPaid,
  handleOrderCancelled,
  handleFulfillmentCreate,
  handleFulfillmentUpdate,
  handleRefundCreate,
  handleCustomerCreate,
  handleCustomerUpdate,
  handleAppUninstalled,
} from './handlers'

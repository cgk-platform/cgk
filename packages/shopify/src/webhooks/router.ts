/**
 * Shopify Webhook Router
 *
 * Routes webhook events to topic-specific handlers
 */

import type { WebhookHandler, WebhookTopic } from './types'
import { handleOrderCreate, handleOrderUpdate, handleOrderPaid, handleOrderCancelled } from './handlers/orders'
import { handleFulfillmentCreate, handleFulfillmentUpdate } from './handlers/fulfillments'
import { handleRefundCreate } from './handlers/refunds'
import { handleCustomerCreate, handleCustomerUpdate } from './handlers/customers'
import { handleAppUninstalled } from './handlers/app'
import { handleProductCreate, handleProductUpdate, handleProductDelete } from './handlers/products'
import {
  handleCustomerDelete,
  handleCustomerRedact,
  handleShopRedact,
  handleCustomerDataRequest,
} from './handlers/gdpr'

/**
 * Registry of webhook handlers by topic
 */
const HANDLERS: Partial<Record<WebhookTopic, WebhookHandler>> = {
  // Orders
  'orders/create': handleOrderCreate,
  'orders/updated': handleOrderUpdate,
  'orders/paid': handleOrderPaid,
  'orders/cancelled': handleOrderCancelled,
  'orders/fulfilled': handleOrderUpdate,
  // Refunds & fulfillments
  'refunds/create': handleRefundCreate,
  'fulfillments/create': handleFulfillmentCreate,
  'fulfillments/update': handleFulfillmentUpdate,
  // Customers
  'customers/create': handleCustomerCreate,
  'customers/update': handleCustomerUpdate,
  'customers/delete': handleCustomerDelete,
  // Products
  'products/create': handleProductCreate,
  'products/update': handleProductUpdate,
  'products/delete': handleProductDelete,
  // Inventory (no-op stub — handled by product-sync job)
  'inventory_levels/update': async (_tenantId, _payload, _eventId) => {
    // Inventory updates are processed by the product sync job triggered from products/update
    // This stub prevents "no handler registered" log noise
  },
  // App lifecycle
  'app/uninstalled': handleAppUninstalled,
  // GDPR mandatory (registered via Partner Dashboard, not REST API)
  'customers/redact': handleCustomerRedact,
  'shop/redact': handleShopRedact,
  'customers/data_request': handleCustomerDataRequest,
}

/**
 * Route a webhook event to its handler
 *
 * @param tenantId - The tenant ID for this webhook
 * @param topic - The webhook topic
 * @param payload - The webhook payload
 * @param eventId - The stored event ID
 */
export async function routeToHandler(
  tenantId: string,
  topic: string,
  payload: unknown,
  eventId: string
): Promise<void> {
  const handler = HANDLERS[topic as WebhookTopic]

  if (!handler) {
    console.log(`[Webhook] No handler registered for topic: ${topic}`)
    return
  }

  await handler(tenantId, payload, eventId)
}

/**
 * Check if a topic has a registered handler
 */
export function hasHandler(topic: string): boolean {
  return topic in HANDLERS
}

/**
 * Get all registered webhook topics
 */
export function getRegisteredTopics(): WebhookTopic[] {
  return Object.keys(HANDLERS) as WebhookTopic[]
}

/**
 * Register a custom webhook handler
 *
 * This allows extending the webhook system with custom handlers
 */
export function registerHandler(topic: WebhookTopic, handler: WebhookHandler): void {
  HANDLERS[topic] = handler
}

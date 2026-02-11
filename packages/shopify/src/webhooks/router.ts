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

/**
 * Registry of webhook handlers by topic
 */
const HANDLERS: Partial<Record<WebhookTopic, WebhookHandler>> = {
  'orders/create': handleOrderCreate,
  'orders/updated': handleOrderUpdate,
  'orders/paid': handleOrderPaid,
  'orders/cancelled': handleOrderCancelled,
  'orders/fulfilled': handleOrderUpdate,
  'refunds/create': handleRefundCreate,
  'fulfillments/create': handleFulfillmentCreate,
  'fulfillments/update': handleFulfillmentUpdate,
  'customers/create': handleCustomerCreate,
  'customers/update': handleCustomerUpdate,
  'app/uninstalled': handleAppUninstalled,
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

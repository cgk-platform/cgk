/**
 * Server-side subscription data fetching
 *
 * This file is for use in Server Components only.
 * It uses 'server-only' to prevent accidental import in client components.
 *
 * These functions call the subscription provider directly rather than
 * going through API routes, enabling more efficient data fetching in
 * Server Components.
 */

import 'server-only'

import type {
  Subscription,
  SubscriptionFilters,
  SubscriptionListResponse,
  SubscriptionOrder,
} from './types'

import { getTenantConfig } from '@/lib/tenant'

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Get subscription provider config for the current tenant.
 * In the future, this will support multiple providers (Loop, ReCharge, etc.)
 */
async function getProviderConfig() {
  const config = await getTenantConfig()
  if (!config) {
    throw new Error('Tenant configuration not found')
  }
  return config
}

/**
 * Create mock subscription data for development
 * This will be replaced with actual provider integrations
 */
function createMockSubscription(id: string): Subscription {
  const now = new Date()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return {
    id,
    externalId: `ext_${id}`,
    customerId: 'cust_mock',
    customerEmail: 'mock@example.com',
    status: 'active',
    currencyCode: 'USD',
    nextOrderDate: nextWeek,
    pausedUntil: null,
    cancelledAt: null,
    cancellationReason: null,
    frequency: {
      interval: 'month',
      intervalCount: 1,
      label: 'Every month',
    },
    items: [],
    subtotalCents: 0,
    discountCents: 0,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 0,
    shippingAddress: null,
    billingAddress: null,
    paymentMethod: null,
    discounts: [],
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Server-side Data Fetching Functions
// ---------------------------------------------------------------------------

/**
 * List subscriptions for the current customer (server-side)
 */
export async function listSubscriptionsServer(
  _filters?: SubscriptionFilters
): Promise<SubscriptionListResponse> {
  // Validate tenant context
  await getProviderConfig()

  // TODO: Implement actual provider integration
  // For now, return empty list since the subscription APIs are not yet built
  return {
    subscriptions: [],
    hasMore: false,
    cursor: null,
  }
}

/**
 * Get a single subscription by ID (server-side)
 */
export async function getSubscriptionServer(id: string): Promise<Subscription | null> {
  // Validate tenant context
  await getProviderConfig()

  // TODO: Implement actual provider integration
  // For now, return mock data for development
  if (process.env.NODE_ENV === 'development') {
    return createMockSubscription(id)
  }

  return null
}

/**
 * Get order history for a subscription (server-side)
 */
export async function getSubscriptionOrdersServer(
  _subscriptionId: string,
  _limit = 10
): Promise<SubscriptionOrder[]> {
  // Validate tenant context
  await getProviderConfig()

  // TODO: Implement actual provider integration
  // For now, return empty list
  return []
}

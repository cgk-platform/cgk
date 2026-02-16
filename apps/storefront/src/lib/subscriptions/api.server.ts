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
 *
 * Returns null until subscription provider integration is implemented.
 * Subscription providers (Loop, ReCharge, etc.) will be integrated in a future phase.
 */
export async function getSubscriptionServer(_id: string): Promise<Subscription | null> {
  // Validate tenant context
  await getProviderConfig()

  // Subscription provider integration not yet implemented
  // Will support Loop, ReCharge, and other subscription platforms
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

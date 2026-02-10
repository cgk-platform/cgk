/**
 * GraphQL query helpers
 */

import { createAdminClient, type AdminClient } from './admin'
import type { AdminConfig, StorefrontConfig } from './config'
import { createStorefrontClient, type StorefrontClient } from './storefront'

let storefrontClientInstance: StorefrontClient | null = null
let adminClientInstance: AdminClient | null = null

/**
 * Execute a Storefront API query
 * Requires prior initialization with initStorefront()
 */
export async function storefrontQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!storefrontClientInstance) {
    throw new Error('Storefront client not initialized. Call initStorefront() first.')
  }
  return storefrontClientInstance.query<T>(query, variables)
}

/**
 * Execute an Admin API query
 * Requires prior initialization with initAdmin()
 */
export async function adminQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!adminClientInstance) {
    throw new Error('Admin client not initialized. Call initAdmin() first.')
  }
  return adminClientInstance.query<T>(query, variables)
}

/**
 * Initialize the Storefront client for use with storefrontQuery()
 */
export function initStorefront(config: StorefrontConfig): StorefrontClient {
  storefrontClientInstance = createStorefrontClient(config)
  return storefrontClientInstance
}

/**
 * Initialize the Admin client for use with adminQuery()
 */
export function initAdmin(config: AdminConfig): AdminClient {
  adminClientInstance = createAdminClient(config)
  return adminClientInstance
}

/**
 * Tenant Stripe Client
 *
 * Creates Stripe instances using tenant-owned credentials.
 * Each tenant has their own Stripe account.
 */

import Stripe from 'stripe'
import { getTenantStripeSecretKey, getTenantStripeConfig } from '../storage.js'

// Stripe client cache to avoid recreating on every call
const clientCache = new Map<string, { client: Stripe; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a Stripe client for a specific tenant
 *
 * Returns null if the tenant has no Stripe configuration.
 * Caches clients for 5 minutes to avoid repeated decryption.
 *
 * @example
 * const stripe = await getTenantStripeClient('rawdog')
 * if (stripe) {
 *   const customer = await stripe.customers.create({ email: 'test@example.com' })
 * }
 */
export async function getTenantStripeClient(
  tenantId: string
): Promise<Stripe | null> {
  // Check cache first
  const cached = clientCache.get(tenantId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.client
  }

  // Get decrypted secret key
  const secretKey = await getTenantStripeSecretKey(tenantId)
  if (!secretKey) {
    return null
  }

  // Create new Stripe instance
  const client = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
    telemetry: false,
    appInfo: {
      name: 'CGK Platform',
      version: '1.0.0',
    },
  })

  // Cache it
  clientCache.set(tenantId, { client, timestamp: Date.now() })

  return client
}

/**
 * Get a Stripe client or throw if not configured
 *
 * Use this when Stripe is required for the operation.
 *
 * @throws Error if tenant has no Stripe configuration
 */
export async function requireTenantStripeClient(tenantId: string): Promise<Stripe> {
  const client = await getTenantStripeClient(tenantId)
  if (!client) {
    throw new Error(`Stripe is not configured for tenant: ${tenantId}`)
  }
  return client
}

/**
 * Verify tenant's Stripe credentials by making a test API call
 *
 * @returns Verification result with account info or error
 */
export async function verifyTenantStripeCredentials(
  tenantId: string
): Promise<{
  valid: boolean
  accountId?: string
  accountName?: string
  accountCountry?: string
  livemode?: boolean
  error?: string
}> {
  try {
    const client = await getTenantStripeClient(tenantId)
    if (!client) {
      return { valid: false, error: 'Stripe not configured' }
    }

    // Retrieve account info to verify credentials
    const account = await client.accounts.retrieve()

    return {
      valid: true,
      accountId: account.id,
      accountName: account.business_profile?.name || account.settings?.dashboard?.display_name || undefined,
      accountCountry: account.country || undefined,
      livemode: account.charges_enabled,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, error: message }
  }
}

/**
 * Clear the cached Stripe client for a tenant
 *
 * Call this after credentials are updated.
 */
export function clearTenantStripeClientCache(tenantId: string): void {
  clientCache.delete(tenantId)
}

/**
 * Clear all cached Stripe clients
 */
export function clearAllStripeClientCache(): void {
  clientCache.clear()
}

/**
 * Check if tenant has Stripe configured
 */
export async function hasTenantStripeConfig(tenantId: string): Promise<boolean> {
  const config = await getTenantStripeConfig(tenantId)
  return config !== null
}

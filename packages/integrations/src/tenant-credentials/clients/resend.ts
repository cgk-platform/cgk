/**
 * Tenant Resend Client
 *
 * Creates Resend instances using tenant-owned credentials.
 * Each tenant has their own Resend account.
 */

import { Resend } from 'resend'
import { getTenantResendApiKey, getTenantResendConfig } from '../storage.js'

// Resend client cache
const clientCache = new Map<string, { client: Resend; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a Resend client for a specific tenant
 *
 * Returns null if the tenant has no Resend configuration.
 *
 * @example
 * const resend = await getTenantResendClient('rawdog')
 * if (resend) {
 *   await resend.emails.send({
 *     from: 'orders@tenant.com',
 *     to: 'customer@example.com',
 *     subject: 'Order Confirmation',
 *     html: '<p>Thank you for your order!</p>',
 *   })
 * }
 */
export async function getTenantResendClient(
  tenantId: string
): Promise<Resend | null> {
  // Check cache first
  const cached = clientCache.get(tenantId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.client
  }

  // Get decrypted API key
  const apiKey = await getTenantResendApiKey(tenantId)
  if (!apiKey) {
    return null
  }

  // Create new Resend instance
  const client = new Resend(apiKey)

  // Cache it
  clientCache.set(tenantId, { client, timestamp: Date.now() })

  return client
}

/**
 * Get a Resend client or throw if not configured
 */
export async function requireTenantResendClient(tenantId: string): Promise<Resend> {
  const client = await getTenantResendClient(tenantId)
  if (!client) {
    throw new Error(`Resend is not configured for tenant: ${tenantId}`)
  }
  return client
}

/**
 * Get tenant's Resend config with sender defaults
 */
export async function getTenantResendSenderConfig(
  tenantId: string
): Promise<{
  from: string
  replyTo?: string
} | null> {
  const config = await getTenantResendConfig(tenantId)
  if (!config) return null

  const fromName = config.defaultFromName
  const fromEmail = config.defaultFromEmail

  if (!fromEmail) return null

  return {
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    replyTo: config.defaultReplyTo || undefined,
  }
}

/**
 * Verify tenant's Resend credentials by making a test API call
 */
export async function verifyTenantResendCredentials(
  tenantId: string
): Promise<{
  valid: boolean
  domains?: string[]
  error?: string
}> {
  try {
    const client = await getTenantResendClient(tenantId)
    if (!client) {
      return { valid: false, error: 'Resend not configured' }
    }

    // List domains to verify API key is valid
    const domainsResponse = await client.domains.list()

    if (domainsResponse.error) {
      return { valid: false, error: domainsResponse.error.message }
    }

    const verifiedDomains = domainsResponse.data?.data
      .filter((d) => d.status === 'verified')
      .map((d) => d.name) || []

    return {
      valid: true,
      domains: verifiedDomains,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, error: message }
  }
}

/**
 * Clear the cached Resend client for a tenant
 */
export function clearTenantResendClientCache(tenantId: string): void {
  clientCache.delete(tenantId)
}

/**
 * Clear all cached Resend clients
 */
export function clearAllResendClientCache(): void {
  clientCache.clear()
}

/**
 * Check if tenant has Resend configured
 */
export async function hasTenantResendConfig(tenantId: string): Promise<boolean> {
  const config = await getTenantResendConfig(tenantId)
  return config !== null
}

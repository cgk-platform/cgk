/**
 * @cgk-platform/video - Mux API client
 *
 * Wrapper around Mux SDK for video hosting and streaming.
 * Supports both platform-level and tenant-managed credentials.
 *
 * @ai-pattern tenant-managed-credentials
 * @ai-required Prefer tenant credentials when tenantId is available
 */

import Mux from '@mux/mux-node'
import { getTenantMuxClient as getTenantMuxClientFromIntegrations } from '@cgk-platform/integrations'

// Platform-level client cache
let platformClient: Mux | null = null

/**
 * Get or create platform-level Mux client instance
 * Uses MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables.
 *
 * @returns Mux client or null if not configured
 */
function getPlatformMuxClient(): Mux | null {
  if (platformClient) return platformClient

  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET

  if (!tokenId || !tokenSecret) {
    return null
  }

  platformClient = new Mux({
    tokenId,
    tokenSecret,
  })
  return platformClient
}

/**
 * Get Mux client - supports tenant-managed and platform credentials
 *
 * Priority:
 * 1. Tenant-specific credentials (if tenantId provided and configured)
 * 2. Platform-level credentials (MUX_TOKEN_ID/MUX_TOKEN_SECRET)
 *
 * @param tenantId - Optional tenant ID for tenant-specific credentials
 * @returns Mux client or null if not configured
 *
 * @example
 * // Prefer tenant credentials
 * const mux = await getMuxClientAsync(tenantId)
 * if (!mux) throw new Error('Mux not configured')
 *
 * // Platform-only (backwards compatible)
 * const mux = getMuxClient()
 */
export async function getMuxClientAsync(tenantId?: string): Promise<Mux | null> {
  // Try tenant-specific credentials first
  if (tenantId) {
    const tenantClient = await getTenantMuxClientFromIntegrations(tenantId)
    if (tenantClient) {
      // The integration returns a typed client, but we need the full Mux instance
      // Since getTenantMuxClient already creates a proper Mux instance, cast it
      return tenantClient as unknown as Mux
    }
  }

  // Fall back to platform credentials
  return getPlatformMuxClient()
}

/**
 * Get Mux client (synchronous, platform-level only)
 *
 * @deprecated Use getMuxClientAsync(tenantId) for tenant-managed credentials
 * @returns Mux client
 * @throws Error if platform credentials not configured
 */
export function getMuxClient(): Mux {
  const client = getPlatformMuxClient()
  if (!client) {
    throw new Error(
      'Missing Mux credentials: MUX_TOKEN_ID and MUX_TOKEN_SECRET are required',
    )
  }
  return client
}

/**
 * Check if Mux is configured (platform-level)
 *
 * @deprecated Use isMuxConfiguredAsync(tenantId) for tenant support
 */
export function isMuxConfigured(): boolean {
  return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET)
}

/**
 * Check if Mux is configured for a tenant or at platform level
 *
 * @param tenantId - Optional tenant ID to check tenant-specific config
 * @returns true if Mux is configured
 */
export async function isMuxConfiguredAsync(tenantId?: string): Promise<boolean> {
  // Check tenant config first if tenantId provided
  if (tenantId) {
    const { hasTenantServiceConfig } = await import('@cgk-platform/integrations')
    const hasTenantConfig = await hasTenantServiceConfig(tenantId, 'mux')
    if (hasTenantConfig) return true
  }

  // Fall back to platform config
  return isMuxConfigured()
}

/**
 * Get the webhook signing secret
 */
export function getMuxWebhookSecret(): string {
  const secret = process.env.MUX_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing MUX_WEBHOOK_SECRET environment variable')
  }
  return secret
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  return process.env.MUX_TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
}

/**
 * Clear platform client cache (useful for testing)
 */
export function clearMuxClientCache(): void {
  platformClient = null
}

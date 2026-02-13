/**
 * Shopify health monitor (per-tenant)
 *
 * Checks Shopify API connectivity and rate limits for each tenant.
 */

import { sql } from '@cgk-platform/db'

import type { HealthCheckResult, HealthMonitor, HealthStatus } from '../types.js'

/**
 * Shopify credentials for a tenant
 */
interface ShopifyCredentials {
  storeDomain: string
  accessToken: string
}

/**
 * Get Shopify credentials for a tenant from the database
 */
async function getShopifyCredentials(tenantId: string): Promise<ShopifyCredentials | null> {
  try {
    const result = await sql<{
      shopify_store_domain: string | null
      shopify_access_token_encrypted: string | null
    }>`
      SELECT shopify_store_domain, shopify_access_token_encrypted
      FROM public.organizations
      WHERE id = ${tenantId} OR slug = ${tenantId}
      LIMIT 1
    `

    const org = result.rows[0]
    if (!org?.shopify_store_domain || !org?.shopify_access_token_encrypted) {
      return null
    }

    // In production, decrypt the access token
    // For now, treat it as plain text (should be encrypted in real implementation)
    return {
      storeDomain: org.shopify_store_domain,
      accessToken: org.shopify_access_token_encrypted,
    }
  } catch {
    return null
  }
}

/**
 * Determine health status based on rate limit remaining
 */
function getRateLimitHealthStatus(percentRemaining: number): HealthStatus {
  if (percentRemaining > 20) return 'healthy'
  if (percentRemaining > 5) return 'degraded'
  return 'unhealthy'
}

/**
 * Check Shopify health for a tenant
 */
export async function checkShopify(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  if (!tenantId) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Tenant ID required for Shopify health check',
      },
    }
  }

  const credentials = await getShopifyCredentials(tenantId)
  if (!credentials) {
    return {
      status: 'unknown',
      latencyMs: Date.now() - startTime,
      details: {
        error: 'No Shopify credentials configured',
        tenantId,
      },
    }
  }

  try {
    // Test API with shop endpoint (lightweight)
    const response = await fetch(
      `https://${credentials.storeDomain}/admin/api/2024-10/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    const latencyMs = Date.now() - startTime

    // Parse rate limit header (format: "X/Y" where X is used, Y is limit)
    const rateLimitHeader = response.headers.get('X-Shopify-Shop-Api-Call-Limit')
    let rateLimitUsed = 0
    let rateLimitTotal = 40

    if (rateLimitHeader) {
      const parts = rateLimitHeader.split('/')
      rateLimitUsed = parseInt(parts[0] ?? '0', 10)
      rateLimitTotal = parseInt(parts[1] ?? '40', 10)
    }

    const rateLimitRemaining = rateLimitTotal - rateLimitUsed
    const rateLimitPercent = (rateLimitRemaining / rateLimitTotal) * 100

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: errorText,
          storeDomain: credentials.storeDomain,
          tenantId,
        },
        error: `Shopify API returned ${response.status}`,
      }
    }

    const status = getRateLimitHealthStatus(rateLimitPercent)

    return {
      status,
      latencyMs,
      details: {
        storeDomain: credentials.storeDomain,
        rateLimitRemaining,
        rateLimitTotal,
        rateLimitPercent: Math.round(rateLimitPercent * 100) / 100,
        tenantId,
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeDomain: credentials.storeDomain,
        tenantId,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Shopify health monitor configuration
 */
export const shopifyMonitor: HealthMonitor = {
  name: 'shopify',
  tier: 'core',
  check: checkShopify,
  requiresTenant: true,
}

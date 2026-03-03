import { createStorefrontClient } from '@shopify/hydrogen-react'
import { decryptToken } from './oauth/encryption'
import { sql } from '@vercel/postgres'
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  meta: { service: 'shopify', component: 'hydrogen-adapter' }
})

export interface HydrogenClientConfig {
  tenantId: string
  shopDomain: string
}

/**
 * Creates Shopify Storefront client with dual token source:
 * 1. Primary: Database (multi-tenant, encrypted)
 * 2. Fallback: NEXT_PUBLIC env var (debugging)
 */
export async function createHydrogenClient(config: HydrogenClientConfig) {
  const { tenantId, shopDomain } = config
  let storefrontToken: string
  let tokenSource: 'database' | 'env-fallback' = 'database'

  try {
    // PRIMARY SOURCE: Database token (multi-tenant)
    logger.info('[Shopify] Attempting to fetch token from database', { tenantId })

    // tenant-isolation-skip: public schema query (shopify_connections is in public, not tenant-specific)
    const result = await sql`
      SELECT
        storefront_api_token_encrypted,
        shop,
        updated_at
      FROM shopify_connections
      WHERE tenant_id = ${tenantId}
      AND status = 'active'
      LIMIT 1
    `

    if (result.rows.length === 0) {
      throw new Error('No active Shopify connection found for tenant')
    }

    const row = result.rows[0] as {
      storefront_api_token_encrypted: string
      shop: string
      updated_at: Date
    }

    logger.info('[Shopify] Database token found', {
      tenantId,
      shop: row.shop,
      tokenLength: row.storefront_api_token_encrypted.length,
      updatedAt: row.updated_at
    })

    // Decrypt token (throws if invalid format or wrong key)
    storefrontToken = decryptToken(row.storefront_api_token_encrypted)

    logger.info('[Shopify] ✅ Using database token', { tenantId })
  } catch (error) {
    // FALLBACK SOURCE: NEXT_PUBLIC env var (debugging/single-tenant)
    logger.warn('[Shopify] Database token failed, attempting env var fallback', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    const envToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
    if (!envToken) {
      logger.error(
        '[Shopify] ❌ No token available (database failed, env var not set)',
        undefined,
        { tenantId }
      )
      throw new Error(
        `No Shopify token available for tenant ${tenantId}. ` +
          `Database error: ${error instanceof Error ? error.message : 'Unknown'}. ` +
          `Env var NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN not set.`
      )
    }

    storefrontToken = envToken
    tokenSource = 'env-fallback'
    logger.warn('[Shopify] ⚠️  Using env var fallback token', {
      tenantId,
      tokenLength: envToken.length
    })
  }

  // Create Hydrogen React client helpers
  const client = createStorefrontClient({
    storeDomain: `https://${shopDomain}`,
    publicStorefrontToken: storefrontToken,
    storefrontApiVersion: '2025-10' // Latest stable version
  })

  logger.info('[Shopify] Storefront client created', {
    tenantId,
    shopDomain,
    tokenSource,
    apiVersion: '2025-10'
  })

  // Build a query method that uses Hydrogen React's helpers
  const query = async <T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<{ data: T; errors?: unknown[] }> => {
    const response = await fetch(client.getStorefrontApiUrl(), {
      method: 'POST',
      headers: {
        ...client.getPublicTokenHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables
      })
    })

    if (!response.ok) {
      throw new Error(`Shopify Storefront API error: ${response.statusText}`)
    }

    const json = (await response.json()) as { data: T; errors?: unknown[] }
    return json
  }

  return {
    ...client,
    query,
    _metadata: {
      tenantId,
      shopDomain,
      tokenSource
    }
  }
}

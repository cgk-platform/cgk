/**
 * Shopify credential management
 *
 * Handles retrieval and caching of decrypted Shopify credentials.
 */

import { sql, withTenant, createTenantCache } from '@cgk-platform/db'

import { decryptToken } from './encryption.js'
import { ShopifyError } from './errors.js'
import { validateScopes } from './scopes.js'
import type { ShopifyCredentials, ShopifyConnection, ConnectionHealthCheck } from './types.js'

/** Credential cache TTL in seconds */
const CREDENTIAL_CACHE_TTL = 60

/**
 * Get Shopify credentials by tenant slug
 *
 * Convenience wrapper that converts tenant slug to UUID before fetching credentials.
 *
 * @param tenantSlug - Tenant slug
 * @returns Decrypted Shopify credentials
 * @throws ShopifyError if tenant not found or not connected
 *
 * @example
 * ```ts
 * const credentials = await getShopifyCredentialsBySlug('meliusly')
 * const client = createAdminClient({
 *   storeDomain: credentials.shop,
 *   adminAccessToken: credentials.accessToken,
 * })
 * ```
 */
export async function getShopifyCredentialsBySlug(tenantSlug: string): Promise<ShopifyCredentials> {
  // Convert slug to UUID
  const tenantResult = await sql`
    SELECT id FROM public.organizations WHERE slug = ${tenantSlug}
  `

  if (tenantResult.rows.length === 0) {
    throw new ShopifyError('NOT_CONNECTED', `Tenant ${tenantSlug} not found`)
  }

  const tenantId = (tenantResult.rows[0] as { id: string }).id
  return getShopifyCredentials(tenantId)
}

/**
 * Get Shopify credentials for a tenant
 *
 * Retrieves and decrypts Shopify credentials, with caching
 * to reduce database load.
 *
 * @param tenantId - Tenant ID (UUID)
 * @returns Decrypted Shopify credentials
 * @throws ShopifyError if not connected
 *
 * @example
 * ```ts
 * const credentials = await getShopifyCredentials('5cb87b13-3b13-4400-9542-53c8b8d12cb8')
 * const client = createAdminClient({
 *   storeDomain: credentials.shop,
 *   adminAccessToken: credentials.accessToken,
 * })
 * ```
 */
export async function getShopifyCredentials(tenantId: string): Promise<ShopifyCredentials> {
  const cache = createTenantCache(tenantId)
  const cacheKey = 'shopify:credentials'

  // Check cache first
  const cached = await cache.get<ShopifyCredentials>(cacheKey)
  if (cached) {
    return cached
  }

  // Convert tenant UUID to slug (withTenant requires slug, not UUID)
  const tenantResult = await sql`SELECT slug FROM public.organizations WHERE id = ${tenantId}`
  if (tenantResult.rows.length === 0) {
    throw new ShopifyError('NOT_CONNECTED', `Tenant ${tenantId} not found`)
  }
  const tenantSlug = (tenantResult.rows[0] as { slug: string }).slug

  // Query database
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT
        shop,
        access_token_encrypted,
        webhook_secret_encrypted,
        scopes,
        api_version
      FROM shopify_connections
      WHERE tenant_id = ${tenantId}
      AND status = 'active'
      AND access_token_encrypted IS NOT NULL
      LIMIT 1
    `
  })

  if (result.rows.length === 0) {
    throw new ShopifyError('NOT_CONNECTED', 'Shopify not connected for this tenant')
  }

  const row = result.rows[0] as {
    shop: string
    access_token_encrypted: string
    webhook_secret_encrypted: string | null
    scopes: string[]
    api_version: string
  }

  // Decrypt tokens
  const credentials: ShopifyCredentials = {
    shop: row.shop,
    accessToken: decryptToken(row.access_token_encrypted),
    webhookSecret: row.webhook_secret_encrypted ? decryptToken(row.webhook_secret_encrypted) : null,
    scopes: row.scopes,
    apiVersion: row.api_version,
  }

  // Cache for short duration
  await cache.set(cacheKey, credentials, { ttl: CREDENTIAL_CACHE_TTL })

  return credentials
}

/**
 * Check if a tenant has an active Shopify connection
 *
 * @param tenantId - Tenant ID
 * @returns True if connected
 */
export async function isShopifyConnected(tenantSlug: string): Promise<boolean> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT 1
      FROM shopify_connections
      WHERE status = 'active'
      AND access_token_encrypted IS NOT NULL
      LIMIT 1
    `
  })

  return result.rows.length > 0
}

/**
 * Get Shopify connection details for a tenant
 *
 * @param tenantId - Tenant ID
 * @returns Connection details or null if not connected
 */
export async function getShopifyConnection(tenantSlug: string): Promise<ShopifyConnection | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT
        id,
        tenant_id,
        shop,
        scopes,
        api_version,
        pixel_id,
        pixel_active,
        storefront_api_version,
        site_url,
        default_country,
        default_language,
        status,
        last_webhook_at,
        last_sync_at,
        installed_at,
        updated_at
      FROM shopify_connections
      WHERE status != 'disconnected'
      LIMIT 1
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0] as {
    id: string
    tenant_id: string
    shop: string
    scopes: string[]
    api_version: string
    pixel_id: string | null
    pixel_active: boolean
    storefront_api_version: string
    site_url: string | null
    default_country: string
    default_language: string
    status: 'active' | 'suspended' | 'disconnected'
    last_webhook_at: string | null
    last_sync_at: string | null
    installed_at: string
    updated_at: string
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    shop: row.shop,
    scopes: row.scopes,
    apiVersion: row.api_version,
    pixelId: row.pixel_id,
    pixelActive: row.pixel_active,
    storefrontApiVersion: row.storefront_api_version,
    siteUrl: row.site_url,
    defaultCountry: row.default_country,
    defaultLanguage: row.default_language,
    status: row.status,
    lastWebhookAt: row.last_webhook_at ? new Date(row.last_webhook_at) : null,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
    installedAt: new Date(row.installed_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Check connection health
 *
 * Verifies the connection is active and token is valid.
 *
 * @param tenantSlug - Tenant slug
 * @returns Connection health check result
 */
export async function checkConnectionHealth(tenantSlug: string): Promise<ConnectionHealthCheck> {
  const connection = await getShopifyConnection(tenantSlug)

  if (!connection) {
    return {
      isConnected: false,
      shop: null,
      status: null,
      tokenValid: false,
      lastWebhookAt: null,
      lastSyncAt: null,
      scopesValid: false,
      missingSCopes: [],
    }
  }

  // Check if token is valid by making a simple API call
  let tokenValid = false
  try {
    // Convert slug to UUID for getShopifyCredentials (it expects tenantId, not slug)
    const tenantResult = await sql`
      SELECT id FROM public.organizations WHERE slug = ${tenantSlug}
    `

    if (tenantResult.rows.length === 0) {
      throw new ShopifyError('NOT_CONNECTED', `Tenant ${tenantSlug} not found`)
    }

    const tenantId = (tenantResult.rows[0] as { id: string }).id

    const credentials = await getShopifyCredentials(tenantId)

    // Make a simple shop query to verify token
    const response = await fetch(
      `https://${credentials.shop}/admin/api/${credentials.apiVersion}/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
        },
      }
    )

    tokenValid = response.ok
  } catch {
    tokenValid = false
  }

  // Validate scopes
  const scopeValidation = validateScopes(connection.scopes)

  return {
    isConnected: connection.status === 'active',
    shop: connection.shop,
    status: connection.status,
    tokenValid,
    lastWebhookAt: connection.lastWebhookAt,
    lastSyncAt: connection.lastSyncAt,
    scopesValid: scopeValidation.valid,
    missingSCopes: scopeValidation.missing,
  }
}

/**
 * Update last webhook timestamp
 *
 * @param tenantId - Tenant ID (UUID)
 */
export async function updateLastWebhookAt(tenantId: string): Promise<void> {
  // Convert tenant UUID to slug (withTenant requires slug, not UUID)
  const tenantResult = await sql`SELECT slug FROM public.organizations WHERE id = ${tenantId}`
  if (tenantResult.rows.length === 0) {
    return // Tenant not found, skip update
  }
  const tenantSlug = (tenantResult.rows[0] as { slug: string }).slug

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE shopify_connections
      SET last_webhook_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Update last sync timestamp
 *
 * @param tenantId - Tenant ID (UUID)
 */
export async function updateLastSyncAt(tenantId: string): Promise<void> {
  // Convert tenant UUID to slug (withTenant requires slug, not UUID)
  const tenantResult = await sql`SELECT slug FROM public.organizations WHERE id = ${tenantId}`
  if (tenantResult.rows.length === 0) {
    return // Tenant not found, skip update
  }
  const tenantSlug = (tenantResult.rows[0] as { slug: string }).slug

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE shopify_connections
      SET last_sync_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Clear cached credentials
 *
 * Call this when credentials are updated or connection is disconnected.
 *
 * @param tenantId - Tenant ID
 */
export async function clearCredentialsCache(tenantId: string): Promise<void> {
  const cache = createTenantCache(tenantId)
  await cache.delete('shopify:credentials')
}

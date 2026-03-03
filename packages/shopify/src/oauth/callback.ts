/**
 * Shopify OAuth callback handling
 */

import { sql, withTenant } from '@cgk-platform/db'

import { encryptToken } from './encryption.js'
import { ShopifyError } from './errors.js'
import { getOAuthState, deleteOAuthState } from './initiate.js'
import type { OAuthCallbackParams, OAuthTokenResponse } from './types.js'
import { verifyOAuthHmac, normalizeShopDomain } from './validation.js'

/**
 * Get Shopify client ID from environment
 */
function getShopifyClientId(): string {
  const clientId = process.env.SHOPIFY_CLIENT_ID

  if (!clientId) {
    throw new ShopifyError('MISSING_CONFIG', 'SHOPIFY_CLIENT_ID environment variable is required')
  }

  return clientId
}

/**
 * Get Shopify client secret from environment
 */
function getShopifyClientSecret(): string {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

  if (!clientSecret) {
    throw new ShopifyError(
      'MISSING_CONFIG',
      'SHOPIFY_CLIENT_SECRET environment variable is required'
    )
  }

  return clientSecret
}

/**
 * Get the API version to use
 */
function getApiVersion(): string {
  return process.env.SHOPIFY_API_VERSION || '2026-01'
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(params: {
  shop: string
  code: string
  clientId: string
  clientSecret: string
}): Promise<OAuthTokenResponse> {
  const { shop, code, clientId, clientSecret } = params

  const url = `https://${shop}/admin/oauth/access_token`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new ShopifyError(
      'TOKEN_EXCHANGE_FAILED',
      `Failed to exchange code for token: ${response.status}`,
      { error: errorText }
    )
  }

  const data = (await response.json()) as OAuthTokenResponse

  if (!data.access_token) {
    throw new ShopifyError('TOKEN_EXCHANGE_FAILED', 'No access token in response')
  }

  return data
}

/**
 * Handle Shopify OAuth callback
 *
 * Verifies the callback, exchanges the code for an access token,
 * encrypts and stores the credentials, and registers webhooks.
 *
 * @param params - OAuth callback parameters from Shopify
 * @returns Tenant ID and shop domain
 *
 * @example
 * ```ts
 * const { tenantId, shop } = await handleOAuthCallback({
 *   shop: 'my-store.myshopify.com',
 *   code: 'abc123',
 *   state: 'def456',
 *   hmac: 'xyz789',
 *   timestamp: '1234567890',
 * })
 * ```
 */
export async function handleOAuthCallback(
  params: OAuthCallbackParams
): Promise<{ tenantId: string; shop: string }> {
  const { shop: rawShop, code, state, hmac, timestamp, host } = params

  // Normalize shop domain
  const shop = normalizeShopDomain(rawShop)

  // Build params object for HMAC verification (excluding hmac itself)
  const verifyParams: Record<string, string> = {
    code,
    shop,
    state,
    timestamp,
  }

  if (host) {
    verifyParams.host = host
  }

  // Verify HMAC signature
  const clientSecret = getShopifyClientSecret()
  if (!verifyOAuthHmac(verifyParams, hmac, clientSecret)) {
    throw new ShopifyError('INVALID_HMAC', 'OAuth signature verification failed')
  }

  // Lookup and validate state
  const oauthState = await getOAuthState(state)

  if (!oauthState) {
    throw new ShopifyError('INVALID_STATE', 'OAuth state expired or invalid')
  }

  const { tenantId, shop: expectedShop } = oauthState

  // Verify shop matches
  if (shop !== expectedShop) {
    throw new ShopifyError(
      'SHOP_MISMATCH',
      `Shop domain mismatch: expected ${expectedShop}, got ${shop}`
    )
  }

  // Exchange code for access token
  const tokenResponse = await exchangeCodeForToken({
    shop,
    code,
    clientId: getShopifyClientId(),
    clientSecret,
  })

  // Encrypt the access token
  const accessTokenEncrypted = encryptToken(tokenResponse.access_token)

  // Encrypt the webhook secret (Shopify signs webhook payloads with the app's client secret)
  const webhookSecretEncrypted = encryptToken(clientSecret)

  // Parse scopes from response
  const scopes = tokenResponse.scope.split(',').filter(Boolean)

  // Convert scopes array to PostgreSQL array literal
  const scopesArrayLiteral = `{${scopes.join(',')}}`

  // Store the connection in tenant schema
  const apiVersion = getApiVersion()

  // Look up tenant slug from tenant ID (withTenant requires slug, not UUID)
  const tenantResult = await sql`SELECT slug FROM public.organizations WHERE id = ${tenantId}`
  if (tenantResult.rows.length === 0) {
    throw new ShopifyError('INVALID_STATE', `Tenant ${tenantId} not found`)
  }
  const tenantSlug = (tenantResult.rows[0] as { slug: string }).slug

  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO shopify_connections (
        tenant_id,
        shop,
        access_token_encrypted,
        webhook_secret_encrypted,
        scopes,
        api_version,
        status,
        installed_at,
        updated_at
      )
      VALUES (
        ${tenantId},
        ${shop},
        ${accessTokenEncrypted},
        ${webhookSecretEncrypted},
        ${scopesArrayLiteral}::TEXT[],
        ${apiVersion},
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, shop) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        webhook_secret_encrypted = EXCLUDED.webhook_secret_encrypted,
        scopes = EXCLUDED.scopes,
        api_version = EXCLUDED.api_version,
        status = 'active',
        updated_at = NOW()
    `
  })

  // MULTI-TENANT: Record installation in public schema for shop-to-tenant resolution
  // This enables dynamic tenant routing (one app serves all tenants)
  const { recordShopInstallation } = await import('../app/tenant-resolution.js')
  await recordShopInstallation({
    shop,
    organizationId: tenantId,
    scopes,
    shopifyAppId: null, // Shopify doesn't provide this in OAuth response
  })

  // Create Storefront Access Token for headless storefront
  try {
    const storefrontTokenResponse = await fetch(
      `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': tokenResponse.access_token,
        },
        body: JSON.stringify({
          query: `
          mutation {
            storefrontAccessTokenCreate(input: {
              title: "CGK Headless Storefront"
            }) {
              storefrontAccessToken {
                accessToken
                title
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        }),
      }
    )

    if (storefrontTokenResponse.ok) {
      const storefrontResult = (await storefrontTokenResponse.json()) as {
        data?: {
          storefrontAccessTokenCreate?: {
            storefrontAccessToken?: { accessToken: string; title: string }
            userErrors?: Array<{ field: string[]; message: string }>
          }
        }
      }

      if (storefrontResult.data?.storefrontAccessTokenCreate?.storefrontAccessToken) {
        const storefrontToken =
          storefrontResult.data.storefrontAccessTokenCreate.storefrontAccessToken.accessToken
        const storefrontTokenEncrypted = encryptToken(storefrontToken)

        // Save Storefront token to database
        await withTenant(tenantSlug, async () => {
          await sql`
            UPDATE shopify_connections
            SET storefront_api_token_encrypted = ${storefrontTokenEncrypted},
                updated_at = NOW()
            WHERE tenant_id = ${tenantId} AND shop = ${shop}
          `
        })
      } else if (storefrontResult.data?.storefrontAccessTokenCreate?.userErrors?.length) {
        console.error(
          'Storefront token creation errors:',
          storefrontResult.data.storefrontAccessTokenCreate.userErrors
        )
      }
    }
  } catch (error) {
    // Don't fail OAuth callback if storefront token creation fails
    console.error('Failed to create Storefront Access Token:', error)
  }

  // Trigger initial product sync (don't block OAuth callback)
  try {
    const { tasks } = await import('@trigger.dev/sdk/v3')

    // Sync all products from Shopify to local database
    await tasks.trigger('commerce-product-batch-sync', {
      tenantId,
    })

    // Sync collections
    await tasks.trigger('commerce-collection-sync', {
      tenantId,
    })

    console.log(`Product sync triggered for tenant ${tenantId}`)
  } catch (error) {
    // Don't fail OAuth callback if sync trigger fails
    console.error('Failed to trigger product sync:', error)
  }

  // Clean up OAuth state
  await deleteOAuthState(state)

  return { tenantId, shop }
}

/**
 * Disconnect a Shopify store connection
 *
 * Marks the connection as disconnected and clears credentials.
 *
 * @param tenantSlug - Tenant slug (e.g., 'meliusly')
 * @param shop - Shop domain (optional, disconnects all if not provided)
 */
export async function disconnectStore(tenantSlug: string, shop?: string): Promise<void> {
  // Look up tenant UUID from slug (public schema query - no withTenant needed)
  const tenantResult = await sql`SELECT id FROM public.organizations WHERE slug = ${tenantSlug}`
  if (tenantResult.rows.length === 0) {
    throw new ShopifyError('INVALID_STATE', `Tenant ${tenantSlug} not found`)
  }
  const tenantId = (tenantResult.rows[0] as { id: string }).id

  // Update connection status in tenant schema
  if (shop) {
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE shopify_connections
        SET
          status = 'disconnected',
          access_token_encrypted = NULL,
          webhook_secret_encrypted = NULL,
          storefront_api_token_encrypted = NULL,
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        AND shop = ${shop}
      `
    })
  } else {
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE shopify_connections
        SET
          status = 'disconnected',
          access_token_encrypted = NULL,
          webhook_secret_encrypted = NULL,
          storefront_api_token_encrypted = NULL,
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
      `
    })
  }
}

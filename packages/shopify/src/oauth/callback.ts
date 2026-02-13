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
    throw new ShopifyError(
      'MISSING_CONFIG',
      'SHOPIFY_CLIENT_ID environment variable is required'
    )
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

  const data = await response.json() as OAuthTokenResponse

  if (!data.access_token) {
    throw new ShopifyError(
      'TOKEN_EXCHANGE_FAILED',
      'No access token in response'
    )
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
    throw new ShopifyError(
      'INVALID_HMAC',
      'OAuth signature verification failed'
    )
  }

  // Lookup and validate state
  const oauthState = await getOAuthState(state)

  if (!oauthState) {
    throw new ShopifyError(
      'INVALID_STATE',
      'OAuth state expired or invalid'
    )
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

  // Parse scopes from response
  const scopes = tokenResponse.scope.split(',').filter(Boolean)

  // Convert scopes array to PostgreSQL array literal
  const scopesArrayLiteral = `{${scopes.join(',')}}`

  // Store the connection
  const apiVersion = getApiVersion()

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO shopify_connections (
        tenant_id,
        shop,
        access_token_encrypted,
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
        ${scopesArrayLiteral}::TEXT[],
        ${apiVersion},
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, shop) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        scopes = EXCLUDED.scopes,
        api_version = EXCLUDED.api_version,
        status = 'active',
        updated_at = NOW()
    `
  })

  // Clean up OAuth state
  await deleteOAuthState(state)

  return { tenantId, shop }
}

/**
 * Disconnect a Shopify store connection
 *
 * Marks the connection as disconnected and clears credentials.
 *
 * @param tenantId - Tenant ID
 * @param shop - Shop domain (optional, disconnects all if not provided)
 */
export async function disconnectStore(
  tenantId: string,
  shop?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    if (shop) {
      await sql`
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
    } else {
      await sql`
        UPDATE shopify_connections
        SET
          status = 'disconnected',
          access_token_encrypted = NULL,
          webhook_secret_encrypted = NULL,
          storefront_api_token_encrypted = NULL,
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
      `
    }
  })
}

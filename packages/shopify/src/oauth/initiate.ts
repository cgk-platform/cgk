/**
 * Shopify OAuth initiation
 */

import { sql, withTenant } from '@cgk-platform/db'
import { generateSecureToken } from './encryption.js'
import { ShopifyError } from './errors.js'
import { getScopesString } from './scopes.js'
import type { OAuthInitiateParams } from './types.js'
import { validateShopDomain, normalizeShopDomain } from './validation.js'

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
 * Build Shopify OAuth authorization URL
 */
function buildShopifyAuthUrl(params: {
  shop: string
  clientId: string
  scopes: string
  redirectUri: string
  state: string
}): string {
  const { shop, clientId, scopes, redirectUri, state } = params

  const url = new URL(`https://${shop}/admin/oauth/authorize`)

  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', scopes)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('grant_options[]', 'per-user')

  return url.toString()
}

/**
 * Initiate Shopify OAuth flow
 *
 * Creates an OAuth state record and returns the authorization URL.
 *
 * @param params - OAuth initiation parameters
 * @returns Authorization URL to redirect the user to
 *
 * @example
 * ```ts
 * const authUrl = await initiateOAuth({
 *   tenantId: 'rawdog',
 *   shop: 'my-store.myshopify.com',
 *   redirectUri: 'https://admin.example.com/api/shopify/oauth/callback',
 * })
 *
 * // Redirect user to authUrl
 * ```
 */
export async function initiateOAuth(params: OAuthInitiateParams): Promise<string> {
  const { tenantId, shop: rawShop, redirectUri } = params

  // Normalize and validate shop domain
  const shop = normalizeShopDomain(rawShop)
  validateShopDomain(shop)

  // Generate secure tokens
  const state = generateSecureToken(32)
  const nonce = generateSecureToken(16)

  // Store OAuth state for callback verification
  await withTenant(tenantId, async () => {
    // Clean up any expired states first
    await sql`
      DELETE FROM shopify_oauth_states
      WHERE expires_at < NOW()
    `

    // Insert new state
    await sql`
      INSERT INTO shopify_oauth_states (
        tenant_id,
        shop,
        state,
        nonce,
        redirect_uri,
        expires_at
      )
      VALUES (
        ${tenantId},
        ${shop},
        ${state},
        ${nonce},
        ${redirectUri},
        NOW() + INTERVAL '10 minutes'
      )
    `
  })

  // Build authorization URL
  const authUrl = buildShopifyAuthUrl({
    shop,
    clientId: getShopifyClientId(),
    scopes: getScopesString(),
    redirectUri,
    state,
  })

  return authUrl
}

/**
 * Get the OAuth state record for verification
 *
 * @param state - OAuth state token
 * @returns OAuth state record or null if not found/expired
 */
export async function getOAuthState(state: string): Promise<{
  tenantId: string
  shop: string
  nonce: string
  redirectUri: string
} | null> {
  const result = await sql`
    SELECT tenant_id, shop, nonce, redirect_uri
    FROM shopify_oauth_states
    WHERE state = ${state}
    AND expires_at > NOW()
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0] as {
    tenant_id: string
    shop: string
    nonce: string
    redirect_uri: string
  }

  return {
    tenantId: row.tenant_id,
    shop: row.shop,
    nonce: row.nonce,
    redirectUri: row.redirect_uri,
  }
}

/**
 * Delete OAuth state after use
 *
 * @param state - OAuth state token to delete
 */
export async function deleteOAuthState(state: string): Promise<void> {
  await sql`
    DELETE FROM shopify_oauth_states
    WHERE state = ${state}
  `
}

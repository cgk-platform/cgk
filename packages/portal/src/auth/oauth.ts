/**
 * Shopify Customer OAuth Implementation
 *
 * Implements OAuth 2.0 PKCE flow for Shopify Customer Account API.
 */

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'
import { sql } from '@cgk-platform/db'
import { decryptToken } from '@cgk-platform/shopify'
import { generatePKCEChallenge, generateNonce, generateState } from './pkce'
import type {
  CustomerOAuthConfig,
  CustomerTokens,
  CustomerFromToken,
  OAuthStateData,
} from './types'

const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Get OAuth configuration for a tenant
 */
export async function getCustomerOAuthConfig(
  tenantId: string
): Promise<CustomerOAuthConfig | null> {
  try {
    const result = await sql<{
      shop_id: string
      customer_oauth_client_id: string
      customer_oauth_client_secret_encrypted: string
      customer_oauth_redirect_uri: string
      customer_oauth_scopes: string[]
    }>`
      SELECT
        shopify_shop_id as shop_id,
        customer_oauth_client_id,
        customer_oauth_client_secret_encrypted,
        customer_oauth_redirect_uri,
        customer_oauth_scopes
      FROM public.organizations
      WHERE slug = ${tenantId}
        AND status = 'active'
        AND customer_oauth_client_id IS NOT NULL
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    // Decrypt the client secret
    const clientSecret = await decryptToken(row.customer_oauth_client_secret_encrypted)

    return {
      tenantId,
      shopId: row.shop_id,
      clientId: row.customer_oauth_client_id,
      clientSecret,
      redirectUri: row.customer_oauth_redirect_uri,
      scopes: row.customer_oauth_scopes || ['openid', 'email', 'customer-account-api:full'],
    }
  } catch (error) {
    console.error('Failed to get customer OAuth config:', error)
    return null
  }
}

/**
 * Initiate Shopify customer login
 * Returns the authorization URL to redirect the user to
 */
export async function initiateShopifyLogin(
  tenantId: string,
  redirectAfterLogin: string = '/account'
): Promise<{ authorizationUrl: string; state: string } | null> {
  const config = await getCustomerOAuthConfig(tenantId)
  if (!config) {
    console.error('No OAuth configuration found for tenant:', tenantId)
    return null
  }

  // Generate PKCE challenge
  const { codeVerifier, codeChallenge } = generatePKCEChallenge()
  const nonce = generateNonce()
  const state = generateState()

  // Store state for callback verification
  const stateData: OAuthStateData = {
    tenantId,
    codeVerifier,
    redirectAfterLogin,
    nonce,
    createdAt: Date.now(),
  }

  await storeOAuthState(state, stateData)

  // Build authorization URL
  const authUrl = new URL(`https://shopify.com/${config.shopId}/auth/oauth/authorize`)
  authUrl.searchParams.set('client_id', config.clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', config.redirectUri)
  authUrl.searchParams.set('scope', config.scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('nonce', nonce)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return {
    authorizationUrl: authUrl.toString(),
    state,
  }
}

/**
 * Handle OAuth callback
 * Exchanges authorization code for tokens
 */
export async function handleShopifyCallback(
  code: string,
  state: string
): Promise<{
  tokens: CustomerTokens
  customer: CustomerFromToken
  tenantId: string
  redirectAfterLogin: string
} | null> {
  // Retrieve and validate state
  const stateData = await getOAuthState(state)
  if (!stateData) {
    console.error('Invalid or expired OAuth state')
    return null
  }

  // Delete state immediately to prevent replay
  await deleteOAuthState(state)

  // Check state expiry
  if (Date.now() - stateData.createdAt > STATE_EXPIRY_MS) {
    console.error('OAuth state expired')
    return null
  }

  const config = await getCustomerOAuthConfig(stateData.tenantId)
  if (!config) {
    console.error('No OAuth config found for tenant:', stateData.tenantId)
    return null
  }

  // Exchange code for tokens
  const tokenUrl = `https://shopify.com/${config.shopId}/auth/oauth/token`

  const tokenResponse = await fetchWithTimeout(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: stateData.codeVerifier,
    }),
    timeout: FETCH_TIMEOUTS.OAUTH,
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    console.error('Token exchange failed:', error)
    return null
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    id_token?: string
    token_type: string
  }

  const tokens: CustomerTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    idToken: tokenData.id_token,
    tokenType: tokenData.token_type,
  }

  // Get customer info from Customer Account API
  const customer = await getCustomerFromToken(config.shopId, tokens.accessToken)
  if (!customer) {
    console.error('Failed to get customer info')
    return null
  }

  return {
    tokens,
    customer,
    tenantId: stateData.tenantId,
    redirectAfterLogin: stateData.redirectAfterLogin,
  }
}

/**
 * Refresh customer access token
 */
export async function refreshCustomerToken(
  tenantId: string,
  refreshToken: string
): Promise<CustomerTokens | null> {
  const config = await getCustomerOAuthConfig(tenantId)
  if (!config) {
    return null
  }

  const tokenUrl = `https://shopify.com/${config.shopId}/auth/oauth/token`

  const response = await fetchWithTimeout(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
    timeout: FETCH_TIMEOUTS.OAUTH,
  })

  if (!response.ok) {
    console.error('Token refresh failed:', await response.text())
    return null
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    id_token?: string
    token_type: string
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    idToken: data.id_token,
    tokenType: data.token_type,
  }
}

/**
 * Get customer info from access token
 */
async function getCustomerFromToken(
  shopId: string,
  accessToken: string
): Promise<CustomerFromToken | null> {
  const apiUrl = `https://shopify.com/${shopId}/account/customer/api/2025-01/graphql`

  const query = `
    query {
      customer {
        id
        emailAddress { emailAddress }
        firstName
        lastName
        phoneNumber { phoneNumber }
      }
    }
  `

  const response = await fetchWithTimeout(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    },
    body: JSON.stringify({ query }),
    timeout: FETCH_TIMEOUTS.API,
  })

  if (!response.ok) {
    console.error('Customer query failed:', await response.text())
    return null
  }

  const result = (await response.json()) as {
    data?: {
      customer: {
        id: string
        emailAddress: { emailAddress: string } | null
        firstName: string | null
        lastName: string | null
        phoneNumber: { phoneNumber: string } | null
      }
    }
    errors?: Array<{ message: string }>
  }

  if (result.errors?.length) {
    console.error('Customer query errors:', result.errors)
    return null
  }

  if (!result.data?.customer) {
    return null
  }

  const customer = result.data.customer
  return {
    id: customer.id,
    email: customer.emailAddress?.emailAddress || '',
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phoneNumber?.phoneNumber || null,
  }
}

/**
 * Store OAuth state in database
 */
async function storeOAuthState(state: string, data: OAuthStateData): Promise<void> {
  await sql`
    INSERT INTO public.customer_oauth_states (
      state,
      tenant_id,
      code_verifier,
      redirect_after_login,
      nonce,
      created_at,
      expires_at
    ) VALUES (
      ${state},
      ${data.tenantId},
      ${data.codeVerifier},
      ${data.redirectAfterLogin},
      ${data.nonce},
      ${new Date(data.createdAt).toISOString()},
      ${new Date(data.createdAt + STATE_EXPIRY_MS).toISOString()}
    )
  `
}

/**
 * Get OAuth state from database
 */
async function getOAuthState(state: string): Promise<OAuthStateData | null> {
  const result = await sql<{
    tenant_id: string
    code_verifier: string
    redirect_after_login: string
    nonce: string
    created_at: string
  }>`
    SELECT tenant_id, code_verifier, redirect_after_login, nonce, created_at
    FROM public.customer_oauth_states
    WHERE state = ${state}
      AND expires_at > NOW()
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    tenantId: row.tenant_id,
    codeVerifier: row.code_verifier,
    redirectAfterLogin: row.redirect_after_login,
    nonce: row.nonce,
    createdAt: new Date(row.created_at).getTime(),
  }
}

/**
 * Delete OAuth state from database
 */
async function deleteOAuthState(state: string): Promise<void> {
  await sql`DELETE FROM public.customer_oauth_states WHERE state = ${state}`
}

/**
 * Clean up expired OAuth states
 */
export async function cleanupExpiredStates(): Promise<number> {
  const result = await sql`
    DELETE FROM public.customer_oauth_states
    WHERE expires_at < NOW()
  `
  return result.rowCount ?? 0
}

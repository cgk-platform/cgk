/**
 * Google Ads OAuth flow implementation
 *
 * @ai-pattern oauth-flow
 * @ai-required Must use offline access for refresh tokens
 */

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'
import { sql, withTenant } from '@cgk-platform/db'

import { encryptToken } from '../encryption.js'
import { storeSimpleOAuthState, validateSimpleOAuthState } from '../oauth-state.js'
import type { GoogleAdsConnection, GoogleAdsOAuthCompleteResult, OAuthStartResult } from '../types.js'

import {
  getGoogleAdsClientId,
  getGoogleAdsClientSecret,
  getGoogleAdsDeveloperToken,
  getGoogleAdsEncryptionKey,
  getGoogleAdsRedirectUri,
  GOOGLE_ADS_OAUTH_CONFIG,
} from './config.js'

/**
 * Start Google Ads OAuth flow
 *
 * @param tenantId - The tenant initiating the OAuth flow
 * @param returnUrl - URL to redirect after OAuth completion
 * @returns The authorization URL and state token
 */
export async function startGoogleAdsOAuth(params: {
  tenantId: string
  returnUrl: string
}): Promise<OAuthStartResult> {
  // Generate simple state and store in Redis
  const state = await storeSimpleOAuthState(
    'google_ads',
    params.tenantId,
    params.returnUrl
  )

  const redirectUri = getGoogleAdsRedirectUri()

  // Build authorization URL
  const authUrl = new URL(GOOGLE_ADS_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('client_id', getGoogleAdsClientId())
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', GOOGLE_ADS_OAUTH_CONFIG.scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', GOOGLE_ADS_OAUTH_CONFIG.accessType)
  authUrl.searchParams.set('prompt', GOOGLE_ADS_OAUTH_CONFIG.prompt)
  authUrl.searchParams.set('response_type', 'code')

  return { authUrl: authUrl.toString(), state }
}

/**
 * Complete Google Ads OAuth flow
 *
 * @param code - Authorization code from Google
 * @param state - State parameter from callback
 * @returns Connection result with customer IDs
 */
export async function completeGoogleAdsOAuth(params: {
  code: string
  state: string
}): Promise<GoogleAdsOAuthCompleteResult> {
  const clientId = getGoogleAdsClientId()
  const clientSecret = getGoogleAdsClientSecret()
  const encryptionKey = getGoogleAdsEncryptionKey()
  const redirectUri = getGoogleAdsRedirectUri()

  // 1. Validate state
  const { tenantId, returnUrl } = await validateSimpleOAuthState(
    'google_ads',
    params.state
  )

  // 2. Exchange code for tokens
  const tokenResponse = await fetchWithTimeout(GOOGLE_ADS_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    timeout: FETCH_TIMEOUTS.OAUTH,
  })

  if (!tokenResponse.ok) {
    const error = (await tokenResponse.json()) as { error?: string; error_description?: string }
    throw new Error(`Google Ads token exchange failed: ${error.error_description || error.error}`)
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  // CRITICAL: Refresh token must be present
  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh token received - user may need to revoke and reconnect. ' +
        'Ensure prompt=consent is set in authorization URL.'
    )
  }

  // 3. Fetch accessible Google Ads customer IDs
  const customerIds = await listAccessibleCustomers(tokens.access_token)

  // 4. Store encrypted tokens
  const encryptedAccessToken = await encryptToken(tokens.access_token, encryptionKey)
  const encryptedRefreshToken = await encryptToken(tokens.refresh_token, encryptionKey)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO google_ads_connections (
        tenant_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        customer_ids,
        status,
        connected_at
      ) VALUES (
        ${tenantId},
        ${encryptedAccessToken},
        ${encryptedRefreshToken},
        ${expiresAt.toISOString()},
        ${JSON.stringify(customerIds)},
        'pending_account_selection',
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        customer_ids = EXCLUDED.customer_ids,
        status = 'pending_account_selection',
        connected_at = NOW(),
        needs_reauth = false,
        last_error = NULL
    `
  })

  return {
    connected: true,
    customerIds,
    returnUrl,
    requiresAccountSelection: customerIds.length > 1,
  }
}

/**
 * List accessible Google Ads customer IDs
 */
async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const developerToken = getGoogleAdsDeveloperToken()

  const response = await fetchWithTimeout(
    `${GOOGLE_ADS_OAUTH_CONFIG.adsApiUrl}/customers:listAccessibleCustomers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      timeout: FETCH_TIMEOUTS.OAUTH,
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to list Google Ads customers: ${JSON.stringify(error)}`)
  }

  const data = (await response.json()) as { resourceNames?: string[] }

  // Extract customer IDs from resource names
  // Format: customers/1234567890
  return (data.resourceNames || []).map((name) => name.split('/')[1] || '')
}

/**
 * Get Google Ads connection for a tenant
 */
export async function getGoogleAdsConnection(
  tenantId: string
): Promise<GoogleAdsConnection | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        access_token_encrypted as "accessTokenEncrypted",
        refresh_token_encrypted as "refreshTokenEncrypted",
        token_expires_at as "tokenExpiresAt",
        selected_customer_id as "selectedCustomerId",
        selected_customer_name as "selectedCustomerName",
        customer_ids as "customerIds",
        metadata,
        status,
        needs_reauth as "needsReauth",
        last_error as "lastError",
        last_sync_at as "lastSyncAt",
        connected_at as "connectedAt",
        updated_at as "updatedAt"
      FROM google_ads_connections
      WHERE tenant_id = ${tenantId}
    `
  })

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    id: row.id as string,
    tenantId: row.tenantId as string,
    provider: 'google_ads',
    accessTokenEncrypted: row.accessTokenEncrypted as string,
    refreshTokenEncrypted: row.refreshTokenEncrypted as string,
    tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt as string) : null,
    selectedCustomerId: row.selectedCustomerId as string | null,
    selectedCustomerName: row.selectedCustomerName as string | null,
    customerIds: row.customerIds as string[],
    metadata: (row.metadata as Record<string, unknown>) || {},
    status: row.status as GoogleAdsConnection['status'],
    needsReauth: row.needsReauth as boolean,
    lastError: row.lastError as string | null,
    lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt as string) : null,
    connectedAt: new Date(row.connectedAt as string),
    updatedAt: new Date(row.updatedAt as string),
  }
}

/**
 * Select a customer ID for the Google Ads connection
 */
export async function selectGoogleAdsCustomer(
  tenantId: string,
  customerId: string,
  customerName: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE google_ads_connections
      SET
        selected_customer_id = ${customerId},
        selected_customer_name = ${customerName},
        status = 'active',
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Disconnect Google Ads
 */
export async function disconnectGoogleAds(tenantId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      DELETE FROM google_ads_connections
      WHERE tenant_id = ${tenantId}
    `
  })
}

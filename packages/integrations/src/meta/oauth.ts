/**
 * Meta Ads OAuth flow implementation
 *
 * @ai-pattern oauth-flow
 * @ai-required Use HMAC-signed state for CSRF protection
 */

import { sql, withTenant } from '@cgk-platform/db'

import { encryptToken } from '../encryption.js'
import { createOAuthState, validateOAuthState } from '../oauth-state.js'
import type {
  MetaAdAccount,
  MetaAdConnection,
  MetaOAuthCompleteResult,
  OAuthStartResult,
} from '../types.js'

import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaEncryptionKey,
  getMetaRedirectUri,
  META_OAUTH_CONFIG,
} from './config.js'

/**
 * Start Meta OAuth flow
 *
 * @param tenantId - The tenant initiating the OAuth flow
 * @param returnUrl - URL to redirect after OAuth completion
 * @returns The authorization URL and state token
 */
export async function startMetaOAuth(params: {
  tenantId: string
  returnUrl: string
}): Promise<OAuthStartResult> {
  const appSecret = getMetaAppSecret()

  // Generate signed state with HMAC
  const { state } = await createOAuthState(
    params.tenantId,
    params.returnUrl,
    appSecret
  )

  const redirectUri = getMetaRedirectUri()

  // Build authorization URL
  const authUrl = new URL(META_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('client_id', getMetaAppId())
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', META_OAUTH_CONFIG.scopes.join(','))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return { authUrl: authUrl.toString(), state }
}

/**
 * Complete Meta OAuth flow
 *
 * @param code - Authorization code from Meta
 * @param state - State parameter from callback
 * @returns Connection result with ad accounts
 */
export async function completeMetaOAuth(params: {
  code: string
  state: string
}): Promise<MetaOAuthCompleteResult> {
  const appSecret = getMetaAppSecret()
  const appId = getMetaAppId()
  const encryptionKey = getMetaEncryptionKey()
  const redirectUri = getMetaRedirectUri()

  // 1. Validate state
  const payload = await validateOAuthState(params.state, appSecret)

  // 2. Exchange code for short-lived token
  const tokenResponse = await fetch(META_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code: params.code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenResponse.ok) {
    const error = (await tokenResponse.json()) as { error?: { message?: string } }
    throw new Error(`Meta token exchange failed: ${error.error?.message || 'Unknown error'}`)
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string }
  const shortLivedToken = tokenData.access_token

  // 3. Exchange for long-lived token (60 days)
  const longLivedResponse = await fetch(META_OAUTH_CONFIG.exchangeTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    }),
  })

  if (!longLivedResponse.ok) {
    const error = (await longLivedResponse.json()) as { error?: { message?: string } }
    throw new Error(`Meta long-lived token exchange failed: ${error.error?.message || 'Unknown error'}`)
  }

  const longLivedData = (await longLivedResponse.json()) as {
    access_token: string
    expires_in: number
  }
  const longLivedToken = longLivedData.access_token
  const expires_in = longLivedData.expires_in

  // 4. Debug token to get metadata
  const debugResponse = await fetch(
    `${META_OAUTH_CONFIG.debugTokenUrl}?input_token=${longLivedToken}&access_token=${appId}|${appSecret}`
  )

  if (!debugResponse.ok) {
    throw new Error('Failed to debug Meta token')
  }

  const debugData = (await debugResponse.json()) as {
    data: { user_id: string; scopes: string[] }
  }
  const tokenDebug = debugData.data

  // 5. Fetch ad accounts
  const accountsResponse = await fetch(
    `${META_OAUTH_CONFIG.graphApiUrl}/me/adaccounts?fields=id,name,account_status,currency&access_token=${longLivedToken}`
  )

  if (!accountsResponse.ok) {
    throw new Error('Failed to fetch Meta ad accounts')
  }

  const accountsData = (await accountsResponse.json()) as {
    data: Array<{ id: string; name: string; account_status: number; currency: string }>
  }
  const adAccountsRaw = accountsData.data

  const adAccounts: MetaAdAccount[] = (adAccountsRaw || []).map(
    (account) => ({
      id: account.id,
      name: account.name,
      accountStatus: account.account_status,
      currency: account.currency,
    })
  )

  // 6. Store encrypted token
  const encryptedToken = await encryptToken(longLivedToken, encryptionKey)
  const expiresAt = new Date(Date.now() + expires_in * 1000)

  await withTenant(payload.tenantId, async () => {
    await sql`
      INSERT INTO meta_ad_connections (
        tenant_id,
        access_token_encrypted,
        token_expires_at,
        token_type,
        user_id,
        scopes,
        metadata,
        status,
        connected_at
      ) VALUES (
        ${payload.tenantId},
        ${encryptedToken},
        ${expiresAt.toISOString()},
        'long_lived',
        ${tokenDebug.user_id},
        ${JSON.stringify(tokenDebug.scopes || [])},
        ${JSON.stringify({ adAccounts })},
        'pending_account_selection',
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        token_type = EXCLUDED.token_type,
        scopes = EXCLUDED.scopes,
        metadata = EXCLUDED.metadata,
        status = 'pending_account_selection',
        connected_at = NOW(),
        needs_reauth = false,
        last_error = NULL
    `
  })

  return {
    connected: true,
    adAccounts,
    returnUrl: payload.returnUrl,
    requiresAccountSelection: adAccounts.length > 1,
  }
}

/**
 * Get Meta connection for a tenant
 */
export async function getMetaConnection(
  tenantId: string
): Promise<MetaAdConnection | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        access_token_encrypted as "accessTokenEncrypted",
        token_expires_at as "tokenExpiresAt",
        token_type as "tokenType",
        user_id as "userId",
        selected_ad_account_id as "selectedAdAccountId",
        selected_ad_account_name as "selectedAdAccountName",
        scopes,
        metadata,
        status,
        needs_reauth as "needsReauth",
        last_error as "lastError",
        last_sync_at as "lastSyncAt",
        connected_at as "connectedAt",
        updated_at as "updatedAt"
      FROM meta_ad_connections
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
    provider: 'meta',
    accessTokenEncrypted: row.accessTokenEncrypted as string,
    tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt as string) : null,
    tokenType: row.tokenType as 'short_lived' | 'long_lived' | 'system_user',
    userId: row.userId as string | null,
    selectedAdAccountId: row.selectedAdAccountId as string | null,
    selectedAdAccountName: row.selectedAdAccountName as string | null,
    scopes: row.scopes as string[],
    metadata: row.metadata as { adAccounts?: MetaAdAccount[]; [key: string]: unknown },
    status: row.status as MetaAdConnection['status'],
    needsReauth: row.needsReauth as boolean,
    lastError: row.lastError as string | null,
    lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt as string) : null,
    connectedAt: new Date(row.connectedAt as string),
    updatedAt: new Date(row.updatedAt as string),
  }
}

/**
 * Select an ad account for the Meta connection
 */
export async function selectMetaAdAccount(
  tenantId: string,
  adAccountId: string,
  adAccountName: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE meta_ad_connections
      SET
        selected_ad_account_id = ${adAccountId},
        selected_ad_account_name = ${adAccountName},
        status = 'active',
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Disconnect Meta Ads
 */
export async function disconnectMeta(tenantId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      DELETE FROM meta_ad_connections
      WHERE tenant_id = ${tenantId}
    `
  })
}

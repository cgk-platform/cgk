/**
 * TikTok Ads OAuth flow implementation
 *
 * @ai-pattern oauth-flow
 * @ai-note TikTok uses code=0 for success responses
 */

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'
import { sql, withTenant } from '@cgk-platform/db'

import { encryptToken } from '../encryption.js'
import { storeSimpleOAuthState, validateSimpleOAuthState } from '../oauth-state.js'
import type { OAuthStartResult, TikTokAdConnection, TikTokOAuthCompleteResult } from '../types.js'

import {
  getTikTokAppId,
  getTikTokAppSecret,
  getTikTokEncryptionKey,
  getTikTokRedirectUri,
  TIKTOK_OAUTH_CONFIG,
} from './config.js'

/**
 * Start TikTok OAuth flow
 *
 * @param tenantId - The tenant initiating the OAuth flow
 * @param returnUrl - URL to redirect after OAuth completion
 * @returns The authorization URL and state token
 */
export async function startTikTokOAuth(params: {
  tenantId: string
  returnUrl: string
}): Promise<OAuthStartResult> {
  // Generate simple state and store in Redis
  const state = await storeSimpleOAuthState(
    'tiktok',
    params.tenantId,
    params.returnUrl
  )

  const redirectUri = getTikTokRedirectUri()

  // Build authorization URL
  const authUrl = new URL(TIKTOK_OAUTH_CONFIG.authorizationUrl)
  authUrl.searchParams.set('app_id', getTikTokAppId())
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', TIKTOK_OAUTH_CONFIG.scopes)
  authUrl.searchParams.set('state', state)

  return { authUrl: authUrl.toString(), state }
}

/**
 * Complete TikTok OAuth flow
 *
 * @param code - Authorization code from TikTok
 * @param state - State parameter from callback
 * @returns Connection result with advertiser IDs
 */
export async function completeTikTokOAuth(params: {
  code: string
  state: string
}): Promise<TikTokOAuthCompleteResult> {
  const appId = getTikTokAppId()
  const appSecret = getTikTokAppSecret()
  const encryptionKey = getTikTokEncryptionKey()

  // 1. Validate state
  const { tenantId, returnUrl } = await validateSimpleOAuthState(
    'tiktok',
    params.state
  )

  // 2. Exchange code for tokens
  const tokenResponse = await fetchWithTimeout(TIKTOK_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      auth_code: params.code,
      secret: appSecret,
    }),
    timeout: FETCH_TIMEOUTS.OAUTH,
  })

  const result = (await tokenResponse.json()) as {
    code: number
    message?: string
    data?: {
      access_token: string
      refresh_token: string
      advertiser_ids: string[]
    }
  }

  // TikTok uses code=0 for success
  if (result.code !== 0 || !result.data) {
    throw new Error(`TikTok OAuth failed: ${result.message}`)
  }

  const { access_token, refresh_token, advertiser_ids } = result.data

  if (!advertiser_ids || advertiser_ids.length === 0) {
    throw new Error('No TikTok advertiser accounts found')
  }

  // 3. Store encrypted tokens
  const encryptedAccessToken = await encryptToken(access_token, encryptionKey)
  const encryptedRefreshToken = await encryptToken(refresh_token, encryptionKey)

  // TikTok tokens expire in 24 hours
  const expiresAt = new Date(
    Date.now() + TIKTOK_OAUTH_CONFIG.tokenExpirySeconds * 1000
  )

  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO tiktok_ad_connections (
        tenant_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        advertiser_ids,
        status,
        connected_at
      ) VALUES (
        ${tenantId},
        ${encryptedAccessToken},
        ${encryptedRefreshToken},
        ${expiresAt.toISOString()},
        ${JSON.stringify(advertiser_ids)},
        'pending_account_selection',
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        advertiser_ids = EXCLUDED.advertiser_ids,
        status = 'pending_account_selection',
        connected_at = NOW(),
        needs_reauth = false,
        last_error = NULL
    `
  })

  return {
    connected: true,
    advertiserIds: advertiser_ids,
    returnUrl,
    requiresAccountSelection: advertiser_ids.length > 1,
  }
}

/**
 * Get TikTok connection for a tenant
 */
export async function getTikTokConnection(
  tenantId: string
): Promise<TikTokAdConnection | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        access_token_encrypted as "accessTokenEncrypted",
        refresh_token_encrypted as "refreshTokenEncrypted",
        token_expires_at as "tokenExpiresAt",
        selected_advertiser_id as "selectedAdvertiserId",
        selected_advertiser_name as "selectedAdvertiserName",
        advertiser_ids as "advertiserIds",
        pixel_id as "pixelId",
        events_api_token as "eventsApiToken",
        metadata,
        status,
        needs_reauth as "needsReauth",
        last_error as "lastError",
        last_sync_at as "lastSyncAt",
        connected_at as "connectedAt",
        updated_at as "updatedAt"
      FROM tiktok_ad_connections
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
    provider: 'tiktok',
    accessTokenEncrypted: row.accessTokenEncrypted as string,
    refreshTokenEncrypted: row.refreshTokenEncrypted as string,
    tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt as string) : null,
    selectedAdvertiserId: row.selectedAdvertiserId as string | null,
    selectedAdvertiserName: row.selectedAdvertiserName as string | null,
    advertiserIds: row.advertiserIds as string[],
    pixelId: row.pixelId as string | null,
    eventsApiToken: row.eventsApiToken as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    status: row.status as TikTokAdConnection['status'],
    needsReauth: row.needsReauth as boolean,
    lastError: row.lastError as string | null,
    lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt as string) : null,
    connectedAt: new Date(row.connectedAt as string),
    updatedAt: new Date(row.updatedAt as string),
  }
}

/**
 * Select an advertiser ID for the TikTok connection
 */
export async function selectTikTokAdvertiser(
  tenantId: string,
  advertiserId: string,
  advertiserName: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE tiktok_ad_connections
      SET
        selected_advertiser_id = ${advertiserId},
        selected_advertiser_name = ${advertiserName},
        status = 'active',
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

/**
 * Disconnect TikTok Ads
 */
export async function disconnectTikTok(tenantId: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      DELETE FROM tiktok_ad_connections
      WHERE tenant_id = ${tenantId}
    `
  })
}

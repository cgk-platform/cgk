/**
 * Meta Ads token refresh
 *
 * @ai-pattern token-refresh
 * @ai-required Tokens must be refreshed before expiry
 */

import { sql, withTenant } from '@cgk/db'

import { decryptToken, encryptToken } from '../encryption.js'
import type { TokenRefreshResult } from '../types.js'

import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaEncryptionKey,
  META_OAUTH_CONFIG,
} from './config.js'
import { getMetaConnection } from './oauth.js'

/**
 * Refresh Meta token before expiry
 *
 * Long-lived tokens can be exchanged for new tokens.
 * System user tokens never expire and don't need refresh.
 *
 * @param tenantId - The tenant whose token to refresh
 * @returns Refresh result
 */
export async function refreshMetaToken(
  tenantId: string
): Promise<TokenRefreshResult> {
  const connection = await getMetaConnection(tenantId)

  if (!connection) {
    return { success: false, error: 'No Meta connection found' }
  }

  // System user tokens don't expire
  if (connection.tokenType === 'system_user') {
    return { success: true }
  }

  const encryptionKey = getMetaEncryptionKey()
  const appId = getMetaAppId()
  const appSecret = getMetaAppSecret()

  // Decrypt current token
  const currentToken = await decryptToken(
    connection.accessTokenEncrypted,
    encryptionKey
  )

  // Exchange for new long-lived token
  const response = await fetch(META_OAUTH_CONFIG.exchangeTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: currentToken,
    }),
  })

  if (!response.ok) {
    const error = (await response.json()) as { error?: { message?: string } }
    const errorMessage = error.error?.message || 'Token refresh failed'

    // Mark as needing re-auth
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE meta_ad_connections
        SET needs_reauth = true, last_error = ${errorMessage}
        WHERE tenant_id = ${tenantId}
      `
    })

    return { success: false, error: errorMessage }
  }

  const refreshData = (await response.json()) as { access_token: string; expires_in: number }
  const { access_token, expires_in } = refreshData

  // Encrypt and store new token
  const encryptedToken = await encryptToken(access_token, encryptionKey)
  const expiresAt = new Date(Date.now() + expires_in * 1000)

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE meta_ad_connections
      SET
        access_token_encrypted = ${encryptedToken},
        token_expires_at = ${expiresAt.toISOString()},
        needs_reauth = false,
        last_error = NULL,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })

  return { success: true, newExpiresAt: expiresAt }
}

/**
 * Check if Meta token needs refresh
 *
 * @param tenantId - The tenant to check
 * @returns true if token expires within refresh buffer
 */
export async function needsMetaTokenRefresh(tenantId: string): Promise<boolean> {
  const connection = await getMetaConnection(tenantId)

  if (!connection) {
    return false
  }

  // System user tokens don't expire
  if (connection.tokenType === 'system_user') {
    return false
  }

  if (!connection.tokenExpiresAt) {
    return false
  }

  // Check if token expires within refresh buffer (7 days)
  const refreshThreshold = new Date(
    Date.now() + META_OAUTH_CONFIG.refreshBuffer * 1000
  )

  return connection.tokenExpiresAt <= refreshThreshold
}

/**
 * Get decrypted Meta access token
 *
 * @param tenantId - The tenant whose token to get
 * @returns The decrypted access token
 */
export async function getMetaAccessToken(tenantId: string): Promise<string> {
  const connection = await getMetaConnection(tenantId)

  if (!connection) {
    throw new Error('No Meta connection found')
  }

  if (connection.needsReauth) {
    throw new Error('Meta connection requires re-authorization')
  }

  // Check if token is expired
  if (
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt <= new Date()
  ) {
    throw new Error('Meta token has expired')
  }

  const encryptionKey = getMetaEncryptionKey()
  return decryptToken(connection.accessTokenEncrypted, encryptionKey)
}

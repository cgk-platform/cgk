/**
 * TikTok Ads token refresh
 *
 * @ai-pattern token-refresh
 * @ai-note TikTok issues new refresh tokens on each refresh
 */

import { sql, withTenant } from '@cgk-platform/db'

import { decryptToken, encryptToken } from '../encryption.js'
import type { TokenRefreshResult } from '../types.js'

import {
  getTikTokAppId,
  getTikTokAppSecret,
  getTikTokEncryptionKey,
  TIKTOK_OAUTH_CONFIG,
} from './config.js'
import { getTikTokConnection } from './oauth.js'

/**
 * Refresh TikTok access token using refresh token
 *
 * @param tenantId - The tenant whose token to refresh
 * @returns Refresh result
 */
export async function refreshTikTokToken(
  tenantId: string
): Promise<TokenRefreshResult> {
  const connection = await getTikTokConnection(tenantId)

  if (!connection) {
    return { success: false, error: 'No TikTok connection found' }
  }

  const encryptionKey = getTikTokEncryptionKey()
  const appId = getTikTokAppId()
  const appSecret = getTikTokAppSecret()

  // Decrypt refresh token
  const refreshToken = await decryptToken(
    connection.refreshTokenEncrypted,
    encryptionKey
  )

  // Request new tokens
  const response = await fetch(TIKTOK_OAUTH_CONFIG.refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      secret: appSecret,
      refresh_token: refreshToken,
    }),
  })

  const result = (await response.json()) as {
    code: number
    message?: string
    data?: {
      access_token: string
      refresh_token: string
    }
  }

  // TikTok uses code=0 for success
  if (result.code !== 0 || !result.data) {
    const errorMessage = result.message || 'Token refresh failed'

    // Mark as needing re-auth
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE tiktok_ad_connections
        SET needs_reauth = true, last_error = ${errorMessage}
        WHERE tenant_id = ${tenantId}
      `
    })

    return { success: false, error: errorMessage }
  }

  const { access_token, refresh_token: newRefreshToken } = result.data

  // Encrypt both tokens (TikTok issues new refresh token on each refresh)
  const encryptedAccessToken = await encryptToken(access_token, encryptionKey)
  const encryptedRefreshToken = await encryptToken(newRefreshToken, encryptionKey)

  // TikTok tokens expire in 24 hours
  const expiresAt = new Date(
    Date.now() + TIKTOK_OAUTH_CONFIG.tokenExpirySeconds * 1000
  )

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE tiktok_ad_connections
      SET
        access_token_encrypted = ${encryptedAccessToken},
        refresh_token_encrypted = ${encryptedRefreshToken},
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
 * Check if TikTok token needs refresh
 *
 * @param tenantId - The tenant to check
 * @returns true if token expires within refresh buffer
 */
export async function needsTikTokTokenRefresh(
  tenantId: string
): Promise<boolean> {
  const connection = await getTikTokConnection(tenantId)

  if (!connection) {
    return false
  }

  if (!connection.tokenExpiresAt) {
    return false
  }

  // Check if token expires within refresh buffer (5 minutes)
  const refreshThreshold = new Date(
    Date.now() + TIKTOK_OAUTH_CONFIG.tokenRefreshBuffer * 1000
  )

  return connection.tokenExpiresAt <= refreshThreshold
}

/**
 * Get decrypted TikTok access token, refreshing if needed
 *
 * @param tenantId - The tenant whose token to get
 * @returns The decrypted access token
 */
export async function getTikTokAccessToken(tenantId: string): Promise<string> {
  const connection = await getTikTokConnection(tenantId)

  if (!connection) {
    throw new Error('No TikTok connection found')
  }

  if (connection.needsReauth) {
    throw new Error('TikTok connection requires re-authorization')
  }

  // Check if token needs refresh
  if (await needsTikTokTokenRefresh(tenantId)) {
    const result = await refreshTikTokToken(tenantId)
    if (!result.success) {
      throw new Error(result.error || 'Token refresh failed')
    }
    // Get updated connection after refresh
    const updatedConnection = await getTikTokConnection(tenantId)
    if (!updatedConnection) {
      throw new Error('Connection lost after refresh')
    }
    const encryptionKey = getTikTokEncryptionKey()
    return decryptToken(updatedConnection.accessTokenEncrypted, encryptionKey)
  }

  const encryptionKey = getTikTokEncryptionKey()
  return decryptToken(connection.accessTokenEncrypted, encryptionKey)
}

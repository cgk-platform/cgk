/**
 * Google Ads token refresh
 *
 * @ai-pattern token-refresh
 * @ai-required Handle invalid_grant errors for revoked tokens
 */

import { sql, withTenant } from '@cgk/db'

import { decryptToken, encryptToken } from '../encryption.js'
import type { TokenRefreshResult } from '../types.js'

import {
  getGoogleAdsClientId,
  getGoogleAdsClientSecret,
  getGoogleAdsEncryptionKey,
  GOOGLE_ADS_OAUTH_CONFIG,
} from './config.js'
import { getGoogleAdsConnection } from './oauth.js'

/**
 * Refresh Google Ads access token using refresh token
 *
 * @param tenantId - The tenant whose token to refresh
 * @returns The new access token
 */
export async function refreshGoogleAdsToken(
  tenantId: string
): Promise<TokenRefreshResult> {
  const connection = await getGoogleAdsConnection(tenantId)

  if (!connection) {
    return { success: false, error: 'No Google Ads connection found' }
  }

  const encryptionKey = getGoogleAdsEncryptionKey()
  const clientId = getGoogleAdsClientId()
  const clientSecret = getGoogleAdsClientSecret()

  // Decrypt refresh token
  const refreshToken = await decryptToken(
    connection.refreshTokenEncrypted,
    encryptionKey
  )

  // Request new access token
  const response = await fetch(GOOGLE_ADS_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = (await response.json()) as {
      error?: string
      error_description?: string
    }

    // Handle invalid_grant (token revoked)
    if (error.error === 'invalid_grant') {
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE google_ads_connections
          SET needs_reauth = true, last_error = 'Token revoked - please reconnect'
          WHERE tenant_id = ${tenantId}
        `
      })
      return {
        success: false,
        error: 'Google Ads token revoked - re-authorization required',
      }
    }

    const errorMessage = error.error_description || error.error || 'Token refresh failed'
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE google_ads_connections
        SET last_error = ${errorMessage}
        WHERE tenant_id = ${tenantId}
      `
    })

    return { success: false, error: errorMessage }
  }

  const refreshData = (await response.json()) as { access_token: string; expires_in: number }
  const { access_token, expires_in } = refreshData

  // Encrypt and store new access token
  const encryptedToken = await encryptToken(access_token, encryptionKey)
  const expiresAt = new Date(Date.now() + expires_in * 1000)

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE google_ads_connections
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
 * Check if Google Ads token needs refresh
 *
 * @param tenantId - The tenant to check
 * @returns true if token expires within refresh buffer
 */
export async function needsGoogleAdsTokenRefresh(
  tenantId: string
): Promise<boolean> {
  const connection = await getGoogleAdsConnection(tenantId)

  if (!connection) {
    return false
  }

  if (!connection.tokenExpiresAt) {
    return false
  }

  // Check if token expires within refresh buffer (5 minutes)
  const refreshThreshold = new Date(
    Date.now() + GOOGLE_ADS_OAUTH_CONFIG.tokenRefreshBuffer * 1000
  )

  return connection.tokenExpiresAt <= refreshThreshold
}

/**
 * Get decrypted Google Ads access token, refreshing if needed
 *
 * @param tenantId - The tenant whose token to get
 * @returns The decrypted access token
 */
export async function getGoogleAdsAccessToken(tenantId: string): Promise<string> {
  const connection = await getGoogleAdsConnection(tenantId)

  if (!connection) {
    throw new Error('No Google Ads connection found')
  }

  if (connection.needsReauth) {
    throw new Error('Google Ads connection requires re-authorization')
  }

  // Check if token needs refresh
  if (await needsGoogleAdsTokenRefresh(tenantId)) {
    const result = await refreshGoogleAdsToken(tenantId)
    if (!result.success) {
      throw new Error(result.error || 'Token refresh failed')
    }
    // Get updated connection after refresh
    const updatedConnection = await getGoogleAdsConnection(tenantId)
    if (!updatedConnection) {
      throw new Error('Connection lost after refresh')
    }
    const encryptionKey = getGoogleAdsEncryptionKey()
    return decryptToken(updatedConnection.accessTokenEncrypted, encryptionKey)
  }

  const encryptionKey = getGoogleAdsEncryptionKey()
  return decryptToken(connection.accessTokenEncrypted, encryptionKey)
}

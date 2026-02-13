/**
 * Token refresh job
 *
 * Automatically refreshes expiring integration tokens before they expire.
 * Runs every 6 hours to check for tokens that need refresh.
 *
 * @ai-pattern background-job
 * @ai-required Tokens must be refreshed proactively
 */

import { sql } from '@cgk-platform/db'
import { defineJob } from '@cgk-platform/jobs'

import { refreshGoogleAdsToken } from '../google-ads/refresh.js'
import { refreshMetaToken } from '../meta/refresh.js'
import { refreshTikTokToken } from '../tiktok/refresh.js'

/** Provider types for token refresh */
type RefreshableProvider = 'meta' | 'google_ads' | 'tiktok'

/** Expiring connection info */
interface ExpiringConnection {
  tenantId: string
  provider: RefreshableProvider
  tokenExpiresAt: Date
}

/**
 * Get all connections with tokens expiring soon
 */
async function getExpiringConnections(): Promise<ExpiringConnection[]> {
  // Query all tenants' connections for expiring tokens
  // Meta: 7 days buffer, Google/TikTok: 1 hour buffer
  const result = await sql`
    SELECT
      tenant_id as "tenantId",
      'meta' as provider,
      token_expires_at as "tokenExpiresAt"
    FROM meta_ad_connections
    WHERE token_expires_at < NOW() + INTERVAL '7 days'
      AND needs_reauth = false
      AND token_type != 'system_user'
      AND status != 'disconnected'

    UNION ALL

    SELECT
      tenant_id as "tenantId",
      'google_ads' as provider,
      token_expires_at as "tokenExpiresAt"
    FROM google_ads_connections
    WHERE token_expires_at < NOW() + INTERVAL '1 hour'
      AND needs_reauth = false
      AND status != 'disconnected'

    UNION ALL

    SELECT
      tenant_id as "tenantId",
      'tiktok' as provider,
      token_expires_at as "tokenExpiresAt"
    FROM tiktok_ad_connections
    WHERE token_expires_at < NOW() + INTERVAL '1 hour'
      AND needs_reauth = false
      AND status != 'disconnected'
  `

  return result.rows.map((row) => ({
    tenantId: row.tenantId as string,
    provider: row.provider as RefreshableProvider,
    tokenExpiresAt: new Date(row.tokenExpiresAt as string),
  }))
}

/**
 * Notify tenant admin about token refresh failure
 */
async function notifyTokenRefreshFailed(
  tenantId: string,
  provider: RefreshableProvider,
  error: unknown
): Promise<void> {
  // Log the failure - in production, this would send an email/notification
  console.error(
    `[token-refresh] Failed to refresh ${provider} token for tenant ${tenantId}:`,
    error instanceof Error ? error.message : error
  )

  // TODO: Send notification to tenant admin via email/push
  // await sendAdminNotification(tenantId, {
  //   type: 'integration_token_refresh_failed',
  //   provider,
  //   error: error instanceof Error ? error.message : 'Unknown error',
  // })
}

/**
 * Refresh expiring integration tokens job
 *
 * This job:
 * 1. Queries all connections with expiring tokens
 * 2. Refreshes each token using the appropriate provider
 * 3. Notifies tenant admins on failure
 */
export const refreshExpiringTokensJob = defineJob({
  name: 'refresh-expiring-integration-tokens',

  handler: async () => {
    const expiringConnections = await getExpiringConnections()

    console.log(
      `[token-refresh] Found ${expiringConnections.length} tokens to refresh`
    )

    const results = {
      total: expiringConnections.length,
      success: 0,
      failed: 0,
      errors: [] as { tenantId: string; provider: string; error: string }[],
    }

    for (const connection of expiringConnections) {
      try {
        let refreshResult

        switch (connection.provider) {
          case 'meta':
            refreshResult = await refreshMetaToken(connection.tenantId)
            break
          case 'google_ads':
            refreshResult = await refreshGoogleAdsToken(connection.tenantId)
            break
          case 'tiktok':
            refreshResult = await refreshTikTokToken(connection.tenantId)
            break
        }

        if (refreshResult.success) {
          results.success++
          console.log(
            `[token-refresh] Refreshed ${connection.provider} token for tenant ${connection.tenantId}`
          )
        } else {
          results.failed++
          results.errors.push({
            tenantId: connection.tenantId,
            provider: connection.provider,
            error: refreshResult.error || 'Unknown error',
          })
          await notifyTokenRefreshFailed(
            connection.tenantId,
            connection.provider,
            new Error(refreshResult.error || 'Unknown error')
          )
        }
      } catch (error) {
        results.failed++
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        results.errors.push({
          tenantId: connection.tenantId,
          provider: connection.provider,
          error: errorMessage,
        })

        console.error(
          `[token-refresh] Failed to refresh ${connection.provider} token for tenant ${connection.tenantId}:`,
          error
        )

        await notifyTokenRefreshFailed(
          connection.tenantId,
          connection.provider,
          error
        )
      }
    }

    console.log(
      `[token-refresh] Completed: ${results.success} success, ${results.failed} failed`
    )

    return {
      success: results.failed === 0,
      data: results,
    }
  },

  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 60000, // 1 minute
  },
})

/**
 * Token refresh schedule configuration
 *
 * Runs every 6 hours (cron: 0 0,6,12,18 * * *)
 */
export const TOKEN_REFRESH_SCHEDULE = {
  id: 'token-refresh-schedule',
  cron: '0 */6 * * *',
  description: 'Refresh expiring integration tokens every 6 hours',
}

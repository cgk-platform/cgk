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
 * Provider display names for email notifications
 */
const PROVIDER_NAMES: Record<RefreshableProvider, string> = {
  meta: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok: 'TikTok Ads',
}

/**
 * Get admin emails for a tenant
 */
async function getTenantAdminEmails(tenantId: string): Promise<string[]> {
  const result = await sql`
    SELECT u.email
    FROM users u
    JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = ${tenantId}
      AND uo.role IN ('owner', 'admin')
      AND u.email IS NOT NULL
    ORDER BY
      CASE uo.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 END
    LIMIT 3
  `

  return result.rows.map(row => (row as { email: string }).email)
}

/**
 * Notify tenant admin about token refresh failure
 */
async function notifyTokenRefreshFailed(
  tenantId: string,
  provider: RefreshableProvider,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'

  // Always log the failure
  console.error(
    `[token-refresh] Failed to refresh ${provider} token for tenant ${tenantId}:`,
    errorMessage
  )

  try {
    // Get tenant's Resend client (dynamic import to avoid circular deps)
    const { getTenantResendClient, getTenantResendSenderConfig } = await import(
      '../tenant-credentials/clients/resend.js'
    )

    const resend = await getTenantResendClient(tenantId)
    if (!resend) {
      console.warn(`[token-refresh] Cannot send notification - Resend not configured for ${tenantId}`)
      return
    }

    const senderConfig = await getTenantResendSenderConfig(tenantId)
    const fromEmail = senderConfig?.fromEmail || 'noreply@notifications.cgk.io'
    const fromName = senderConfig?.fromName || 'CGK Platform'

    // Get admin emails
    const adminEmails = await getTenantAdminEmails(tenantId)
    if (adminEmails.length === 0) {
      console.warn(`[token-refresh] No admin emails found for tenant ${tenantId}`)
      return
    }

    const providerName = PROVIDER_NAMES[provider]

    // Send notification email
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: adminEmails,
      subject: `Action Required: ${providerName} Integration Needs Reconnection`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Integration Token Refresh Failed</h2>
          <p style="color: #475569;">
            We were unable to automatically refresh your <strong>${providerName}</strong>
            integration credentials. This may cause your ad campaigns to stop syncing data.
          </p>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0;">
            <strong style="color: #991b1b;">Error:</strong>
            <p style="color: #7f1d1d; margin: 4px 0 0 0;">${errorMessage}</p>
          </div>

          <h3 style="color: #1e293b; margin-top: 24px;">What to do:</h3>
          <ol style="color: #475569; padding-left: 20px;">
            <li>Go to <strong>Settings → Integrations</strong> in your admin dashboard</li>
            <li>Find the ${providerName} integration</li>
            <li>Click <strong>Reconnect</strong> to re-authorize the connection</li>
          </ol>

          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
            If you continue to experience issues, please contact support.
          </p>
        </div>
      `,
    })

    console.log(`[token-refresh] Sent failure notification to ${adminEmails.join(', ')} for ${tenantId}`)
  } catch (emailError) {
    // Don't let email failures break the job
    console.error(
      `[token-refresh] Failed to send notification email for ${tenantId}:`,
      emailError instanceof Error ? emailError.message : emailError
    )
  }
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

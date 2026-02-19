/**
 * Webhook Health Check Job
 *
 * Periodically checks webhook registrations with Shopify and re-registers missing ones.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { getShopifyCredentials } from '@cgk-platform/shopify'
import { syncWebhookRegistrations } from '@cgk-platform/shopify/webhooks'
import { defineJob } from '../define'
import type { JobResult } from '../types'

/**
 * Health check job result
 */
interface HealthCheckResult {
  tenantsChecked: number
  webhooksReRegistered: number
  errors: Array<{ tenantId: string; shop: string; error: string }>
}

interface TenantWebhookInfo {
  tenantId: string
  shop: string
  accessToken: string
}

/**
 * Get the webhook base URL from environment
 */
function getWebhookBaseUrl(): string {
  const base = process.env.SHOPIFY_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  return base.replace(/\/$/, '')
}

/**
 * Load active tenant slugs from the public organizations table.
 * Then for each tenant, use getShopifyCredentials() which handles decryption.
 */
async function loadActiveTenantsWithShopify(tenantIds?: string[]): Promise<TenantWebhookInfo[]> {
  const orgsRes = tenantIds && tenantIds.length > 0
    ? await sql`
        SELECT slug FROM public.organizations
        WHERE status = 'active'
          AND slug = ANY(${`{${tenantIds.join(',')}}`}::text[])
      `
    : await sql`
        SELECT slug FROM public.organizations
        WHERE status = 'active'
      `

  const tenants: TenantWebhookInfo[] = []

  for (const org of orgsRes.rows as Array<{ slug: string }>) {
    try {
      // getShopifyCredentials handles decryption and caching
      const creds = await getShopifyCredentials(org.slug)
      tenants.push({
        tenantId: org.slug,
        shop: creds.shop,
        accessToken: creds.accessToken,
      })
    } catch {
      // Tenant not connected to Shopify - skip silently
    }
  }

  return tenants
}

/**
 * Webhook health check job
 *
 * Runs every hour to:
 * 1. Load active tenants with Shopify connections
 * 2. For each tenant, compare registered webhooks against required list
 * 3. Re-register any missing webhooks
 * 4. Log results
 */
export const webhookHealthCheckJob = defineJob<{ tenantIds?: string[] }>({
  name: 'webhooks/health-check',
  handler: async (job): Promise<JobResult<HealthCheckResult>> => {
    const { tenantIds } = job.payload

    console.log(`[webhooks/health-check] Starting health check`, {
      tenantIds: tenantIds?.join(',') || 'all',
      jobId: job.id,
    })

    const webhookBaseUrl = getWebhookBaseUrl()
    if (!webhookBaseUrl) {
      return {
        success: false,
        error: {
          message: 'SHOPIFY_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL env var not configured',
          retryable: false,
        },
      }
    }

    const errors: Array<{ tenantId: string; shop: string; error: string }> = []
    let webhooksReRegistered = 0

    // Load active tenants with Shopify connections
    let tenants: TenantWebhookInfo[]
    try {
      tenants = await loadActiveTenantsWithShopify(tenantIds)
    } catch (err) {
      return {
        success: false,
        error: {
          message: `Failed to load tenants: ${err instanceof Error ? err.message : String(err)}`,
          retryable: true,
        },
      }
    }

    console.log(`[webhooks/health-check] Checking ${tenants.length} tenants`)

    // Check each tenant
    for (const tenant of tenants) {
      const webhookUrl = `${webhookBaseUrl}/api/webhooks/shopify/${tenant.tenantId}`
      try {
        const syncResult = await syncWebhookRegistrations(
          tenant.tenantId,
          tenant.shop,
          { shop: tenant.shop, accessToken: tenant.accessToken, webhookSecret: '' },
          webhookUrl
        )

        if (syncResult.added.length > 0) {
          console.log(`[webhooks/health-check] Re-registered ${syncResult.added.length} webhooks for ${tenant.shop}:`, syncResult.added)
          webhooksReRegistered += syncResult.added.length
        }

        if (syncResult.errors.length > 0) {
          for (const e of syncResult.errors) {
            errors.push({ tenantId: tenant.tenantId, shop: tenant.shop, error: `${e.topic}: ${e.error}` })
          }
        }

        console.log(`[webhooks/health-check] ${tenant.shop}: +${syncResult.added.length} added, ${syncResult.unchanged.length} ok, ${syncResult.errors.length} errors`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[webhooks/health-check] Error checking ${tenant.shop}:`, err)
        errors.push({ tenantId: tenant.tenantId, shop: tenant.shop, error: message })
      }
    }

    return {
      success: true,
      data: {
        tenantsChecked: tenants.length,
        webhooksReRegistered,
        errors,
      },
    }
  },
  retry: {
    maxAttempts: 2,
    backoff: 'exponential',
    initialDelay: 30000,
  },
})

/**
 * Cleanup old webhook events job
 */
export const cleanupOldWebhookEventsJob = defineJob<{
  tenantIds?: string[]
  retentionDays?: number
}>({
  name: 'webhooks/cleanup-old-events',
  handler: async (job): Promise<JobResult<{ deleted: number }>> => {
    const { tenantIds, retentionDays = 30 } = job.payload

    console.log(`[webhooks/cleanup-old-events] Cleaning events older than ${retentionDays} days`, {
      tenantIds: tenantIds?.join(',') || 'all',
    })

    let totalDeleted = 0

    let tenants: TenantWebhookInfo[]
    try {
      tenants = await loadActiveTenantsWithShopify(tenantIds)
    } catch {
      tenants = []
    }

    for (const tenant of tenants) {
      try {
        const result = await withTenant(tenant.tenantId, async () => {
          const res = await sql`
            DELETE FROM webhook_events
            WHERE received_at < NOW() - (${retentionDays} || ' days')::INTERVAL
          `
          return res.rowCount ?? 0
        })
        totalDeleted += result
      } catch (err) {
        console.error(`[webhooks/cleanup-old-events] Error cleaning ${tenant.tenantId}:`, err)
      }
    }

    console.log(`[webhooks/cleanup-old-events] Deleted ${totalDeleted} old webhook events`)

    return {
      success: true,
      data: { deleted: totalDeleted },
    }
  },
  retry: {
    maxAttempts: 1,
  },
})

/**
 * Schedule configurations
 */
export const HEALTH_CHECK_SCHEDULE = '0 * * * *' // Every hour
export const CLEANUP_SCHEDULE = '0 4 * * *' // Daily at 4 AM

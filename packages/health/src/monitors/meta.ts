/**
 * Meta Ads health monitor (per-tenant)
 *
 * Checks Meta Graph API connectivity and token validity.
 */

import { sql } from '@cgk-platform/db'

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * Meta credentials for a tenant
 */
interface MetaCredentials {
  accessToken: string
  adAccountId: string
}

/**
 * Get Meta credentials for a tenant from the database
 */
async function getMetaCredentials(tenantId: string): Promise<MetaCredentials | null> {
  try {
    // Meta credentials would be stored in organization settings
    const result = await sql<{
      settings: {
        meta?: {
          accessToken?: string
          adAccountId?: string
        }
      }
    }>`
      SELECT settings
      FROM public.organizations
      WHERE id = ${tenantId} OR slug = ${tenantId}
      LIMIT 1
    `

    const settings = result.rows[0]?.settings
    if (!settings?.meta?.accessToken || !settings?.meta?.adAccountId) {
      return null
    }

    return {
      accessToken: settings.meta.accessToken,
      adAccountId: settings.meta.adAccountId,
    }
  } catch {
    return null
  }
}

/**
 * Meta Graph API error response
 */
interface MetaErrorResponse {
  error?: {
    message: string
    code: number
    error_subcode?: number
    type: string
  }
}

/**
 * Check Meta Ads API health for a tenant
 */
export async function checkMeta(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  if (!tenantId) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Tenant ID required for Meta Ads health check',
      },
    }
  }

  const credentials = await getMetaCredentials(tenantId)
  if (!credentials) {
    return {
      status: 'unknown',
      latencyMs: Date.now() - startTime,
      details: {
        error: 'No Meta Ads credentials configured',
        tenantId,
      },
    }
  }

  try {
    // Simple account info request to verify token
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${credentials.accessToken}`
    )

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as MetaErrorResponse

      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          error: errorData.error?.message || 'Unknown error',
          errorCode: errorData.error?.code,
          errorType: errorData.error?.type,
          tenantId,
        },
        error: errorData.error?.message || 'Meta API request failed',
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 500, 2000)

    return {
      status,
      latencyMs,
      details: {
        accountId: credentials.adAccountId,
        connected: true,
        tenantId,
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Meta Ads health monitor configuration
 */
export const metaMonitor: HealthMonitor = {
  name: 'meta',
  tier: 'integrations',
  check: checkMeta,
  requiresTenant: true,
}

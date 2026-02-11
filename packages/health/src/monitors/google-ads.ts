/**
 * Google Ads health monitor (per-tenant)
 *
 * Checks Google Ads API connectivity and OAuth token validity.
 */

import { sql } from '@cgk/db'

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * Google Ads credentials for a tenant
 */
interface GoogleAdsCredentials {
  refreshToken: string
  customerId: string
  developerToken: string
  clientId: string
  clientSecret: string
}

/**
 * Get Google Ads credentials for a tenant from the database
 */
async function getGoogleAdsCredentials(
  tenantId: string
): Promise<GoogleAdsCredentials | null> {
  try {
    // Google Ads credentials would be stored in organization settings
    const result = await sql<{
      settings: {
        googleAds?: {
          refreshToken?: string
          customerId?: string
        }
      }
    }>`
      SELECT settings
      FROM public.organizations
      WHERE id = ${tenantId} OR slug = ${tenantId}
      LIMIT 1
    `

    const settings = result.rows[0]?.settings
    if (!settings?.googleAds?.refreshToken || !settings?.googleAds?.customerId) {
      return null
    }

    // Platform-wide credentials from environment
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET

    if (!developerToken || !clientId || !clientSecret) {
      return null
    }

    return {
      refreshToken: settings.googleAds.refreshToken,
      customerId: settings.googleAds.customerId,
      developerToken,
      clientId,
      clientSecret,
    }
  } catch {
    return null
  }
}

/**
 * Verify Google OAuth token is still valid
 */
async function verifyGoogleToken(
  credentials: GoogleAdsCredentials
): Promise<{ valid: boolean; expiresIn?: number }> {
  try {
    // Attempt to refresh the token to verify it's valid
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      return { valid: false }
    }

    const data = (await response.json()) as {
      access_token: string
      expires_in: number
    }

    return {
      valid: true,
      expiresIn: data.expires_in,
    }
  } catch {
    return { valid: false }
  }
}

/**
 * Check Google Ads API health for a tenant
 */
export async function checkGoogleAds(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  if (!tenantId) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Tenant ID required for Google Ads health check',
      },
    }
  }

  const credentials = await getGoogleAdsCredentials(tenantId)
  if (!credentials) {
    return {
      status: 'unknown',
      latencyMs: Date.now() - startTime,
      details: {
        error: 'No Google Ads credentials configured',
        tenantId,
      },
    }
  }

  try {
    // Verify OAuth token is valid
    const tokenResult = await verifyGoogleToken(credentials)

    const latencyMs = Date.now() - startTime

    if (!tokenResult.valid) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          error: 'OAuth token is invalid or expired',
          customerId: credentials.customerId,
          tenantId,
        },
        error: 'OAuth token is invalid or expired',
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 1000, 3000)

    return {
      status,
      latencyMs,
      details: {
        customerId: credentials.customerId,
        tokenValid: true,
        tokenExpiresIn: tokenResult.expiresIn,
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
 * Google Ads health monitor configuration
 */
export const googleAdsMonitor: HealthMonitor = {
  name: 'google-ads',
  tier: 'integrations',
  check: checkGoogleAds,
  requiresTenant: true,
}

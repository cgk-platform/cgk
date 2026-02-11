/**
 * Wise API health monitor
 *
 * Checks Wise API connectivity and profile verification.
 */

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * Wise profile response type
 */
interface WiseProfile {
  id: number
  type: 'PERSONAL' | 'BUSINESS'
  details: {
    name?: string
    firstName?: string
    lastName?: string
  }
}

/**
 * Wise balance response type
 */
interface WiseBalance {
  currency: string
  amount: {
    value: number
    currency: string
  }
}

/**
 * Check Wise API health
 */
export async function checkWise(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const wiseApiToken = process.env.WISE_API_TOKEN
  const wiseApiUrl = process.env.WISE_API_URL || 'https://api.wise.com'

  if (!wiseApiToken) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Wise API token not configured. Set WISE_API_TOKEN.',
      },
    }
  }

  try {
    // Get profiles to verify connectivity
    const profilesResponse = await fetch(`${wiseApiUrl}/v2/profiles`, {
      headers: {
        Authorization: `Bearer ${wiseApiToken}`,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!profilesResponse.ok) {
      const errorText = await profilesResponse.text().catch(() => 'Unknown error')
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: profilesResponse.status,
          error: errorText,
        },
        error: `Wise API returned ${profilesResponse.status}`,
      }
    }

    const profiles = (await profilesResponse.json()) as WiseProfile[]

    if (!profiles.length) {
      return {
        status: 'degraded',
        latencyMs,
        details: {
          warning: 'No Wise profiles found',
          profileCount: 0,
        },
      }
    }

    // Get balances for primary profile
    const primaryProfile = profiles[0]
    let balances: WiseBalance[] = []

    try {
      const balanceResponse = await fetch(
        `${wiseApiUrl}/v4/profiles/${primaryProfile?.id}/balances?types=STANDARD`,
        {
          headers: {
            Authorization: `Bearer ${wiseApiToken}`,
          },
        }
      )

      if (balanceResponse.ok) {
        balances = (await balanceResponse.json()) as WiseBalance[]
      }
    } catch {
      // Balance fetch is optional, don't fail health check
    }

    const status = evaluateLatencyHealth(latencyMs, 500, 2000)

    return {
      status,
      latencyMs,
      details: {
        profileCount: profiles.length,
        primaryProfileId: primaryProfile?.id,
        primaryProfileType: primaryProfile?.type,
        balances: balances.map((b) => ({
          currency: b.currency,
          amount: b.amount?.value || 0,
        })),
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Wise API health monitor configuration
 */
export const wiseMonitor: HealthMonitor = {
  name: 'wise',
  tier: 'integrations',
  check: checkWise,
  requiresTenant: false,
}

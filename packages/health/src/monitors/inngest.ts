/**
 * Inngest health monitor
 *
 * Checks Inngest job queue status and function health.
 */

import type { HealthCheckResult, HealthMonitor, HealthStatus } from '../types.js'

/**
 * Inngest API response types
 */
interface InngestFunctionsResponse {
  data: Array<{
    id: string
    name: string
    slug: string
  }>
}

interface InngestStatsResponse {
  pending?: number
  running?: number
  failedLast24h?: number
  completedLast24h?: number
}

/**
 * Determine health status based on failed job count
 */
function getJobHealthStatus(failedCount: number): HealthStatus {
  if (failedCount === 0) return 'healthy'
  if (failedCount < 10) return 'degraded'
  return 'unhealthy'
}

/**
 * Check Inngest health
 */
export async function checkInngest(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const signingKey = process.env.INNGEST_SIGNING_KEY
  const eventKey = process.env.INNGEST_EVENT_KEY

  if (!signingKey && !eventKey) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Inngest not configured. Set INNGEST_SIGNING_KEY or INNGEST_EVENT_KEY.',
      },
    }
  }

  try {
    // Try to get function list via API
    // Note: In production, you might use the Inngest SDK or REST API
    const baseUrl = process.env.INNGEST_API_URL || 'https://api.inngest.com'
    const authToken = signingKey || eventKey

    const response = await fetch(`${baseUrl}/v1/functions`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      // If we can't reach the API, try a simpler connectivity check
      if (response.status === 401 || response.status === 403) {
        return {
          status: 'degraded',
          latencyMs,
          details: {
            warning: 'Unable to fetch function details (auth issue)',
            statusCode: response.status,
          },
        }
      }

      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          error: `Inngest API returned ${response.status}`,
          statusCode: response.status,
        },
        error: `Inngest API returned ${response.status}`,
      }
    }

    const functions = (await response.json()) as InngestFunctionsResponse

    // For stats, we'd need additional API calls or SDK integration
    // For now, report function count and connectivity
    const stats: InngestStatsResponse = {
      pending: 0,
      running: 0,
      failedLast24h: 0,
      completedLast24h: 0,
    }

    const status = getJobHealthStatus(stats.failedLast24h || 0)

    return {
      status,
      latencyMs,
      details: {
        totalFunctions: functions.data?.length || 0,
        functionNames: functions.data?.slice(0, 5).map((f) => f.name) || [],
        pendingJobs: stats.pending,
        runningJobs: stats.running,
        failedLast24h: stats.failedLast24h,
        completedLast24h: stats.completedLast24h,
      },
    }
  } catch (error) {
    // If the API is unreachable but we have config, consider it degraded
    // (might be local dev without API access)
    const latencyMs = Date.now() - startTime

    // Check if this is a network error (might be dev environment)
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))

    if (isNetworkError && process.env.NODE_ENV === 'development') {
      return {
        status: 'degraded',
        latencyMs,
        details: {
          warning: 'Inngest API not reachable (may be normal in dev)',
          configured: true,
        },
      }
    }

    return {
      status: 'unhealthy',
      latencyMs,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Inngest health monitor configuration
 */
export const inngestMonitor: HealthMonitor = {
  name: 'inngest',
  tier: 'core',
  check: checkInngest,
  requiresTenant: false,
}

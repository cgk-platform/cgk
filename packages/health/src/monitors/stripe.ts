/**
 * Stripe health monitor
 *
 * Checks Stripe API connectivity and balance status.
 */

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * Check Stripe health
 */
export async function checkStripe(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Stripe secret key not configured. Set STRIPE_SECRET_KEY.',
      },
    }
  }

  try {
    // Use the balance endpoint as a lightweight health check
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `Stripe API returned ${response.status}`

      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        return {
          status: 'degraded',
          latencyMs,
          details: {
            error: 'Rate limited',
            retryAfter: retryAfter || 'unknown',
          },
          error: 'Rate limited',
        }
      }

      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: errorMessage,
        },
        error: errorMessage,
      }
    }

    const balance = (await response.json()) as {
      available: Array<{ amount: number; currency: string }>
      pending: Array<{ amount: number; currency: string }>
    }

    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0)
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0)
    const currencies = [...new Set(balance.available.map((b) => b.currency))]

    const status = evaluateLatencyHealth(latencyMs, 200, 1000)

    return {
      status,
      latencyMs,
      details: {
        availableBalanceCents: availableBalance,
        pendingBalanceCents: pendingBalance,
        currencies,
        accountCount: balance.available.length,
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
 * Stripe health monitor configuration
 */
export const stripeMonitor: HealthMonitor = {
  name: 'stripe',
  tier: 'core',
  check: checkStripe,
  requiresTenant: false,
}

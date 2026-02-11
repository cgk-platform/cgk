/**
 * External service health monitors
 *
 * Monitors for third-party services: Mux, AssemblyAI, Slack, Yotpo, Loop, Vercel
 */

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * Check Mux video API health
 */
export async function checkMux(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const muxTokenId = process.env.MUX_TOKEN_ID
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET

  if (!muxTokenId || !muxTokenSecret) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Mux credentials not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.',
      },
    }
  }

  try {
    const auth = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString('base64')

    // Simple assets list request to verify connectivity
    const response = await fetch('https://api.mux.com/video/v1/assets?limit=1', {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: `Mux API returned ${response.status}`,
        },
        error: `Mux API returned ${response.status}`,
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 500, 2000)

    return {
      status,
      latencyMs,
      details: {
        connected: true,
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
 * Check AssemblyAI transcription API health
 */
export async function checkAssemblyAI(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY

  if (!assemblyApiKey) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'AssemblyAI API key not configured. Set ASSEMBLYAI_API_KEY.',
      },
    }
  }

  try {
    // Simple account info request
    const response = await fetch('https://api.assemblyai.com/v2/account', {
      headers: {
        Authorization: assemblyApiKey,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: `AssemblyAI API returned ${response.status}`,
        },
        error: `AssemblyAI API returned ${response.status}`,
      }
    }

    const account = (await response.json()) as {
      balance?: number
    }

    const status = evaluateLatencyHealth(latencyMs, 500, 2000)

    return {
      status,
      latencyMs,
      details: {
        connected: true,
        balance: account.balance,
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
 * Check Slack webhook/API health
 */
export async function checkSlack(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
  const slackBotToken = process.env.SLACK_BOT_TOKEN

  if (!slackWebhookUrl && !slackBotToken) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Slack not configured. Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN.',
      },
    }
  }

  try {
    if (slackBotToken) {
      // Use the auth.test endpoint to verify token
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${slackBotToken}`,
          'Content-Type': 'application/json',
        },
      })

      const latencyMs = Date.now() - startTime
      const data = (await response.json()) as { ok: boolean; team?: string; error?: string }

      if (!data.ok) {
        return {
          status: 'unhealthy',
          latencyMs,
          details: {
            error: data.error || 'Auth test failed',
          },
          error: data.error || 'Auth test failed',
        }
      }

      const status = evaluateLatencyHealth(latencyMs, 500, 2000)

      return {
        status,
        latencyMs,
        details: {
          connected: true,
          team: data.team,
          method: 'bot_token',
        },
      }
    }

    // For webhook, we can't really test without sending a message
    // Just verify the URL is valid format
    const url = new URL(slackWebhookUrl as string)
    if (!url.hostname.includes('slack.com')) {
      return {
        status: 'degraded',
        latencyMs: Date.now() - startTime,
        details: {
          warning: 'Webhook URL does not appear to be a Slack URL',
          method: 'webhook',
        },
      }
    }

    return {
      status: 'healthy',
      latencyMs: Date.now() - startTime,
      details: {
        connected: true,
        method: 'webhook',
        warning: 'Webhook connectivity not verified without sending test message',
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
 * Check Yotpo reviews API health
 */
export async function checkYotpo(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const yotpoAppKey = process.env.YOTPO_APP_KEY
  const yotpoSecretKey = process.env.YOTPO_SECRET_KEY

  if (!yotpoAppKey || !yotpoSecretKey) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Yotpo credentials not configured. Set YOTPO_APP_KEY and YOTPO_SECRET_KEY.',
      },
    }
  }

  try {
    // Get access token
    const tokenResponse = await fetch('https://api.yotpo.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: yotpoAppKey,
        client_secret: yotpoSecretKey,
        grant_type: 'client_credentials',
      }),
    })

    const latencyMs = Date.now() - startTime

    if (!tokenResponse.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: tokenResponse.status,
          error: `Yotpo auth returned ${tokenResponse.status}`,
        },
        error: `Yotpo auth returned ${tokenResponse.status}`,
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 1000, 3000)

    return {
      status,
      latencyMs,
      details: {
        connected: true,
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
 * Check Loop Returns API health
 */
export async function checkLoop(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const loopApiKey = process.env.LOOP_API_KEY

  if (!loopApiKey) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Loop API key not configured. Set LOOP_API_KEY.',
      },
    }
  }

  try {
    // Simple API call to verify connectivity
    const response = await fetch('https://api.loopreturns.com/api/v1/returns?limit=1', {
      headers: {
        'X-Authorization': loopApiKey,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: `Loop API returned ${response.status}`,
        },
        error: `Loop API returned ${response.status}`,
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 1000, 3000)

    return {
      status,
      latencyMs,
      details: {
        connected: true,
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
 * Check Vercel API health
 */
export async function checkVercel(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const vercelToken = process.env.VERCEL_TOKEN

  if (!vercelToken) {
    return {
      status: 'unknown',
      latencyMs: 0,
      details: {
        error: 'Vercel token not configured. Set VERCEL_TOKEN.',
      },
    }
  }

  try {
    // Get user info to verify token
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          statusCode: response.status,
          error: `Vercel API returned ${response.status}`,
        },
        error: `Vercel API returned ${response.status}`,
      }
    }

    const user = (await response.json()) as {
      user?: {
        username?: string
        email?: string
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 500, 2000)

    return {
      status,
      latencyMs,
      details: {
        connected: true,
        username: user.user?.username,
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
 * External service health monitors configuration
 */
export const muxMonitor: HealthMonitor = {
  name: 'mux',
  tier: 'external',
  check: checkMux,
  requiresTenant: false,
}

export const assemblyAIMonitor: HealthMonitor = {
  name: 'assemblyai',
  tier: 'external',
  check: checkAssemblyAI,
  requiresTenant: false,
}

export const slackMonitor: HealthMonitor = {
  name: 'slack',
  tier: 'external',
  check: checkSlack,
  requiresTenant: false,
}

export const yotpoMonitor: HealthMonitor = {
  name: 'yotpo',
  tier: 'external',
  check: checkYotpo,
  requiresTenant: false,
}

export const loopMonitor: HealthMonitor = {
  name: 'loop',
  tier: 'external',
  check: checkLoop,
  requiresTenant: false,
}

export const vercelMonitor: HealthMonitor = {
  name: 'vercel',
  tier: 'external',
  check: checkVercel,
  requiresTenant: false,
}

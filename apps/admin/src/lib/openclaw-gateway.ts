/**
 * Shared openCLAW gateway configuration for video editor routes.
 *
 * Centralizes the profile-to-gateway URL mapping so it doesn't need to be
 * duplicated across every route that pushes edits back to the agent.
 */

import { logger } from '@cgk-platform/logging'
export interface GatewayConfig {
  url: string
  token: string
}

const PROFILE_GATEWAY: Record<string, { urlEnv: string; port: string }> = {
  cgk: { urlEnv: 'OPENCLAW_CGK_GATEWAY_URL', port: '18789' },
  rawdog: { urlEnv: 'OPENCLAW_RAWDOG_GATEWAY_URL', port: '19001' },
  vitahustle: { urlEnv: 'OPENCLAW_VITAHUSTLE_GATEWAY_URL', port: '19021' },
}

export function getGatewayConfig(profile: string): GatewayConfig | null {
  const config = PROFILE_GATEWAY[profile]
  if (!config) return null

  const token = process.env.OPENCLAW_GATEWAY_TOKEN
  if (!token) {
    logger.error('[openclaw-gateway] OPENCLAW_GATEWAY_TOKEN is not set')
    return null
  }

  const url = process.env[config.urlEnv] ?? `http://localhost:${config.port}`
  return { url, token }
}

/**
 * Fire-and-forget message push to the openCLAW gateway.
 * Logs errors instead of silently swallowing them.
 */
export async function pushToGateway(
  profile: string,
  agentId: string,
  message: string
): Promise<void> {
  const gw = getGatewayConfig(profile)
  if (!gw) return

  try {
    const res = await fetch(`${gw.url}/api/sessions/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gw.token}`,
      },
      body: JSON.stringify({ agentId, message }),
    })
    if (!res.ok) {
      logger.error(
        `[openclaw-gateway] Push to ${profile} failed: ${res.status} ${await res.text()}`
      )
    }
  } catch (err) {
    logger.error(
      `[openclaw-gateway] Push to ${profile} error:`,
      err instanceof Error ? err : new Error(String(err))
    )
  }
}

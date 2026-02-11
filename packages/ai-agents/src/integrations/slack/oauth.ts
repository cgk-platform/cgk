/**
 * Slack OAuth flow handler
 */

import { upsertSlackConfig, getSlackConfig } from '../db/queries.js'
import { encrypt } from '../utils/encryption.js'
import type { TenantSlackConfig } from '../types.js'

const SLACK_OAUTH_URL = 'https://slack.com/api/oauth.v2.access'
const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize'

export interface SlackOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface SlackOAuthResult {
  ok: boolean
  access_token?: string
  token_type?: string
  scope?: string
  bot_user_id?: string
  app_id?: string
  team?: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
    access_token?: string
  }
  enterprise?: {
    id: string
    name: string
  }
  error?: string
}

/**
 * Default OAuth scopes for the Slack integration
 */
export const DEFAULT_SLACK_SCOPES = [
  // Bot scopes
  'app_mentions:read',
  'channels:history',
  'channels:join',
  'channels:read',
  'chat:write',
  'groups:history',
  'groups:read',
  'im:history',
  'im:read',
  'im:write',
  'mpim:history',
  'mpim:read',
  'mpim:write',
  'reactions:read',
  'reactions:write',
  'users:read',
  'users:read.email',
]

/**
 * Generate the Slack OAuth authorization URL
 */
export function generateSlackAuthUrl(config: SlackOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scopes.join(','),
    redirect_uri: config.redirectUri,
    state,
  })

  return `${SLACK_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange OAuth code for tokens
 */
export async function exchangeSlackOAuthCode(
  config: SlackOAuthConfig,
  code: string
): Promise<SlackOAuthResult> {
  const response = await fetch(SLACK_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(`Slack OAuth error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json() as SlackOAuthResult

  if (!result.ok) {
    throw new Error(`Slack OAuth error: ${result.error}`)
  }

  return result
}

/**
 * Complete the Slack OAuth flow and store tokens
 */
export async function completeSlackOAuth(
  config: SlackOAuthConfig,
  code: string,
  signingSecret: string
): Promise<TenantSlackConfig> {
  // Exchange code for tokens
  const result = await exchangeSlackOAuthCode(config, code)

  if (!result.access_token) {
    throw new Error('No access token received from Slack')
  }

  // Encrypt sensitive data
  const encryptedBotToken = encrypt(result.access_token)
  const encryptedClientSecret = encrypt(config.clientSecret)
  const encryptedSigningSecret = encrypt(signingSecret)
  const encryptedUserToken = result.authed_user?.access_token
    ? encrypt(result.authed_user.access_token)
    : null

  // Store in database
  const slackConfig = await upsertSlackConfig({
    slackClientId: config.clientId,
    slackClientSecretEncrypted: encryptedClientSecret,
    slackSigningSecretEncrypted: encryptedSigningSecret,
    slackAppId: result.app_id || null,
    slackBotTokenEncrypted: encryptedBotToken,
    slackUserTokenEncrypted: encryptedUserToken,
    slackBotUserId: result.bot_user_id || null,
    slackTeamId: result.team?.id || null,
    slackTeamName: result.team?.name || null,
    enabled: true,
    installedAt: new Date(),
    channelConfig: {},
  })

  return slackConfig
}

/**
 * Revoke Slack tokens (on disconnect)
 */
export async function revokeSlackTokens(botToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://slack.com/api/auth.revoke', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const result = await response.json() as { ok: boolean }
    return result.ok
  } catch (error) {
    console.error('[slack] Failed to revoke tokens:', error)
    return false
  }
}

/**
 * Test Slack connection
 */
export async function testSlackConnection(botToken: string): Promise<{
  ok: boolean
  team?: string
  user?: string
  error?: string
}> {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json() as {
      ok: boolean
      team?: string
      user?: string
      error?: string
    }

    return result
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if Slack is configured for tenant
 */
export async function isSlackConfigured(): Promise<boolean> {
  const config = await getSlackConfig()
  return Boolean(
    config?.enabled &&
      config.slackBotTokenEncrypted &&
      config.slackTeamId
  )
}

/**
 * Get Slack installation status
 */
export async function getSlackInstallationStatus(): Promise<{
  configured: boolean
  enabled: boolean
  teamName?: string
  teamId?: string
  installedAt?: Date
}> {
  const config = await getSlackConfig()

  if (!config) {
    return { configured: false, enabled: false }
  }

  return {
    configured: Boolean(config.slackBotTokenEncrypted),
    enabled: config.enabled,
    teamName: config.slackTeamName || undefined,
    teamId: config.slackTeamId || undefined,
    installedAt: config.installedAt || undefined,
  }
}

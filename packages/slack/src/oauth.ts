/**
 * @cgk-platform/slack - OAuth flow implementation
 *
 * @ai-pattern oauth
 * @ai-note Handles Slack OAuth authorization with bot and user scopes
 */

import { randomBytes } from 'crypto'

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'

import { encryptToken } from './encryption'
import type { SlackOAuthState, SlackOAuthResponse } from './types'

// Bot token scopes (40+)
export const BOT_SCOPES = [
  'chat:write',
  'chat:write.public',
  'chat:write.customize',
  'channels:read',
  'channels:join',
  'channels:history',
  'groups:read',
  'groups:history',
  'im:write',
  'im:history',
  'im:read',
  'mpim:write',
  'mpim:history',
  'mpim:read',
  'users:read',
  'users:read.email',
  'files:read',
  'files:write',
  'reactions:read',
  'reactions:write',
  'pins:read',
  'pins:write',
  'bookmarks:read',
  'bookmarks:write',
  'reminders:read',
  'reminders:write',
  'dnd:read',
  'usergroups:read',
  'usergroups:write',
  'team:read',
  'emoji:read',
]

// User token scopes (for personal assistant mode)
export const USER_SCOPES = [
  'channels:read',
  'channels:write',
  'channels:history',
  'groups:read',
  'groups:write',
  'groups:history',
  'im:read',
  'im:write',
  'im:history',
  'mpim:read',
  'mpim:write',
  'mpim:history',
  'users:read',
  'users:read.email',
  'users.profile:read',
  'chat:write',
  'files:read',
  'files:write',
  'reactions:read',
  'reactions:write',
  'pins:read',
  'pins:write',
  'reminders:read',
  'reminders:write',
  'bookmarks:read',
  'bookmarks:write',
  'search:read',
  'stars:read',
  'stars:write',
  'dnd:read',
  'dnd:write',
  'usergroups:read',
  'usergroups:write',
  'team:read',
]

const OAUTH_STATE_TTL_SECONDS = 600 // 10 minutes

interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Get OAuth configuration from environment variables
 */
export function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI

  if (!clientId) {
    throw new Error('SLACK_CLIENT_ID environment variable is required')
  }

  if (!clientSecret) {
    throw new Error('SLACK_CLIENT_SECRET environment variable is required')
  }

  if (!redirectUri) {
    throw new Error('SLACK_OAUTH_REDIRECT_URI environment variable is required')
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Generate a secure random state for CSRF protection
 */
export function generateOAuthState(tenantId: string, userId: string): SlackOAuthState {
  const nonce = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + OAUTH_STATE_TTL_SECONDS * 1000

  return {
    tenantId,
    userId,
    redirectUri: getOAuthConfig().redirectUri,
    nonce,
    expiresAt,
  }
}

/**
 * Serialize OAuth state for storage
 */
export function serializeOAuthState(state: SlackOAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

/**
 * Deserialize OAuth state from storage
 */
export function deserializeOAuthState(serialized: string): SlackOAuthState | null {
  try {
    const json = Buffer.from(serialized, 'base64url').toString('utf8')
    return JSON.parse(json) as SlackOAuthState
  } catch {
    return null
  }
}

/**
 * Validate OAuth state (check expiration and format)
 */
export function validateOAuthState(state: SlackOAuthState | null): boolean {
  if (!state) return false
  if (!state.tenantId || !state.userId || !state.nonce) return false
  if (Date.now() > state.expiresAt) return false
  return true
}

/**
 * Build the Slack OAuth authorization URL
 */
export function buildAuthorizationUrl(state: string): string {
  const config = getOAuthConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: BOT_SCOPES.join(','),
    user_scope: USER_SCOPES.join(','),
    redirect_uri: config.redirectUri,
    state,
  })

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<SlackOAuthResponse> {
  const config = getOAuthConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  })

  const response = await fetchWithTimeout('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    timeout: FETCH_TIMEOUTS.OAUTH,
  })

  if (!response.ok) {
    throw new Error(`Slack OAuth failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as SlackOAuthResponse
  return data
}

/**
 * Process OAuth response and extract encrypted tokens
 */
export function processOAuthResponse(response: SlackOAuthResponse): {
  workspaceId: string
  workspaceName: string | null
  botTokenEncrypted: string
  userTokenEncrypted: string | null
  connectedBySlackUserId: string | null
  botScopes: string[]
  userScopes: string[] | null
} | null {
  if (!response.ok || !response.access_token) {
    return null
  }

  const botTokenEncrypted = encryptToken(response.access_token)
  const userTokenEncrypted = response.authed_user?.access_token
    ? encryptToken(response.authed_user.access_token)
    : null

  return {
    workspaceId: response.team?.id ?? '',
    workspaceName: response.team?.name ?? null,
    botTokenEncrypted,
    userTokenEncrypted,
    connectedBySlackUserId: response.authed_user?.id ?? null,
    botScopes: response.scope?.split(',') ?? [],
    userScopes: response.authed_user?.scope?.split(',') ?? null,
  }
}

/**
 * Revoke Slack tokens (best effort)
 */
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('https://slack.com/api/auth.revoke', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: FETCH_TIMEOUTS.OAUTH,
    })

    const data = await response.json() as { ok: boolean }
    return data.ok
  } catch {
    // Best effort - token revocation failure is not critical
    return false
  }
}

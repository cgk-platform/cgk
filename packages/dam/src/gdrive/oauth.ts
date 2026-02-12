/**
 * Google Drive OAuth Flow
 * Handles OAuth authorization for Google Drive integration
 */

import { google, type Auth } from 'googleapis'

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface OAuthState {
  tenantId: string
  userId: string
  folderId?: string
  returnUrl?: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  scope: string
  token_type: string
}

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
]

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(config: OAuthConfig): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )
}

/**
 * Generate authorization URL for Google Drive OAuth
 */
export function generateAuthorizationUrl(
  config: OAuthConfig,
  state: OAuthState
): string {
  const oauth2Client = createOAuth2Client(config)

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: encodeOAuthState(state),
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string
): Promise<OAuthTokens> {
  const oauth2Client = createOAuth2Client(config)
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain OAuth tokens')
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    scope: tokens.scope || SCOPES.join(' '),
    token_type: tokens.token_type || 'Bearer',
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<{ access_token: string; expiry_date: number }> {
  const oauth2Client = createOAuth2Client(config)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }

  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
  }
}

/**
 * Revoke OAuth tokens
 */
export async function revokeTokens(
  config: OAuthConfig,
  accessToken: string
): Promise<void> {
  const oauth2Client = createOAuth2Client(config)
  oauth2Client.setCredentials({ access_token: accessToken })

  try {
    await oauth2Client.revokeToken(accessToken)
  } catch (error) {
    console.error('Failed to revoke token:', error)
    // Token may already be revoked, continue anyway
  }
}

/**
 * Encode OAuth state for URL
 */
export function encodeOAuthState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

/**
 * Decode OAuth state from URL
 */
export function decodeOAuthState(encoded: string): OAuthState {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString())
  } catch {
    throw new Error('Invalid OAuth state')
  }
}

/**
 * Check if access token is expired or about to expire
 */
export function isTokenExpired(expiryDate: number, bufferSeconds: number = 300): boolean {
  return Date.now() >= expiryDate - bufferSeconds * 1000
}

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfigFromEnv(): OAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Google OAuth configuration. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.'
    )
  }

  return { clientId, clientSecret, redirectUri }
}

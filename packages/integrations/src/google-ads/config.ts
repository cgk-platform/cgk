/**
 * Google Ads OAuth configuration
 *
 * @ai-pattern oauth-config
 * @ai-note Uses offline access for refresh tokens
 */

/** Google Ads OAuth endpoints */
export const GOOGLE_ADS_OAUTH_CONFIG = {
  /** Google OAuth authorization URL */
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',

  /** Token exchange and refresh URL */
  tokenUrl: 'https://oauth2.googleapis.com/token',

  /** Google Ads API base URL */
  adsApiUrl: 'https://googleads.googleapis.com/v17',

  /** OAuth scopes for Google Ads API access */
  scopes: ['https://www.googleapis.com/auth/adwords'],

  /** CRITICAL: Required for refresh token */
  accessType: 'offline' as const,

  /** Force consent to ensure refresh token is issued */
  prompt: 'consent' as const,

  /** Token refresh buffer: 5 minutes before expiry */
  tokenRefreshBuffer: 5 * 60,
} as const

/** Get the Google Ads Client ID from environment */
export function getGoogleAdsClientId(): string {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  if (!clientId) {
    throw new Error('GOOGLE_ADS_CLIENT_ID environment variable is required')
  }
  return clientId
}

/** Get the Google Ads Client Secret from environment */
export function getGoogleAdsClientSecret(): string {
  const secret = process.env.GOOGLE_ADS_CLIENT_SECRET
  if (!secret) {
    throw new Error('GOOGLE_ADS_CLIENT_SECRET environment variable is required')
  }
  return secret
}

/** Get the Google Ads Developer Token from environment */
export function getGoogleAdsDeveloperToken(): string {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is required')
  }
  return token
}

/** Get the Google Ads encryption key from environment */
export function getGoogleAdsEncryptionKey(): string {
  const key = process.env.GOOGLE_ADS_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'GOOGLE_ADS_ENCRYPTION_KEY environment variable must be at least 32 characters'
    )
  }
  return key
}

/** Get the OAuth redirect URI */
export function getGoogleAdsRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_URL or APP_URL environment variable is required')
  }
  return `${baseUrl}/api/admin/integrations/google-ads/callback`
}

/** Get the optional Login Customer ID (MCC account) */
export function getGoogleAdsLoginCustomerId(): string | undefined {
  return process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
}

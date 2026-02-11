/**
 * TikTok Ads OAuth configuration
 *
 * @ai-pattern oauth-config
 * @ai-note TikTok uses Business API v1.3
 */

/** TikTok OAuth endpoints */
export const TIKTOK_OAUTH_CONFIG = {
  /** TikTok OAuth authorization URL */
  authorizationUrl:
    'https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/',

  /** Token exchange URL */
  tokenUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',

  /** Token refresh URL */
  refreshUrl:
    'https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/',

  /** Business API base URL */
  apiUrl: 'https://business-api.tiktok.com/open_api/v1.3',

  /** OAuth scopes for TikTok Ads API access */
  scopes: [
    'advertiser_info',
    'ad_account_info',
    'campaign_info',
    'adgroup_info',
    'ad_info',
    'reporting',
  ].join(','),

  /** Token refresh buffer: 5 minutes before expiry */
  tokenRefreshBuffer: 5 * 60,

  /** TikTok tokens expire in 24 hours */
  tokenExpirySeconds: 24 * 60 * 60,
} as const

/** Get the TikTok App ID from environment */
export function getTikTokAppId(): string {
  const appId = process.env.TIKTOK_APP_ID
  if (!appId) {
    throw new Error('TIKTOK_APP_ID environment variable is required')
  }
  return appId
}

/** Get the TikTok App Secret from environment */
export function getTikTokAppSecret(): string {
  const secret = process.env.TIKTOK_APP_SECRET
  if (!secret) {
    throw new Error('TIKTOK_APP_SECRET environment variable is required')
  }
  return secret
}

/** Get the TikTok encryption key from environment */
export function getTikTokEncryptionKey(): string {
  const key = process.env.TIKTOK_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'TIKTOK_ENCRYPTION_KEY environment variable must be at least 32 characters'
    )
  }
  return key
}

/** Get the OAuth redirect URI */
export function getTikTokRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_URL or APP_URL environment variable is required')
  }
  return `${baseUrl}/api/admin/integrations/tiktok/callback`
}

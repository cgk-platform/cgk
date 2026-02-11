/**
 * Meta Ads OAuth configuration
 *
 * @ai-pattern oauth-config
 * @ai-note Graph API v21.0 (latest stable)
 */

/** Meta OAuth endpoints */
export const META_OAUTH_CONFIG = {
  /** Facebook OAuth authorization URL */
  authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',

  /** Token exchange URL */
  tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',

  /** Long-lived token exchange URL */
  exchangeTokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',

  /** Token debug URL */
  debugTokenUrl: 'https://graph.facebook.com/debug_token',

  /** Graph API base URL */
  graphApiUrl: 'https://graph.facebook.com/v21.0',

  /**
   * Full scope list for Marketing API access
   * Required for CAPI, spend sync, and ad management
   */
  scopes: [
    // Core permissions
    'public_profile',
    'email',

    // Ads management (required for CAPI, spend sync)
    'ads_management',
    'ads_read',

    // Business management
    'business_management',

    // Pages (for branded content, insights)
    'pages_read_engagement',
    'pages_show_list',
    'pages_manage_ads',
    'pages_manage_metadata',

    // Instagram
    'instagram_basic',
    'instagram_manage_insights',
    'instagram_content_publish',

    // Catalog & commerce
    'catalog_management',
  ],

  /** Token type configurations */
  tokenTypes: {
    /** Short-lived token duration: 2 hours */
    SHORT_LIVED: 7200,
    /** Long-lived token duration: 60 days */
    LONG_LIVED: 5184000,
    /** System user tokens never expire */
    SYSTEM_USER: null,
  } as const,

  /** Refresh buffer: 7 days before expiry */
  refreshBuffer: 7 * 24 * 60 * 60,
} as const

/** Get the Meta App ID from environment */
export function getMetaAppId(): string {
  const appId = process.env.META_APP_ID
  if (!appId) {
    throw new Error('META_APP_ID environment variable is required')
  }
  return appId
}

/** Get the Meta App Secret from environment */
export function getMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET
  if (!secret) {
    throw new Error('META_APP_SECRET environment variable is required')
  }
  return secret
}

/** Get the Meta encryption key from environment */
export function getMetaEncryptionKey(): string {
  const key = process.env.META_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'META_ENCRYPTION_KEY environment variable must be at least 32 characters'
    )
  }
  return key
}

/** Get the OAuth redirect URI */
export function getMetaRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.APP_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_URL or APP_URL environment variable is required')
  }
  return `${baseUrl}/api/admin/integrations/meta/callback`
}

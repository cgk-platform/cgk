/**
 * Integration types for OAuth connections
 */

/** Base connection status for all integrations */
export type ConnectionStatus =
  | 'pending_account_selection'
  | 'active'
  | 'needs_reauth'
  | 'disconnected'
  | 'error'

/** OAuth provider types */
export type OAuthProvider = 'meta' | 'google_ads' | 'tiktok'

/** API key provider types */
export type ApiKeyProvider = 'klaviyo'

/** All integration provider types */
export type IntegrationProvider = OAuthProvider | ApiKeyProvider

/** Base OAuth state structure */
export interface OAuthStatePayload {
  tenantId: string
  returnUrl: string
  nonce: string
  timestamp: number
}

/** Signed OAuth state with HMAC */
export interface SignedOAuthState {
  payload: string
  hmac: string
}

/** Base connection interface */
export interface BaseConnection {
  id: string
  tenantId: string
  status: ConnectionStatus
  needsReauth: boolean
  lastError: string | null
  lastSyncAt: Date | null
  connectedAt: Date
  updatedAt: Date
}

/** Meta Ads connection */
export interface MetaAdConnection extends BaseConnection {
  provider: 'meta'
  accessTokenEncrypted: string
  tokenExpiresAt: Date | null
  tokenType: 'short_lived' | 'long_lived' | 'system_user'
  userId: string | null
  selectedAdAccountId: string | null
  selectedAdAccountName: string | null
  scopes: string[]
  metadata: {
    adAccounts?: MetaAdAccount[]
    [key: string]: unknown
  }
}

/** Meta Ad Account info */
export interface MetaAdAccount {
  id: string
  name: string
  accountStatus: number
  currency: string
}

/** Google Ads connection */
export interface GoogleAdsConnection extends BaseConnection {
  provider: 'google_ads'
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  tokenExpiresAt: Date | null
  selectedCustomerId: string | null
  selectedCustomerName: string | null
  customerIds: string[]
  metadata: Record<string, unknown>
}

/** TikTok Ads connection */
export interface TikTokAdConnection extends BaseConnection {
  provider: 'tiktok'
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  tokenExpiresAt: Date | null
  selectedAdvertiserId: string | null
  selectedAdvertiserName: string | null
  advertiserIds: string[]
  pixelId: string | null
  eventsApiToken: string | null
  metadata: Record<string, unknown>
}

/** Klaviyo connection */
export interface KlaviyoConnection {
  id: string
  tenantId: string
  privateApiKeyEncrypted: string
  publicApiKey: string | null
  companyName: string | null
  accountId: string | null
  smsListId: string | null
  emailListId: string | null
  lists: KlaviyoList[]
  isActive: boolean
  lastSyncedAt: Date | null
  connectedAt: Date
  disconnectedAt: Date | null
}

/** Klaviyo list info */
export interface KlaviyoList {
  id: string
  name: string
  type: 'list' | 'segment'
  memberCount?: number
}

/** OAuth flow start result */
export interface OAuthStartResult {
  authUrl: string
  state: string
}

/** OAuth flow complete result for Meta */
export interface MetaOAuthCompleteResult {
  connected: boolean
  adAccounts: MetaAdAccount[]
  returnUrl: string
  requiresAccountSelection: boolean
}

/** OAuth flow complete result for Google Ads */
export interface GoogleAdsOAuthCompleteResult {
  connected: boolean
  customerIds: string[]
  returnUrl: string
  requiresAccountSelection: boolean
}

/** OAuth flow complete result for TikTok */
export interface TikTokOAuthCompleteResult {
  connected: boolean
  advertiserIds: string[]
  returnUrl: string
  requiresAccountSelection: boolean
}

/** Klaviyo connection result */
export interface KlaviyoConnectResult {
  connected: boolean
  companyName: string
  lists: KlaviyoList[]
}

/** Integration connection status for UI */
export interface IntegrationStatus {
  provider: IntegrationProvider
  connected: boolean
  status: ConnectionStatus | 'not_connected'
  accountName: string | null
  tokenExpiresAt: Date | null
  needsReauth: boolean
  lastError: string | null
  lastSyncAt: Date | null
}

/** Token refresh result */
export interface TokenRefreshResult {
  success: boolean
  newExpiresAt?: Date
  error?: string
}

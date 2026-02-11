/**
 * @cgk/integrations - OAuth and API integrations for ad platforms
 *
 * @ai-pattern integrations
 * @ai-required All tokens MUST be encrypted before storage
 * @ai-required All OAuth flows MUST use state parameter validation
 */

// Types
export type {
  ApiKeyProvider,
  BaseConnection,
  ConnectionStatus,
  GoogleAdsConnection,
  GoogleAdsOAuthCompleteResult,
  IntegrationProvider,
  IntegrationStatus,
  KlaviyoConnectResult,
  KlaviyoConnection,
  KlaviyoList,
  MetaAdAccount,
  MetaAdConnection,
  MetaOAuthCompleteResult,
  OAuthProvider,
  OAuthStartResult,
  OAuthStatePayload,
  SignedOAuthState,
  TikTokAdConnection,
  TikTokOAuthCompleteResult,
  TokenRefreshResult,
} from './types.js'

// Encryption utilities
export {
  decryptToken,
  encryptToken,
  generateEncryptionKey,
  isValidEncryptionKey,
} from './encryption.js'

// OAuth state utilities
export {
  createOAuthState,
  generateNonce,
  signStatePayload,
  storeSimpleOAuthState,
  validateOAuthState,
  validateSimpleOAuthState,
  verifyStateSignature,
} from './oauth-state.js'

// Meta Ads
export {
  completeMetaOAuth,
  disconnectMeta,
  getMetaAccessToken,
  getMetaAppId,
  getMetaConnection,
  getMetaRedirectUri,
  META_OAUTH_CONFIG,
  needsMetaTokenRefresh,
  refreshMetaToken,
  selectMetaAdAccount,
  startMetaOAuth,
} from './meta/index.js'

// Google Ads
export {
  completeGoogleAdsOAuth,
  disconnectGoogleAds,
  getGoogleAdsAccessToken,
  getGoogleAdsClientId,
  getGoogleAdsConnection,
  getGoogleAdsRedirectUri,
  GOOGLE_ADS_OAUTH_CONFIG,
  needsGoogleAdsTokenRefresh,
  refreshGoogleAdsToken,
  selectGoogleAdsCustomer,
  startGoogleAdsOAuth,
} from './google-ads/index.js'

// TikTok Ads
export {
  completeTikTokOAuth,
  disconnectTikTok,
  getTikTokAccessToken,
  getTikTokAppId,
  getTikTokConnection,
  getTikTokRedirectUri,
  needsTikTokTokenRefresh,
  refreshTikTokToken,
  selectTikTokAdvertiser,
  startTikTokOAuth,
  TIKTOK_OAUTH_CONFIG,
} from './tiktok/index.js'

// Klaviyo
export {
  connectKlaviyo,
  disconnectKlaviyo,
  getKlaviyoApiKey,
  getKlaviyoConnection,
  isValidKlaviyoApiKey,
  KLAVIYO_CONFIG,
  refreshKlaviyoLists,
  testKlaviyoConnection,
  updateKlaviyoLists,
} from './klaviyo/index.js'

// Status utilities
export {
  getAllIntegrationStatuses,
  getIntegrationStatus,
  hasIntegrationIssues,
} from './status.js'

// Jobs
export {
  refreshExpiringTokensJob,
  TOKEN_REFRESH_SCHEDULE,
} from './jobs/index.js'

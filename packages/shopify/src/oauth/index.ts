/**
 * Shopify OAuth module
 *
 * Provides OAuth flow, token management, and webhook handling
 * for the multi-tenant Shopify app.
 */

// Errors
export { ShopifyError, type ShopifyErrorCode } from './errors.js'

// Encryption
export {
  encryptToken,
  decryptToken,
  generateSecureToken,
} from './encryption.js'

// Scopes
export {
  PLATFORM_SCOPES,
  getScopesString,
  validateScopes,
  type PlatformScope,
} from './scopes.js'

// Types
export type {
  OAuthInitiateParams,
  OAuthCallbackParams,
  OAuthTokenResponse,
  ConnectionStatus,
  ShopifyConnection,
  ShopifyCredentials,
  OAuthStateRecord,
  WebhookRegistration,
  ConnectionHealthCheck,
} from './types.js'

// Validation
export {
  isValidShopDomain,
  validateShopDomain,
  normalizeShopDomain,
  verifyOAuthHmac,
  verifyWebhookHmac,
  isValidOAuthTimestamp,
} from './validation.js'

// OAuth flow
export {
  initiateOAuth,
  getOAuthState,
  deleteOAuthState,
} from './initiate.js'

export {
  handleOAuthCallback,
  disconnectStore,
} from './callback.js'

// Credentials
export {
  getShopifyCredentials,
  isShopifyConnected,
  getShopifyConnection,
  checkConnectionHealth,
  updateLastWebhookAt,
  updateLastSyncAt,
  clearCredentialsCache,
} from './credentials.js'

// Webhooks
export {
  WEBHOOK_TOPICS,
  onWebhook,
  getTenantIdForShop,
  handleWebhook,
  registerWebhooks,
  unregisterWebhooks,
  type WebhookTopic,
  type WebhookHandler,
} from './webhooks.js'

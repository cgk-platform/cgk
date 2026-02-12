/**
 * Customer Portal Authentication
 *
 * OAuth PKCE authentication for Shopify Customer Account API.
 */

export {
  initiateShopifyLogin,
  handleShopifyCallback,
  refreshCustomerToken,
  cleanupExpiredStates,
  getCustomerOAuthConfig,
} from './oauth'

export {
  createCustomerSession,
  getCustomerSession,
  logout,
  cleanupExpiredSessions,
  hasActiveSession,
} from './session'

export {
  requireCustomerAuth,
  getOptionalCustomerAuth,
  requireNoAuth,
  handleSignOut,
  validateTenantMatch,
} from './middleware'

export {
  generatePKCEChallenge,
  generateCodeVerifier,
  generateCodeChallenge,
  generateNonce,
  generateState,
  verifyCodeChallenge,
} from './pkce'

export type {
  CustomerOAuthConfig,
  PKCEChallenge,
  OAuthStateData,
  CustomerTokens,
  CustomerSessionData,
  CustomerFromToken,
  CustomerOAuthScope,
} from './types'

export { CUSTOMER_OAUTH_SCOPES } from './types'

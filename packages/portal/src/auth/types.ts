/**
 * Customer Portal OAuth Types
 */

export interface CustomerOAuthConfig {
  tenantId: string
  shopId: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface PKCEChallenge {
  codeVerifier: string
  codeChallenge: string
}

export interface OAuthStateData {
  tenantId: string
  codeVerifier: string
  redirectAfterLogin: string
  nonce: string
  createdAt: number
}

export interface CustomerTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  idToken?: string
  tokenType: string
}

export interface CustomerSessionData {
  customerId: string
  tenantId: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  customerInfo: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
  }
}

export interface CustomerFromToken {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
}

export const CUSTOMER_OAUTH_SCOPES = [
  'openid',
  'email',
  'customer-account-api:full',
] as const

export type CustomerOAuthScope = (typeof CUSTOMER_OAUTH_SCOPES)[number]

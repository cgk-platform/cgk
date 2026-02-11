/**
 * Shopify OAuth types
 */

/**
 * OAuth initiation parameters
 */
export interface OAuthInitiateParams {
  tenantId: string
  shop: string
  redirectUri: string
}

/**
 * OAuth callback parameters from Shopify
 */
export interface OAuthCallbackParams {
  shop: string
  code: string
  state: string
  hmac: string
  timestamp: string
  host?: string
}

/**
 * OAuth token response from Shopify
 */
export interface OAuthTokenResponse {
  access_token: string
  scope: string
}

/**
 * Shopify connection status
 */
export type ConnectionStatus = 'active' | 'suspended' | 'disconnected'

/**
 * Shopify connection record from database
 */
export interface ShopifyConnection {
  id: string
  tenantId: string
  shop: string
  scopes: string[]
  apiVersion: string
  pixelId: string | null
  pixelActive: boolean
  storefrontApiVersion: string
  siteUrl: string | null
  defaultCountry: string
  defaultLanguage: string
  status: ConnectionStatus
  lastWebhookAt: Date | null
  lastSyncAt: Date | null
  installedAt: Date
  updatedAt: Date
}

/**
 * Decrypted Shopify credentials
 */
export interface ShopifyCredentials {
  shop: string
  accessToken: string
  webhookSecret: string | null
  scopes: string[]
  apiVersion: string
}

/**
 * OAuth state record from database
 */
export interface OAuthStateRecord {
  id: string
  tenantId: string
  shop: string
  state: string
  nonce: string
  redirectUri: string
  expiresAt: Date
  createdAt: Date
}

/**
 * Webhook registration configuration
 */
export interface WebhookRegistration {
  topic: string
  address: string
  format?: 'json' | 'xml'
}

/**
 * Connection health check result
 */
export interface ConnectionHealthCheck {
  isConnected: boolean
  shop: string | null
  status: ConnectionStatus | null
  tokenValid: boolean
  lastWebhookAt: Date | null
  lastSyncAt: Date | null
  scopesValid: boolean
  missingSCopes: string[]
}

/**
 * Types for tenant-managed integration credentials
 */

/** Supported services for generic API credentials */
export type TenantApiService =
  | 'mux'
  | 'assemblyai'
  | 'anthropic'
  | 'openai'
  | 'elevenlabs'
  | 'cloudflare_r2'
  | 'google_maps'
  | 'twilio'
  | 'easypost'

/** Service display names */
export const SERVICE_DISPLAY_NAMES: Record<TenantApiService, string> = {
  mux: 'Mux Video',
  assemblyai: 'AssemblyAI',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  elevenlabs: 'ElevenLabs',
  cloudflare_r2: 'Cloudflare R2',
  google_maps: 'Google Maps',
  twilio: 'Twilio',
  easypost: 'EasyPost Shipping',
}

/** Base interface for all tenant configs */
export interface BaseTenantConfig {
  id: string
  tenantId: string
  isActive: boolean
  lastVerifiedAt: Date | null
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

/** Tenant Stripe configuration */
export interface TenantStripeConfig extends BaseTenantConfig {
  /** Encrypted secret key (sk_live_xxx or sk_test_xxx) */
  secretKeyEncrypted: string
  /** Public publishable key (not encrypted) */
  publishableKey: string | null
  /** Encrypted webhook secret */
  webhookSecretEncrypted: string | null
  /** Stripe account ID (acct_xxx) */
  stripeAccountId: string | null
  /** Account display name */
  accountName: string | null
  /** Two-letter country code */
  accountCountry: string | null
  /** Whether using live mode */
  livemode: boolean
  /** Whether Stripe Connect is enabled */
  connectEnabled: boolean
  /** Connect client ID for this tenant */
  connectClientId: string | null
}

/** Tenant Resend configuration */
export interface TenantResendConfig extends BaseTenantConfig {
  /** Encrypted API key (re_xxx) */
  apiKeyEncrypted: string
  /** Resend team ID */
  resendTeamId: string | null
  /** Account name */
  accountName: string | null
  /** Default from email address */
  defaultFromEmail: string | null
  /** Default from name */
  defaultFromName: string | null
  /** Default reply-to address */
  defaultReplyTo: string | null
  /** List of verified domains */
  verifiedDomains: string[]
}

/** Tenant Wise configuration */
export interface TenantWiseConfig extends BaseTenantConfig {
  /** Encrypted API key */
  apiKeyEncrypted: string
  /** Wise profile ID */
  profileId: string | null
  /** Profile type (business or personal) */
  profileType: 'business' | 'personal' | null
  /** Account holder name */
  accountHolderName: string | null
  /** Source balance ID for payouts */
  sourceBalanceId: string | null
  /** Source currency (default USD) */
  sourceCurrency: string
  /** Encrypted webhook secret */
  webhookSecretEncrypted: string | null
  /** Whether using sandbox mode */
  sandboxMode: boolean
}

/** Generic API credential for various services */
export interface TenantApiCredential extends BaseTenantConfig {
  /** Service identifier */
  serviceName: TenantApiService
  /** Human-readable service name */
  serviceDisplayName: string | null
  /** Encrypted primary API key */
  apiKeyEncrypted: string
  /** Encrypted secondary secret (for services like Mux) */
  apiSecretEncrypted: string | null
  /** Service-specific account ID */
  accountId: string | null
  /** Service-specific metadata */
  metadata: Record<string, unknown>
}

/** Input for creating/updating Stripe config */
export interface TenantStripeConfigInput {
  secretKey: string
  publishableKey?: string
  webhookSecret?: string
  livemode?: boolean
}

/** Input for creating/updating Resend config */
export interface TenantResendConfigInput {
  apiKey: string
  defaultFromEmail?: string
  defaultFromName?: string
  defaultReplyTo?: string
}

/** Input for creating/updating Wise config */
export interface TenantWiseConfigInput {
  apiKey: string
  webhookSecret?: string
  sandboxMode?: boolean
  sourceCurrency?: string
}

/** Input for creating/updating generic API credentials */
export interface TenantApiCredentialInput {
  serviceName: TenantApiService
  apiKey: string
  apiSecret?: string
  metadata?: Record<string, unknown>
}

/** Verification result for any credential */
export interface CredentialVerificationResult {
  valid: boolean
  accountId?: string
  accountName?: string
  metadata?: Record<string, unknown>
  error?: string
}

/** Integration status for admin display */
export interface TenantIntegrationStatus {
  service: string
  displayName: string
  connected: boolean
  lastVerifiedAt: Date | null
  hasError: boolean
  errorMessage: string | null
}

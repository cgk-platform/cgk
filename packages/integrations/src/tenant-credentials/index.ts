/**
 * Tenant-managed integration credentials
 *
 * Handles encrypted storage of tenant-owned API credentials for:
 * - Stripe (payments)
 * - Resend (email)
 * - Wise (international payouts)
 * - Generic APIs (Mux, AssemblyAI, Anthropic, etc.)
 */

// Types
export type {
  BaseTenantConfig,
  CredentialVerificationResult,
  TenantApiCredential,
  TenantApiCredentialInput,
  TenantApiService,
  TenantIntegrationStatus,
  TenantResendConfig,
  TenantResendConfigInput,
  TenantStripeConfig,
  TenantStripeConfigInput,
  TenantWiseConfig,
  TenantWiseConfigInput,
} from './types.js'

export { SERVICE_DISPLAY_NAMES } from './types.js'

// Storage utilities
export {
  // Stripe
  deleteTenantStripeConfig,
  getTenantStripeConfig,
  getTenantStripeSecretKey,
  saveTenantStripeConfig,
  updateStripeConfigVerification,
  // Resend
  deleteTenantResendConfig,
  getTenantResendApiKey,
  getTenantResendConfig,
  saveTenantResendConfig,
  // Wise
  deleteTenantWiseConfig,
  getTenantWiseApiKey,
  getTenantWiseConfig,
  saveTenantWiseConfig,
  // Generic API credentials
  deleteTenantApiCredential,
  getAllTenantApiCredentials,
  getTenantApiCredential,
  getTenantApiKey,
  getTenantApiKeyAndSecret,
  saveTenantApiCredential,
} from './storage.js'

// Service clients
export {
  // Stripe client
  clearAllStripeClientCache,
  clearTenantStripeClientCache,
  getTenantStripeClient,
  hasTenantStripeConfig,
  requireTenantStripeClient,
  verifyTenantStripeCredentials,
  // Resend client
  clearAllResendClientCache,
  clearTenantResendClientCache,
  getTenantResendClient,
  getTenantResendSenderConfig,
  hasTenantResendConfig,
  requireTenantResendClient,
  verifyTenantResendCredentials,
  // Wise client
  clearAllWiseCache,
  clearTenantWiseCache,
  getTenantWiseClient,
  hasTenantWiseConfig,
  requireTenantWiseClient,
  verifyTenantWiseCredentials,
  type CreateQuoteParams,
  type CreateRecipientParams,
  type CreateTransferParams,
  type WiseBalance,
  type WiseClient,
  type WiseFundingResult,
  type WiseProfile,
  type WiseQuote,
  type WiseRecipient,
  type WiseTransfer,
  // Generic service clients
  clearAllServicesCache,
  clearTenantAllServicesCache,
  clearTenantServiceCache,
  getTenantAnthropicClient,
  getTenantAssemblyAIClient,
  getTenantMuxClient,
  getTenantOpenAIClient,
  getTenantEasyPostClient,
  checkEasyPostTrackingStatus,
  hasTenantServiceConfig,
  verifyTenantServiceCredentials,
  type AnthropicClient,
  type AnthropicMessage,
  type AnthropicMessageParams,
  type AssemblyAIClient,
  type AssemblyAITranscribeOptions,
  type AssemblyAITranscript,
  type MuxClient,
  type OpenAIChatCompletion,
  type OpenAIChatParams,
  type OpenAIClient,
  type OpenAIEmbedding,
  type EasyPostClient,
  type EasyPostTracker,
  type EasyPostTrackingStatus,
  type EasyPostTrackingStatusCode,
} from './clients/index.js'

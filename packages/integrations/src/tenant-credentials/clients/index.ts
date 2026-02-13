/**
 * Tenant service clients
 *
 * Export all service-specific clients that use tenant-owned credentials.
 */

// Stripe
export {
  clearAllStripeClientCache,
  clearTenantStripeClientCache,
  getTenantStripeClient,
  hasTenantStripeConfig,
  requireTenantStripeClient,
  verifyTenantStripeCredentials,
} from './stripe.js'

// Resend
export {
  clearAllResendClientCache,
  clearTenantResendClientCache,
  getTenantResendClient,
  getTenantResendSenderConfig,
  hasTenantResendConfig,
  requireTenantResendClient,
  verifyTenantResendCredentials,
} from './resend.js'

// Wise
export {
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
} from './wise.js'

// Generic services (Mux, AssemblyAI, Anthropic, OpenAI)
export {
  clearAllServicesCache,
  clearTenantAllServicesCache,
  clearTenantServiceCache,
  getTenantAnthropicClient,
  getTenantAssemblyAIClient,
  getTenantMuxClient,
  getTenantOpenAIClient,
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
} from './generic.js'

/**
 * Onboarding Module Exports
 *
 * Email onboarding integration for tenant setup.
 *
 * @ai-pattern onboarding
 * @ai-note Step 5 of tenant onboarding
 */

// Types
export type {
  AddDomainInput,
  CompleteEmailSetupInput,
  CompleteEmailSetupResult,
  ConfigureInboundInput,
  ConfigureRoutingInput,
  CreateSenderInput,
  DomainConfigStatus,
  EmailOnboardingState,
  EmailOnboardingSubStep,
  EmailSetupStatus,
  InboundAddressConfig,
  InboundWebhookInfo,
  NotificationRoutingConfig,
  NotificationTypeInfo,
  OnboardingStepStatus,
  RecommendedSenderAddress,
  RecommendedSubdomain,
  ResendApiKeyInfo,
  TestEmailInput,
  TestEmailResult,
  VerifyApiKeyInput,
  VerifyApiKeyResult,
} from './types.js'

export type { InboundRecommendation } from './inbound-setup.js'

export { RECOMMENDED_SENDER_ADDRESSES, RECOMMENDED_SUBDOMAINS } from './types.js'

// API Key Verification
export {
  checkApiKeyPermissions,
  sendTestEmailWithKey,
  verifyResendApiKey,
} from './verify-api-key.js'

// Domain Setup
export {
  addOnboardingDomain,
  getDomainDNSInstructions,
  getDomainsWithStatus,
  getPrimaryDomain,
  getRecommendedSubdomains,
  getVerifiedDomainCount,
  hasVerifiedDomain,
  isValidDomain,
  isValidSubdomain,
  verifyOnboardingDomain,
} from './domain-setup.js'

// Sender Address Setup
export {
  createOnboardingSenderAddress,
  getRecommendedSenders,
  getSenderAddressCount,
  getSendersByPurpose,
  getVerifiedSenderCount,
  hasMinimumSenders,
  hasSenderForPurpose,
  sendTestEmail,
} from './address-setup.js'

// Inbound Email Setup
export {
  configureInboundAddresses,
  createInboundTestInstructions,
  getInboundCapableAddresses,
  getInboundEnabledCount,
  getInboundRecommendations,
  getInboundWebhookUrl,
  hasInboundEnabled,
} from './inbound-setup.js'

// Notification Routing Setup
export {
  autoAssignSenderAddresses,
  configureNotificationRouting,
  getNotificationTypesByCategory,
  getNotificationTypesInfo,
  getRoutingStatus,
  initializeNotificationRouting,
  setAllInCategoryEnabled,
} from './routing-setup.js'

// Completion
export {
  canSendEmails,
  completeEmailSetup,
  getEmailSetupStatus,
  getOnboardingState,
  isEmailSetupComplete,
  resetEmailSetup,
} from './complete.js'

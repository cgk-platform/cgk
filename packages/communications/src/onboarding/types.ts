/**
 * Onboarding Types
 *
 * Types for email onboarding flow.
 *
 * @ai-pattern onboarding
 * @ai-note Email configuration is Step 5 in tenant onboarding
 */

import type { EmailDomain, NotificationType, SenderPurpose } from '../types.js'

// ============================================================================
// Onboarding Step Status
// ============================================================================

/**
 * Status of an onboarding step
 */
export type OnboardingStepStatus = 'pending' | 'in_progress' | 'complete' | 'skipped'

/**
 * Email onboarding sub-step IDs
 */
export type EmailOnboardingSubStep =
  | 'resend_account'
  | 'domain_config'
  | 'sender_addresses'
  | 'inbound_setup'
  | 'notification_routing'

/**
 * Email onboarding state
 */
export interface EmailOnboardingState {
  currentStep: EmailOnboardingSubStep
  completedSteps: EmailOnboardingSubStep[]
  resendApiKeyVerified: boolean
  resendFullAccessKeyVerified: boolean
  domainsConfigured: number
  domainsVerified: number
  senderAddressesCreated: number
  inboundEnabled: boolean
  routingConfigured: boolean
  skipped: boolean
  completedAt: Date | null
}

// ============================================================================
// API Key Verification
// ============================================================================

/**
 * Input for verifying Resend API key
 */
export interface VerifyApiKeyInput {
  apiKey: string
  fullAccessKey?: string
}

/**
 * Result of API key verification
 */
export interface VerifyApiKeyResult {
  valid: boolean
  error?: string
  accountInfo?: {
    name?: string
    email?: string
    createdAt?: string
  }
}

/**
 * Resend API key info from /api-keys endpoint
 */
export interface ResendApiKeyInfo {
  id: string
  name: string
  created_at: string
  permission: 'full_access' | 'sending_access'
}

// ============================================================================
// Domain Configuration
// ============================================================================

/**
 * Input for adding a domain during onboarding
 */
export interface AddDomainInput {
  domain: string
  subdomain?: string | null
}

/**
 * Domain configuration status
 */
export interface DomainConfigStatus extends EmailDomain {
  canVerify: boolean
  nextCheckAt: Date | null
}

/**
 * Recommended subdomain configurations
 */
export interface RecommendedSubdomain {
  prefix: string
  purpose: string
  description: string
}

/**
 * Get recommended subdomains for email setup
 */
export const RECOMMENDED_SUBDOMAINS: RecommendedSubdomain[] = [
  {
    prefix: 'mail',
    purpose: 'Transactional emails',
    description: 'Order confirmations, receipts, review requests',
  },
  {
    prefix: 'help',
    purpose: 'Support emails',
    description: 'Customer support with inbound handling',
  },
]

// ============================================================================
// Sender Address Configuration
// ============================================================================

/**
 * Recommended sender address configuration
 */
export interface RecommendedSenderAddress {
  localPart: string
  displayNameTemplate: string
  purpose: SenderPurpose
  description: string
  isDefault: boolean
  subdomainPreferred?: string
}

/**
 * Get recommended sender addresses for each purpose
 */
export const RECOMMENDED_SENDER_ADDRESSES: RecommendedSenderAddress[] = [
  {
    localPart: 'orders',
    displayNameTemplate: '{brandName} Orders',
    purpose: 'transactional',
    description: 'Order confirmations, receipts, review requests',
    isDefault: true,
    subdomainPreferred: 'mail',
  },
  {
    localPart: 'creators',
    displayNameTemplate: '{brandName} Creator Team',
    purpose: 'creator',
    description: 'Creator onboarding, project updates, payments',
    isDefault: true,
  },
  {
    localPart: 'support',
    displayNameTemplate: '{brandName} Support',
    purpose: 'support',
    description: 'Customer support replies',
    isDefault: true,
    subdomainPreferred: 'help',
  },
  {
    localPart: 'treasury',
    displayNameTemplate: '{brandName} Treasury',
    purpose: 'treasury',
    description: 'Approval requests, payment notifications',
    isDefault: true,
    subdomainPreferred: 'mail',
  },
  {
    localPart: 'noreply',
    displayNameTemplate: '{brandName}',
    purpose: 'system',
    description: 'System notifications, team invitations',
    isDefault: true,
  },
]

/**
 * Input for creating a sender address during onboarding
 */
export interface CreateSenderInput {
  domainId: string
  localPart: string
  displayName: string
  purpose: SenderPurpose
  isDefault?: boolean
  isInboundEnabled?: boolean
  replyToAddress?: string | null
}

/**
 * Test email input
 */
export interface TestEmailInput {
  senderAddressId: string
  recipientEmail: string
}

/**
 * Test email result
 */
export interface TestEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// Inbound Email Configuration
// ============================================================================

/**
 * Inbound email address configuration
 */
export interface InboundAddressConfig {
  senderAddressId: string
  purpose: string
  description: string
  enabled: boolean
}

/**
 * Configure inbound email input
 */
export interface ConfigureInboundInput {
  addresses: InboundAddressConfig[]
}

/**
 * Inbound webhook URL info
 */
export interface InboundWebhookInfo {
  url: string
  secret?: string
}

// ============================================================================
// Notification Routing Configuration
// ============================================================================

/**
 * Notification type routing configuration
 */
export interface NotificationRoutingConfig {
  notificationType: NotificationType
  senderAddressId: string | null
  isEnabled: boolean
}

/**
 * Configure notification routing input
 */
export interface ConfigureRoutingInput {
  routing: NotificationRoutingConfig[]
  applyDefaults?: boolean
}

/**
 * Notification type display info
 */
export interface NotificationTypeInfo {
  type: NotificationType
  label: string
  category: string
  description: string
  defaultPurpose: SenderPurpose
}

// ============================================================================
// Email Setup Completion
// ============================================================================

/**
 * Email setup status stored on tenant
 */
export interface EmailSetupStatus {
  complete: boolean
  completedAt: Date | null
  skippedAt: Date | null
  domainsCount: number
  verifiedDomainsCount: number
  senderAddressesCount: number
  inboundEnabled: boolean
}

/**
 * Complete email setup input
 */
export interface CompleteEmailSetupInput {
  skip?: boolean
}

/**
 * Complete email setup result
 */
export interface CompleteEmailSetupResult {
  success: boolean
  status: EmailSetupStatus
  error?: string
}

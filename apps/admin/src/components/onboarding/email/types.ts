/**
 * Email Onboarding Component Types
 */

import type {
  DomainConfigStatus,
  EmailOnboardingState,
  EmailOnboardingSubStep,
  EmailSetupStatus,
  NotificationTypeInfo,
  SenderAddressWithDomain,
} from '@cgk/communications'

/**
 * Email setup wizard step
 */
export interface EmailSetupStep {
  id: EmailOnboardingSubStep
  title: string
  description: string
  isOptional: boolean
}

/**
 * Email setup wizard props
 */
export interface EmailSetupWizardProps {
  tenantId: string
  primaryDomain: string
  brandName: string
  onComplete: () => void
  onSkip: () => void
}

/**
 * Resend account step props
 */
export interface ResendAccountStepProps {
  onApiKeyVerified: (apiKey: string) => void
  onBack?: () => void
}

/**
 * Domain configuration step props
 */
export interface DomainConfigStepProps {
  primaryDomain: string
  resendApiKey: string
  onDomainsConfigured: (domains: DomainConfigStatus[]) => void
  onBack: () => void
}

/**
 * Sender address step props
 */
export interface SenderAddressStepProps {
  brandName: string
  resendApiKey: string
  verifiedDomains: DomainConfigStatus[]
  onAddressesCreated: (addresses: SenderAddressWithDomain[]) => void
  onBack: () => void
}

/**
 * Inbound email step props
 */
export interface InboundEmailStepProps {
  senderAddresses: SenderAddressWithDomain[]
  onComplete: () => void
  onSkip: () => void
  onBack: () => void
}

/**
 * Notification routing step props
 */
export interface NotificationRoutingStepProps {
  senderAddresses: SenderAddressWithDomain[]
  onComplete: () => void
  onBack: () => void
}

/**
 * Email setup context
 */
export interface EmailSetupContextValue {
  currentStep: EmailOnboardingSubStep
  setCurrentStep: (step: EmailOnboardingSubStep) => void
  resendApiKey: string | null
  setResendApiKey: (key: string) => void
  domains: DomainConfigStatus[]
  setDomains: (domains: DomainConfigStatus[]) => void
  senderAddresses: SenderAddressWithDomain[]
  setSenderAddresses: (addresses: SenderAddressWithDomain[]) => void
  state: EmailOnboardingState | null
  status: EmailSetupStatus | null
  isLoading: boolean
  error: string | null
}

/**
 * DNS record display props
 */
export interface DNSRecordTableProps {
  records: Array<{
    type: string
    host: string
    value: string
    priority?: number
  }>
  onCopyAll?: () => void
}

/**
 * Domain card props
 */
export interface DomainCardProps {
  domain: DomainConfigStatus
  onVerify: (domainId: string) => void
  onViewDNS: (domainId: string) => void
  isVerifying: boolean
}

/**
 * Sender address card props
 */
export interface SenderAddressCardProps {
  address: SenderAddressWithDomain
  onSendTest: (addressId: string, recipientEmail: string) => void
  isSending: boolean
}

/**
 * Notification routing row props
 */
export interface NotificationRoutingRowProps {
  notification: NotificationTypeInfo & {
    isEnabled: boolean
    senderAddressId: string | null
    senderEmail: string | null
  }
  senderAddresses: SenderAddressWithDomain[]
  onUpdate: (
    notificationType: string,
    senderAddressId: string | null,
    isEnabled: boolean
  ) => void
}

/**
 * Email setup complete banner props
 */
export interface EmailSetupBannerProps {
  status: EmailSetupStatus
  onConfigure: () => void
}

/**
 * Email onboarding step configuration
 */
export const EMAIL_SETUP_STEPS: EmailSetupStep[] = [
  {
    id: 'resend_account',
    title: 'Resend Account',
    description: 'Connect your Resend account with an API key',
    isOptional: false,
  },
  {
    id: 'domain_config',
    title: 'Domain Configuration',
    description: 'Add and verify email domains',
    isOptional: false,
  },
  {
    id: 'sender_addresses',
    title: 'Sender Addresses',
    description: 'Create email sender addresses for your brand',
    isOptional: false,
  },
  {
    id: 'inbound_setup',
    title: 'Inbound Email',
    description: 'Configure inbound email handling (optional)',
    isOptional: true,
  },
  {
    id: 'notification_routing',
    title: 'Notification Routing',
    description: 'Configure which emails go through which sender',
    isOptional: false,
  },
]

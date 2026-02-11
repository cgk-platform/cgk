/**
 * Email Onboarding Components
 *
 * Step 5 of tenant onboarding - Email Configuration
 */

export { EmailSetupWizard } from './email-setup-wizard'
export { EmailSetupBanner, EmailSetupBannerAuto } from './email-setup-banner'
export { ResendAccountStep } from './steps/resend-account-step'
export { DomainConfigStep } from './steps/domain-config-step'
export { SenderAddressStep } from './steps/sender-address-step'
export { InboundEmailStep } from './steps/inbound-email-step'
export { NotificationRoutingStep } from './steps/notification-routing-step'

export { EMAIL_SETUP_STEPS } from './types'
export type {
  DNSRecordTableProps,
  DomainCardProps,
  DomainConfigStepProps,
  EmailSetupBannerProps,
  EmailSetupContextValue,
  EmailSetupStep,
  EmailSetupWizardProps,
  InboundEmailStepProps,
  NotificationRoutingRowProps,
  NotificationRoutingStepProps,
  ResendAccountStepProps,
  SenderAddressCardProps,
  SenderAddressStepProps,
} from './types'

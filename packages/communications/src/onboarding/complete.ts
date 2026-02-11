/**
 * Email Setup Completion
 *
 * Marks email setup as complete and updates tenant status.
 *
 * @ai-pattern onboarding
 * @ai-note Final step of email onboarding
 */

import { sql } from '@cgk/db'

import { listDomains } from '../sender/domains.js'
import { listSenderAddresses } from '../sender/addresses.js'
import type {
  CompleteEmailSetupInput,
  CompleteEmailSetupResult,
  EmailOnboardingState,
  EmailOnboardingSubStep,
  EmailSetupStatus,
} from './types.js'

/**
 * Get the current email setup status for a tenant
 */
export async function getEmailSetupStatus(): Promise<EmailSetupStatus> {
  const domains = await listDomains()
  const addresses = await listSenderAddresses()

  const verifiedDomains = domains.filter((d) => d.verificationStatus === 'verified')
  const inboundEnabled = addresses.some((a) => a.isInboundEnabled)

  // Check if setup was marked complete in tenant settings
  const settingsResult = await sql`
    SELECT
      email_setup_complete,
      email_setup_completed_at,
      email_setup_skipped_at
    FROM tenant_settings
    LIMIT 1
  `

  const settings = settingsResult.rows[0] as {
    email_setup_complete?: boolean
    email_setup_completed_at?: string
    email_setup_skipped_at?: string
  } | undefined

  return {
    complete: settings?.email_setup_complete ?? false,
    completedAt: settings?.email_setup_completed_at
      ? new Date(settings.email_setup_completed_at)
      : null,
    skippedAt: settings?.email_setup_skipped_at
      ? new Date(settings.email_setup_skipped_at)
      : null,
    domainsCount: domains.length,
    verifiedDomainsCount: verifiedDomains.length,
    senderAddressesCount: addresses.length,
    inboundEnabled,
  }
}

/**
 * Complete or skip email setup
 */
export async function completeEmailSetup(
  input: CompleteEmailSetupInput
): Promise<CompleteEmailSetupResult> {
  const status = await getEmailSetupStatus()

  // If skipping, mark as skipped
  if (input.skip) {
    await sql`
      INSERT INTO tenant_settings (
        id,
        email_setup_complete,
        email_setup_skipped_at
      ) VALUES (
        gen_random_uuid(),
        false,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email_setup_complete = false,
        email_setup_skipped_at = NOW(),
        updated_at = NOW()
    `

    return {
      success: true,
      status: {
        ...status,
        complete: false,
        skippedAt: new Date(),
      },
    }
  }

  // Validate minimum requirements for completion
  if (status.domainsCount === 0) {
    return {
      success: false,
      status,
      error: 'At least one domain must be configured',
    }
  }

  if (status.senderAddressesCount === 0) {
    return {
      success: false,
      status,
      error: 'At least one sender address must be created',
    }
  }

  // Check for at least one transactional sender
  const addresses = await listSenderAddresses()
  const hasTransactional = addresses.some((a) => a.purpose === 'transactional')
  if (!hasTransactional) {
    return {
      success: false,
      status,
      error: 'At least one transactional sender address is required',
    }
  }

  // Mark setup as complete
  await sql`
    INSERT INTO tenant_settings (
      id,
      email_setup_complete,
      email_setup_completed_at,
      email_setup_skipped_at
    ) VALUES (
      gen_random_uuid(),
      true,
      NOW(),
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      email_setup_complete = true,
      email_setup_completed_at = NOW(),
      email_setup_skipped_at = NULL,
      updated_at = NOW()
  `

  return {
    success: true,
    status: {
      ...status,
      complete: true,
      completedAt: new Date(),
      skippedAt: null,
    },
  }
}

/**
 * Check if email setup is complete (or skipped)
 */
export async function isEmailSetupComplete(): Promise<boolean> {
  const status = await getEmailSetupStatus()
  return status.complete
}

/**
 * Check if email sending is allowed for this tenant
 *
 * Email sending requires:
 * 1. Email setup complete (not skipped)
 * 2. At least one verified domain
 * 3. At least one sender address
 */
export async function canSendEmails(): Promise<{
  allowed: boolean
  reason?: string
}> {
  const status = await getEmailSetupStatus()

  if (!status.complete) {
    if (status.skippedAt) {
      return {
        allowed: false,
        reason: 'Email setup was skipped. Complete setup to enable email sending.',
      }
    }
    return {
      allowed: false,
      reason: 'Email setup not complete.',
    }
  }

  if (status.verifiedDomainsCount === 0) {
    return {
      allowed: false,
      reason: 'No verified email domains. Verify at least one domain.',
    }
  }

  if (status.senderAddressesCount === 0) {
    return {
      allowed: false,
      reason: 'No sender addresses configured.',
    }
  }

  return { allowed: true }
}

/**
 * Get the current onboarding state
 */
export async function getOnboardingState(): Promise<EmailOnboardingState> {
  const status = await getEmailSetupStatus()
  const domains = await listDomains()
  const addresses = await listSenderAddresses()

  // Determine completed steps
  const completedSteps: EmailOnboardingSubStep[] = []
  let currentStep: EmailOnboardingSubStep = 'resend_account'

  // Check if API key is configured (we store it encrypted, so check for domains/addresses)
  const hasResendKey = domains.length > 0 && domains.some((d) => d.resendDomainId)

  if (hasResendKey) {
    completedSteps.push('resend_account')
    currentStep = 'domain_config'
  }

  if (domains.length > 0) {
    completedSteps.push('domain_config')
    currentStep = 'sender_addresses'
  }

  if (addresses.length > 0) {
    completedSteps.push('sender_addresses')
    currentStep = 'inbound_setup'
  }

  const hasInbound = addresses.some((a) => a.isInboundEnabled)
  if (hasInbound || status.complete) {
    completedSteps.push('inbound_setup')
    currentStep = 'notification_routing'
  }

  // Check routing configuration
  const hasRouting = addresses.some((a) => a.purpose === 'transactional')
  if (hasRouting) {
    completedSteps.push('notification_routing')
  }

  return {
    currentStep: status.complete ? 'notification_routing' : currentStep,
    completedSteps,
    resendApiKeyVerified: hasResendKey,
    resendFullAccessKeyVerified: false, // Would need to check separately
    domainsConfigured: domains.length,
    domainsVerified: domains.filter((d) => d.verificationStatus === 'verified').length,
    senderAddressesCreated: addresses.length,
    inboundEnabled: hasInbound,
    routingConfigured: hasRouting,
    skipped: !!status.skippedAt,
    completedAt: status.completedAt,
  }
}

/**
 * Reset email setup (for testing or re-configuration)
 */
export async function resetEmailSetup(): Promise<void> {
  await sql`
    UPDATE tenant_settings
    SET
      email_setup_complete = false,
      email_setup_completed_at = NULL,
      email_setup_skipped_at = NULL,
      updated_at = NOW()
  `
}

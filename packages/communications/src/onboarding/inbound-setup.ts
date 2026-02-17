/**
 * Inbound Email Setup
 *
 * Helpers for configuring inbound email during onboarding.
 *
 * @ai-pattern onboarding
 * @ai-critical All functions require tenantId for database operations
 */

import { listSenderAddresses, updateSenderAddress } from '../sender/addresses.js'
import type { SenderAddressWithDomain } from '../types.js'
import type { InboundAddressConfig, InboundWebhookInfo } from './types.js'

/**
 * Default inbound address configurations by purpose
 */
const DEFAULT_INBOUND_PURPOSES: Record<
  string,
  { purpose: string; description: string }
> = {
  treasury: {
    purpose: 'Treasury Approvals',
    description: 'Approvers can reply to approve/reject treasury requests',
  },
  support: {
    purpose: 'Customer Support',
    description: 'Customers can reply to support emails',
  },
  creator: {
    purpose: 'Creator Communications',
    description: 'Creators can reply to project updates',
  },
}

/**
 * Get inbound webhook URL for the tenant
 */
export function getInboundWebhookUrl(baseUrl: string, _tenantSlug: string): InboundWebhookInfo {
  // The webhook URL that should be configured in Resend
  const webhookUrl = `${baseUrl}/api/webhooks/resend/inbound`

  return {
    url: webhookUrl,
    // Secret would be generated and stored per-tenant
  }
}

/**
 * Get inbound-capable sender addresses
 */
export async function getInboundCapableAddresses(tenantId: string): Promise<
  Array<{
    address: SenderAddressWithDomain
    defaultPurpose: string
    defaultDescription: string
    currentlyEnabled: boolean
  }>
> {
  const addresses = await listSenderAddresses(tenantId)

  // Filter to addresses that make sense for inbound
  const inboundCandidates = addresses.filter(
    (a) => ['treasury', 'support', 'creator'].includes(a.purpose)
  )

  return inboundCandidates.map((address) => {
    const defaults = DEFAULT_INBOUND_PURPOSES[address.purpose]
    return {
      address,
      defaultPurpose: defaults?.purpose ?? address.purpose,
      defaultDescription: defaults?.description ?? 'Receive and process replies',
      currentlyEnabled: address.isInboundEnabled,
    }
  })
}

/**
 * Configure inbound email for addresses
 */
export async function configureInboundAddresses(
  tenantId: string,
  configs: InboundAddressConfig[]
): Promise<{
  success: boolean
  updated: number
  errors: string[]
}> {
  const errors: string[] = []
  let updated = 0

  for (const config of configs) {
    try {
      await updateSenderAddress(tenantId, config.senderAddressId, {
        isInboundEnabled: config.enabled,
      })
      updated++
    } catch (error) {
      errors.push(
        `Failed to update ${config.senderAddressId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  return {
    success: errors.length === 0,
    updated,
    errors,
  }
}

/**
 * Check if any inbound addresses are enabled
 */
export async function hasInboundEnabled(tenantId: string): Promise<boolean> {
  const addresses = await listSenderAddresses(tenantId)
  return addresses.some((a) => a.isInboundEnabled)
}

/**
 * Get count of inbound-enabled addresses
 */
export async function getInboundEnabledCount(tenantId: string): Promise<number> {
  const addresses = await listSenderAddresses(tenantId)
  return addresses.filter((a) => a.isInboundEnabled).length
}

/**
 * Test inbound email configuration
 *
 * Sends a test email that the user can forward to verify inbound works.
 */
export async function createInboundTestInstructions(
  inboundAddress: string,
  _tenantSlug: string
): Promise<{
  testEmail: string
  instructions: string[]
}> {
  return {
    testEmail: inboundAddress,
    instructions: [
      `Send an email to ${inboundAddress} from your personal email`,
      'Wait 1-2 minutes for processing',
      'Check the inbound email logs in the admin dashboard',
      'Verify the email was received and processed correctly',
    ],
  }
}

/**
 * Recommended inbound configurations for each address type
 */
export interface InboundRecommendation {
  purpose: string
  emailPattern: string
  description: string
  isRecommended: boolean
}

/**
 * Get recommended inbound configurations
 */
export function getInboundRecommendations(): InboundRecommendation[] {
  return [
    {
      purpose: 'treasury',
      emailPattern: 'treasury@mail.{domain}',
      description: 'Treasury approval requests - approvers reply to approve/reject',
      isRecommended: true,
    },
    {
      purpose: 'receipts',
      emailPattern: 'receipts@mail.{domain}',
      description: 'Receipt forwarding - team forwards receipts for expense tracking',
      isRecommended: true,
    },
    {
      purpose: 'support',
      emailPattern: 'support@help.{domain}',
      description: 'Customer support - customers can reply to support tickets',
      isRecommended: false,
    },
    {
      purpose: 'creators',
      emailPattern: 'creators@{domain}',
      description: 'Creator replies - creators respond to project updates',
      isRecommended: false,
    },
  ]
}

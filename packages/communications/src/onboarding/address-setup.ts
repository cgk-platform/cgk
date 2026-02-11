/**
 * Sender Address Setup
 *
 * Helpers for creating sender addresses during onboarding.
 *
 * @ai-pattern onboarding
 * @ai-note Step 5c of tenant onboarding
 */

import {
  createSenderAddress,
  getVerifiedSenderAddresses,
  listSenderAddresses,
} from '../sender/addresses.js'
import { listDomains } from '../sender/domains.js'
import type { SenderAddress, SenderAddressWithDomain, SenderPurpose } from '../types.js'
import type {
  CreateSenderInput,
  RecommendedSenderAddress,
  TestEmailResult,
} from './types.js'
import { RECOMMENDED_SENDER_ADDRESSES } from './types.js'

/**
 * Resend API configuration
 */
interface ResendConfig {
  apiKey: string
  baseUrl?: string
}

/**
 * Create a sender address during onboarding
 */
export async function createOnboardingSenderAddress(
  input: CreateSenderInput
): Promise<SenderAddress> {
  return createSenderAddress({
    domainId: input.domainId,
    localPart: input.localPart,
    displayName: input.displayName,
    purpose: input.purpose,
    isDefault: input.isDefault ?? false,
    isInboundEnabled: input.isInboundEnabled ?? false,
    replyToAddress: input.replyToAddress ?? null,
  })
}

/**
 * Get recommended sender addresses for a brand
 *
 * Matches recommended addresses to available domains.
 */
export async function getRecommendedSenders(
  brandName: string
): Promise<Array<{
  recommendation: RecommendedSenderAddress
  suggestedDomainId: string | null
  suggestedEmail: string | null
  suggestedDisplayName: string
}>> {
  const domains = await listDomains()

  return RECOMMENDED_SENDER_ADDRESSES.map((rec) => {
    // Find best domain for this sender
    let suggestedDomain = null

    if (rec.subdomainPreferred) {
      // Look for domain with preferred subdomain
      suggestedDomain = domains.find(
        (d) => d.subdomain === rec.subdomainPreferred
      )
    }

    // Fall back to any verified domain
    if (!suggestedDomain) {
      suggestedDomain = domains.find((d) => d.verificationStatus === 'verified')
    }

    // Fall back to any domain
    if (!suggestedDomain) {
      suggestedDomain = domains[0]
    }

    const fullDomain = suggestedDomain
      ? suggestedDomain.subdomain
        ? `${suggestedDomain.subdomain}.${suggestedDomain.domain}`
        : suggestedDomain.domain
      : null

    return {
      recommendation: rec,
      suggestedDomainId: suggestedDomain?.id ?? null,
      suggestedEmail: fullDomain ? `${rec.localPart}@${fullDomain}` : null,
      suggestedDisplayName: rec.displayNameTemplate.replace('{brandName}', brandName),
    }
  })
}

/**
 * Send a test email from a sender address
 */
export async function sendTestEmail(
  senderAddress: SenderAddressWithDomain,
  recipientEmail: string,
  brandName: string,
  resendConfig: ResendConfig
): Promise<TestEmailResult> {
  if (senderAddress.verificationStatus !== 'verified') {
    return {
      success: false,
      error: 'Cannot send from unverified domain',
    }
  }

  const baseUrl = resendConfig.baseUrl ?? 'https://api.resend.com'

  try {
    const response = await fetch(`${baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `"${senderAddress.displayName}" <${senderAddress.emailAddress}>`,
        to: [recipientEmail],
        subject: `${brandName} - Test Email from ${senderAddress.emailAddress}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Test Email</h1>
            <p>This is a test email from your ${brandName} email configuration.</p>
            <table style="margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">From:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${senderAddress.emailAddress}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Display Name:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${senderAddress.displayName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Purpose:</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${senderAddress.purpose}</td>
              </tr>
            </table>
            <p style="color: #666; font-size: 12px;">
              If you received this email, your sender address is configured correctly.
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      return {
        success: false,
        error: `Failed to send: ${body}`,
      }
    }

    const data = await response.json() as { id: string }
    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email',
    }
  }
}

/**
 * Check if a sender address exists for a purpose
 */
export async function hasSenderForPurpose(purpose: SenderPurpose): Promise<boolean> {
  const addresses = await listSenderAddresses()
  return addresses.some((a) => a.purpose === purpose)
}

/**
 * Get count of sender addresses
 */
export async function getSenderAddressCount(): Promise<number> {
  const addresses = await listSenderAddresses()
  return addresses.length
}

/**
 * Get count of verified sender addresses
 */
export async function getVerifiedSenderCount(): Promise<number> {
  const addresses = await getVerifiedSenderAddresses()
  return addresses.length
}

/**
 * Check if minimum sender addresses are configured
 *
 * At minimum, a transactional sender is required.
 */
export async function hasMinimumSenders(): Promise<boolean> {
  const addresses = await listSenderAddresses()
  return addresses.some((a) => a.purpose === 'transactional')
}

/**
 * Get senders grouped by purpose
 */
export async function getSendersByPurpose(): Promise<
  Record<SenderPurpose, SenderAddressWithDomain[]>
> {
  const addresses = await listSenderAddresses()

  const result: Record<SenderPurpose, SenderAddressWithDomain[]> = {
    transactional: [],
    creator: [],
    support: [],
    treasury: [],
    system: [],
  }

  for (const address of addresses) {
    result[address.purpose].push(address)
  }

  return result
}

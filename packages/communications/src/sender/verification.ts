/**
 * Domain Verification
 *
 * Handles domain verification via Resend API.
 * Includes rate limiting to prevent excessive API calls.
 *
 * @ai-pattern resend-integration
 * @ai-note This module wraps Resend API for domain verification
 */

import type { DNSRecords, EmailDomain, VerificationStatus } from '../types.js'
import {
  getDomainById,
  getFullDomainString,
  updateDomainDNSRecords,
  updateDomainLastCheck,
  updateDomainVerificationStatus,
} from './domains.js'

/**
 * Minimum time between verification checks (5 minutes)
 */
const VERIFICATION_RATE_LIMIT_MS = 5 * 60 * 1000

/**
 * Resend API configuration
 */
interface ResendConfig {
  apiKey: string
  baseUrl?: string
}

/**
 * Resend domain response
 */
interface ResendDomainResponse {
  id: string
  name: string
  status: 'pending' | 'verified' | 'failed'
  records: Array<{
    type: 'MX' | 'TXT' | 'CNAME'
    name: string
    value: string
    priority?: number
    ttl?: number
  }>
  region?: string
  created_at: string
}

/**
 * Result of a verification attempt
 */
export interface VerificationResult {
  success: boolean
  status: VerificationStatus
  dnsRecords?: DNSRecords
  error?: string
  rateLimited?: boolean
  nextCheckAllowedAt?: Date
}

/**
 * Check if a domain can be verified (rate limit check)
 */
export function canVerifyDomain(domain: EmailDomain): boolean {
  if (!domain.lastCheckAt) {
    return true
  }

  const timeSinceLastCheck = Date.now() - domain.lastCheckAt.getTime()
  return timeSinceLastCheck >= VERIFICATION_RATE_LIMIT_MS
}

/**
 * Get when the next verification check is allowed
 */
export function getNextCheckAllowedAt(domain: EmailDomain): Date | null {
  if (!domain.lastCheckAt) {
    return null
  }

  return new Date(domain.lastCheckAt.getTime() + VERIFICATION_RATE_LIMIT_MS)
}

/**
 * Register a domain with Resend API
 *
 * This creates the domain in Resend and returns the DNS records needed.
 */
export async function registerDomainWithResend(
  domain: EmailDomain,
  config: ResendConfig
): Promise<VerificationResult> {
  const fullDomain = getFullDomainString(domain)
  const baseUrl = config.baseUrl ?? 'https://api.resend.com'

  try {
    const response = await fetch(`${baseUrl}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fullDomain,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return {
        success: false,
        status: 'failed',
        error: `Resend API error: ${response.status} - ${errorBody}`,
      }
    }

    const resendDomain = (await response.json()) as ResendDomainResponse

    // Convert Resend records to our format
    const dnsRecords = convertResendRecords(resendDomain.records)

    // Update domain with Resend ID and DNS records
    await updateDomainDNSRecords(domain.id, dnsRecords, resendDomain.id)

    return {
      success: true,
      status: mapResendStatus(resendDomain.status),
      dnsRecords,
    }
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to register domain with Resend',
    }
  }
}

/**
 * Verify a domain's DNS records with Resend API
 */
export async function verifyDomainWithResend(
  domainId: string,
  config: ResendConfig
): Promise<VerificationResult> {
  // Get the domain
  const domain = await getDomainById(domainId)
  if (!domain) {
    return {
      success: false,
      status: 'failed',
      error: 'Domain not found',
    }
  }

  // Check rate limit
  if (!canVerifyDomain(domain)) {
    const nextCheck = getNextCheckAllowedAt(domain)
    return {
      success: false,
      status: domain.verificationStatus,
      rateLimited: true,
      nextCheckAllowedAt: nextCheck ?? undefined,
      error: `Rate limited. Next check allowed at ${nextCheck?.toISOString()}`,
    }
  }

  // If no Resend domain ID, register first
  if (!domain.resendDomainId) {
    const registerResult = await registerDomainWithResend(domain, config)
    if (!registerResult.success) {
      return registerResult
    }

    // Update the domain reference
    const updatedDomain = await getDomainById(domainId)
    if (!updatedDomain || !updatedDomain.resendDomainId) {
      return {
        success: false,
        status: 'failed',
        error: 'Failed to get updated domain after registration',
      }
    }

    // Continue with verification using the new Resend ID
    domain.resendDomainId = updatedDomain.resendDomainId
  }

  const baseUrl = config.baseUrl ?? 'https://api.resend.com'

  try {
    // Trigger verification check
    const verifyResponse = await fetch(
      `${baseUrl}/domains/${domain.resendDomainId}/verify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      }
    )

    // Update last check time regardless of result
    await updateDomainLastCheck(domain.id)

    if (!verifyResponse.ok) {
      const errorBody = await verifyResponse.text()

      // Check if domain is already verified (some APIs return error for this)
      if (verifyResponse.status === 400 && errorBody.includes('already verified')) {
        await updateDomainVerificationStatus(domain.id, 'verified')
        return {
          success: true,
          status: 'verified',
        }
      }

      return {
        success: false,
        status: 'pending',
        error: `Verification check failed: ${verifyResponse.status} - ${errorBody}`,
      }
    }

    // Get updated domain status from Resend
    const statusResponse = await fetch(
      `${baseUrl}/domains/${domain.resendDomainId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      }
    )

    if (!statusResponse.ok) {
      return {
        success: false,
        status: 'pending',
        error: 'Failed to get domain status after verification check',
      }
    }

    const resendDomain = (await statusResponse.json()) as ResendDomainResponse
    const newStatus = mapResendStatus(resendDomain.status)

    // Update our database with new status
    await updateDomainVerificationStatus(domain.id, newStatus)

    return {
      success: newStatus === 'verified',
      status: newStatus,
      dnsRecords: convertResendRecords(resendDomain.records),
    }
  } catch (error) {
    await updateDomainLastCheck(domain.id)
    return {
      success: false,
      status: 'pending',
      error: error instanceof Error ? error.message : 'Verification check failed',
    }
  }
}

/**
 * Get domain status from Resend API
 */
export async function getDomainStatusFromResend(
  domainId: string,
  config: ResendConfig
): Promise<VerificationResult> {
  const domain = await getDomainById(domainId)
  if (!domain || !domain.resendDomainId) {
    return {
      success: false,
      status: 'pending',
      error: 'Domain not registered with Resend',
    }
  }

  const baseUrl = config.baseUrl ?? 'https://api.resend.com'

  try {
    const response = await fetch(
      `${baseUrl}/domains/${domain.resendDomainId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      return {
        success: false,
        status: domain.verificationStatus,
        error: `Failed to get domain status: ${response.status}`,
      }
    }

    const resendDomain = (await response.json()) as ResendDomainResponse

    return {
      success: true,
      status: mapResendStatus(resendDomain.status),
      dnsRecords: convertResendRecords(resendDomain.records),
    }
  } catch (error) {
    return {
      success: false,
      status: domain.verificationStatus,
      error: error instanceof Error ? error.message : 'Failed to check domain status',
    }
  }
}

/**
 * Delete a domain from Resend API
 */
export async function deleteDomainFromResend(
  resendDomainId: string,
  config: ResendConfig
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = config.baseUrl ?? 'https://api.resend.com'

  try {
    const response = await fetch(`${baseUrl}/domains/${resendDomainId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    })

    if (!response.ok && response.status !== 404) {
      const errorBody = await response.text()
      return {
        success: false,
        error: `Failed to delete domain from Resend: ${response.status} - ${errorBody}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete domain from Resend',
    }
  }
}

/**
 * Convert Resend API status to our VerificationStatus
 */
function mapResendStatus(
  resendStatus: 'pending' | 'verified' | 'failed'
): VerificationStatus {
  switch (resendStatus) {
    case 'verified':
      return 'verified'
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

/**
 * Convert Resend records format to our DNSRecords format
 */
function convertResendRecords(
  records: ResendDomainResponse['records']
): DNSRecords {
  const dnsRecords: DNSRecords = {}

  for (const record of records) {
    const dnsRecord = {
      type: record.type,
      host: record.name,
      value: record.value,
      priority: record.priority,
      ttl: record.ttl ?? 3600,
    }

    if (record.type === 'MX') {
      dnsRecords.mx = dnsRecord
    } else if (record.type === 'TXT') {
      if (record.name.includes('_dmarc')) {
        dnsRecords.txt_dmarc = dnsRecord
      } else {
        dnsRecords.txt_spf = dnsRecord
      }
    } else if (record.type === 'CNAME') {
      dnsRecords.cname_dkim = dnsRecord
    }
  }

  return dnsRecords
}

/**
 * Get Resend configuration from environment
 */
export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    baseUrl: process.env.RESEND_API_URL ?? 'https://api.resend.com',
  }
}

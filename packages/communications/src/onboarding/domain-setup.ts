/**
 * Domain Setup
 *
 * Helpers for domain configuration during onboarding.
 *
 * @ai-pattern onboarding
 * @ai-critical All functions require tenantId for database operations
 */

import {
  createDomain,
  getDomainById,
  listDomains,
} from '../sender/domains.js'
import { generateDNSInstructions } from '../sender/dns-instructions.js'
import {
  canVerifyDomain,
  getNextCheckAllowedAt,
  registerDomainWithResend,
  verifyDomainWithResend,
} from '../sender/verification.js'
import type { DNSInstructions } from '../sender/dns-instructions.js'
import type { EmailDomain } from '../types.js'
import type { AddDomainInput, DomainConfigStatus, RecommendedSubdomain } from './types.js'
import { RECOMMENDED_SUBDOMAINS } from './types.js'

/**
 * Resend API configuration for domain operations
 */
interface ResendConfig {
  apiKey: string
  baseUrl?: string
}

/**
 * Add a domain during onboarding
 *
 * Creates the domain record and registers with Resend if API key provided.
 */
export async function addOnboardingDomain(
  tenantId: string,
  input: AddDomainInput,
  resendConfig?: ResendConfig
): Promise<{
  domain: EmailDomain
  dnsInstructions?: DNSInstructions
  warning?: string
}> {
  // Create domain in database
  const domain = await createDomain(tenantId, {
    domain: input.domain.toLowerCase(),
    subdomain: input.subdomain?.toLowerCase() ?? null,
  })

  // If no Resend config, return domain without DNS records
  if (!resendConfig) {
    return {
      domain,
      warning: 'Resend API key not configured. DNS records will be available after key is set up.',
    }
  }

  // Register with Resend to get DNS records
  const result = await registerDomainWithResend(tenantId, domain, resendConfig)

  if (!result.success) {
    return {
      domain,
      warning: `Domain created but Resend registration failed: ${result.error}`,
    }
  }

  // Get updated domain with DNS records
  const updatedDomain = await getDomainById(tenantId, domain.id)

  // Generate DNS instructions
  const dnsInstructions = updatedDomain
    ? generateDNSInstructions(updatedDomain)
    : undefined

  return {
    domain: updatedDomain ?? domain,
    dnsInstructions,
  }
}

/**
 * Get all domains with their configuration status
 */
export async function getDomainsWithStatus(tenantId: string): Promise<DomainConfigStatus[]> {
  const domains = await listDomains(tenantId)

  return domains.map((domain) => ({
    ...domain,
    canVerify: canVerifyDomain(domain),
    nextCheckAt: getNextCheckAllowedAt(domain),
  }))
}

/**
 * Verify a domain during onboarding
 */
export async function verifyOnboardingDomain(
  tenantId: string,
  domainId: string,
  resendConfig: ResendConfig
): Promise<{
  success: boolean
  domain?: DomainConfigStatus
  error?: string
  rateLimited?: boolean
  nextCheckAt?: Date
}> {
  const result = await verifyDomainWithResend(tenantId, domainId, resendConfig)

  if (result.rateLimited) {
    return {
      success: false,
      rateLimited: true,
      nextCheckAt: result.nextCheckAllowedAt,
      error: 'Please wait before checking again',
    }
  }

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  // Get updated domain
  const domain = await getDomainById(tenantId, domainId)
  if (!domain) {
    return {
      success: false,
      error: 'Domain not found after verification',
    }
  }

  return {
    success: result.status === 'verified',
    domain: {
      ...domain,
      canVerify: canVerifyDomain(domain),
      nextCheckAt: getNextCheckAllowedAt(domain),
    },
  }
}

/**
 * Get recommended subdomains for a primary domain
 */
export function getRecommendedSubdomains(primaryDomain: string): Array<{
  subdomain: RecommendedSubdomain
  fullDomain: string
}> {
  return RECOMMENDED_SUBDOMAINS.map((subdomain) => ({
    subdomain,
    fullDomain: `${subdomain.prefix}.${primaryDomain}`,
  }))
}

/**
 * Get DNS instructions for a domain
 */
export async function getDomainDNSInstructions(
  tenantId: string,
  domainId: string
): Promise<DNSInstructions | null> {
  const domain = await getDomainById(tenantId, domainId)
  if (!domain || !domain.dnsRecords) {
    return null
  }

  return generateDNSInstructions(domain)
}

/**
 * Check if any domain is verified for a tenant
 */
export async function hasVerifiedDomain(tenantId: string): Promise<boolean> {
  const domains = await listDomains(tenantId)
  return domains.some((d) => d.verificationStatus === 'verified')
}

/**
 * Get count of verified domains
 */
export async function getVerifiedDomainCount(tenantId: string): Promise<number> {
  const domains = await listDomains(tenantId)
  return domains.filter((d) => d.verificationStatus === 'verified').length
}

/**
 * Get primary domain (first domain added, or first verified)
 */
export async function getPrimaryDomain(tenantId: string): Promise<EmailDomain | null> {
  const domains = await listDomains(tenantId)

  // Prefer verified domains
  const verified = domains.filter((d) => d.verificationStatus === 'verified')
  if (verified.length > 0) {
    // Return the first verified domain without subdomain, or first verified
    const rootDomain = verified.find((d) => !d.subdomain)
    return rootDomain ?? verified[0]!
  }

  // Return first domain without subdomain, or first domain
  const rootDomain = domains.find((d) => !d.subdomain)
  return rootDomain ?? domains[0] ?? null
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i
  return domainRegex.test(domain)
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i
  return subdomainRegex.test(subdomain)
}

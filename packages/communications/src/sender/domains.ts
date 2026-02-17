/**
 * Domain Management
 *
 * CRUD operations for email domains.
 * All operations are tenant-isolated via withTenant() wrapper.
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All functions require tenantId and use withTenant() for DB queries
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreateDomainInput,
  DNSRecords,
  EmailDomain,
  VerificationStatus,
} from '../types.js'

/**
 * Map database row to EmailDomain
 */
function mapRowToDomain(row: Record<string, unknown>): EmailDomain {
  return {
    id: row.id as string,
    domain: row.domain as string,
    subdomain: row.subdomain as string | null,
    verificationStatus: row.verification_status as VerificationStatus,
    verificationToken: row.verification_token as string | null,
    resendDomainId: row.resend_domain_id as string | null,
    dnsRecords: row.dns_records as DNSRecords | null,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
    lastCheckAt: row.last_check_at ? new Date(row.last_check_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * List all email domains for the tenant
 */
export async function listDomains(tenantId: string): Promise<EmailDomain[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, domain, subdomain, verification_status,
        verification_token, resend_domain_id, dns_records,
        verified_at, last_check_at, created_at, updated_at
      FROM tenant_email_domains
      ORDER BY created_at DESC
    `

    return result.rows.map(mapRowToDomain)
  })
}

/**
 * Get a domain by ID
 */
export async function getDomainById(tenantId: string, id: string): Promise<EmailDomain | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, domain, subdomain, verification_status,
        verification_token, resend_domain_id, dns_records,
        verified_at, last_check_at, created_at, updated_at
      FROM tenant_email_domains
      WHERE id = ${id}
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToDomain(row as Record<string, unknown>)
  })
}

/**
 * Get domains by verification status
 */
export async function getDomainsByStatus(
  tenantId: string,
  status: VerificationStatus
): Promise<EmailDomain[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        id, domain, subdomain, verification_status,
        verification_token, resend_domain_id, dns_records,
        verified_at, last_check_at, created_at, updated_at
      FROM tenant_email_domains
      WHERE verification_status = ${status}
      ORDER BY created_at DESC
    `

    return result.rows.map(mapRowToDomain)
  })
}

/**
 * Get verified domains only
 */
export async function getVerifiedDomains(tenantId: string): Promise<EmailDomain[]> {
  return getDomainsByStatus(tenantId, 'verified')
}

/**
 * Check if a domain+subdomain combination exists
 */
export async function domainExists(
  tenantId: string,
  domain: string,
  subdomain: string | null
): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT 1 FROM tenant_email_domains
      WHERE domain = ${domain}
      AND (subdomain = ${subdomain} OR (subdomain IS NULL AND ${subdomain} IS NULL))
    `

    return result.rows.length > 0
  })
}

/**
 * Create a new email domain
 */
export async function createDomain(
  tenantId: string,
  input: CreateDomainInput
): Promise<EmailDomain> {
  // Check for duplicates
  const exists = await domainExists(tenantId, input.domain, input.subdomain ?? null)
  if (exists) {
    throw new Error(
      `Domain ${input.subdomain ? `${input.subdomain}.` : ''}${input.domain} already exists`
    )
  }

  // Generate verification token
  const verificationToken = generateVerificationToken()

  return withTenant(tenantId, async () => {
    const result = await sql`
      INSERT INTO tenant_email_domains (
        domain, subdomain, verification_status, verification_token
      ) VALUES (
        ${input.domain},
        ${input.subdomain ?? null},
        'pending',
        ${verificationToken}
      )
      RETURNING
        id, domain, subdomain, verification_status,
        verification_token, resend_domain_id, dns_records,
        verified_at, last_check_at, created_at, updated_at
    `

    return mapRowToDomain(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Update domain DNS records (called after Resend API returns records)
 */
export async function updateDomainDNSRecords(
  tenantId: string,
  id: string,
  dnsRecords: DNSRecords,
  resendDomainId: string
): Promise<EmailDomain | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE tenant_email_domains
      SET
        dns_records = ${JSON.stringify(dnsRecords)}::jsonb,
        resend_domain_id = ${resendDomainId},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id, domain, subdomain, verification_status,
        verification_token, resend_domain_id, dns_records,
        verified_at, last_check_at, created_at, updated_at
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToDomain(row as Record<string, unknown>)
  })
}

/**
 * Update domain verification status
 */
export async function updateDomainVerificationStatus(
  tenantId: string,
  id: string,
  status: VerificationStatus
): Promise<EmailDomain | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE tenant_email_domains
      SET
        verification_status = ${status},
        last_check_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id, domain, subdomain, verification_status,
        verification_token, resend_domain_id, dns_records,
        verified_at, last_check_at, created_at, updated_at
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToDomain(row as Record<string, unknown>)
  })
}

/**
 * Update last verification check time
 */
export async function updateDomainLastCheck(tenantId: string, id: string): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE tenant_email_domains
      SET last_check_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `
  })
}

/**
 * Delete a domain (will cascade to sender addresses)
 */
export async function deleteDomain(tenantId: string, id: string): Promise<boolean> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      DELETE FROM tenant_email_domains
      WHERE id = ${id}
      RETURNING id
    `

    return result.rows.length > 0
  })
}

/**
 * Get full domain string (with subdomain if present)
 */
export function getFullDomainString(domain: EmailDomain): string {
  if (domain.subdomain) {
    return `${domain.subdomain}.${domain.domain}`
  }
  return domain.domain
}

/**
 * Generate a verification token
 */
function generateVerificationToken(): string {
  // Generate a random 32-character hex string
  const chars = '0123456789abcdef'
  let token = 'cgk_verify_'
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

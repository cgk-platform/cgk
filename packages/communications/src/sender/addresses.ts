/**
 * Sender Address Management
 *
 * CRUD operations for sender email addresses.
 * All operations are tenant-isolated via the calling context.
 *
 * @ai-pattern tenant-isolation
 * @ai-required Use withTenant() wrapper when calling these functions
 */

import { sql } from '@cgk/db'

import type {
  CreateSenderAddressInput,
  SenderAddress,
  SenderAddressWithDomain,
  SenderPurpose,
  UpdateSenderAddressInput,
  VerificationStatus,
} from '../types.js'

/**
 * Map database row to SenderAddress
 */
function mapRowToAddress(row: Record<string, unknown>): SenderAddress {
  return {
    id: row.id as string,
    domainId: row.domain_id as string,
    emailAddress: row.email_address as string,
    displayName: row.display_name as string,
    purpose: row.purpose as SenderPurpose,
    isDefault: row.is_default as boolean,
    isInboundEnabled: row.is_inbound_enabled as boolean,
    replyToAddress: row.reply_to_address as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Map database row to SenderAddressWithDomain
 */
function mapRowToAddressWithDomain(
  row: Record<string, unknown>
): SenderAddressWithDomain {
  return {
    ...mapRowToAddress(row),
    domain: row.domain as string,
    subdomain: row.subdomain as string | null,
    verificationStatus: row.verification_status as VerificationStatus,
  }
}

/**
 * List all sender addresses for the tenant
 */
export async function listSenderAddresses(): Promise<SenderAddressWithDomain[]> {
  const result = await sql`
    SELECT
      sa.id, sa.domain_id, sa.email_address, sa.display_name,
      sa.purpose, sa.is_default, sa.is_inbound_enabled,
      sa.reply_to_address, sa.created_at, sa.updated_at,
      d.domain, d.subdomain, d.verification_status
    FROM tenant_sender_addresses sa
    JOIN tenant_email_domains d ON d.id = sa.domain_id
    ORDER BY sa.created_at DESC
  `

  return result.rows.map((row) => mapRowToAddressWithDomain(row as Record<string, unknown>))
}

/**
 * List sender addresses for a specific domain
 */
export async function listSenderAddressesByDomain(
  domainId: string
): Promise<SenderAddress[]> {
  const result = await sql`
    SELECT
      id, domain_id, email_address, display_name,
      purpose, is_default, is_inbound_enabled,
      reply_to_address, created_at, updated_at
    FROM tenant_sender_addresses
    WHERE domain_id = ${domainId}
    ORDER BY created_at DESC
  `

  return result.rows.map((row) => mapRowToAddress(row as Record<string, unknown>))
}

/**
 * Get a sender address by ID
 */
export async function getSenderAddressById(
  id: string
): Promise<SenderAddressWithDomain | null> {
  const result = await sql`
    SELECT
      sa.id, sa.domain_id, sa.email_address, sa.display_name,
      sa.purpose, sa.is_default, sa.is_inbound_enabled,
      sa.reply_to_address, sa.created_at, sa.updated_at,
      d.domain, d.subdomain, d.verification_status
    FROM tenant_sender_addresses sa
    JOIN tenant_email_domains d ON d.id = sa.domain_id
    WHERE sa.id = ${id}
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToAddressWithDomain(row as Record<string, unknown>)
}

/**
 * Get sender addresses by purpose
 */
export async function getSenderAddressesByPurpose(
  purpose: SenderPurpose
): Promise<SenderAddressWithDomain[]> {
  const result = await sql`
    SELECT
      sa.id, sa.domain_id, sa.email_address, sa.display_name,
      sa.purpose, sa.is_default, sa.is_inbound_enabled,
      sa.reply_to_address, sa.created_at, sa.updated_at,
      d.domain, d.subdomain, d.verification_status
    FROM tenant_sender_addresses sa
    JOIN tenant_email_domains d ON d.id = sa.domain_id
    WHERE sa.purpose = ${purpose}
    ORDER BY sa.is_default DESC, sa.created_at ASC
  `

  return result.rows.map((row) => mapRowToAddressWithDomain(row as Record<string, unknown>))
}

/**
 * Get the default sender address for a purpose
 */
export async function getDefaultSenderForPurpose(
  purpose: SenderPurpose
): Promise<SenderAddressWithDomain | null> {
  const result = await sql`
    SELECT
      sa.id, sa.domain_id, sa.email_address, sa.display_name,
      sa.purpose, sa.is_default, sa.is_inbound_enabled,
      sa.reply_to_address, sa.created_at, sa.updated_at,
      d.domain, d.subdomain, d.verification_status
    FROM tenant_sender_addresses sa
    JOIN tenant_email_domains d ON d.id = sa.domain_id
    WHERE sa.purpose = ${purpose}
    AND d.verification_status = 'verified'
    ORDER BY sa.is_default DESC, sa.created_at ASC
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToAddressWithDomain(row as Record<string, unknown>)
}

/**
 * Get the default sender address (any purpose)
 */
export async function getDefaultSender(): Promise<SenderAddressWithDomain | null> {
  const result = await sql`
    SELECT
      sa.id, sa.domain_id, sa.email_address, sa.display_name,
      sa.purpose, sa.is_default, sa.is_inbound_enabled,
      sa.reply_to_address, sa.created_at, sa.updated_at,
      d.domain, d.subdomain, d.verification_status
    FROM tenant_sender_addresses sa
    JOIN tenant_email_domains d ON d.id = sa.domain_id
    WHERE d.verification_status = 'verified'
    ORDER BY sa.is_default DESC, sa.created_at ASC
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToAddressWithDomain(row as Record<string, unknown>)
}

/**
 * Check if an email address already exists
 */
export async function emailAddressExists(emailAddress: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM tenant_sender_addresses
    WHERE email_address = ${emailAddress}
  `

  return result.rows.length > 0
}

/**
 * Create a sender address
 */
export async function createSenderAddress(
  input: CreateSenderAddressInput
): Promise<SenderAddress> {
  // Get the domain to build the email address
  const domainResult = await sql`
    SELECT domain, subdomain FROM tenant_email_domains
    WHERE id = ${input.domainId}
  `

  if (domainResult.rows.length === 0) {
    throw new Error(`Domain not found: ${input.domainId}`)
  }

  const domain = domainResult.rows[0] as { domain: string; subdomain: string | null }
  const fullDomain = domain.subdomain
    ? `${domain.subdomain}.${domain.domain}`
    : domain.domain
  const emailAddress = `${input.localPart}@${fullDomain}`

  // Check for duplicates
  const exists = await emailAddressExists(emailAddress)
  if (exists) {
    throw new Error(`Email address already exists: ${emailAddress}`)
  }

  // If this is set as default, unset other defaults for this purpose
  if (input.isDefault) {
    await sql`
      UPDATE tenant_sender_addresses
      SET is_default = false, updated_at = NOW()
      WHERE purpose = ${input.purpose}
      AND is_default = true
    `
  }

  const result = await sql`
    INSERT INTO tenant_sender_addresses (
      domain_id, email_address, display_name, purpose,
      is_default, is_inbound_enabled, reply_to_address
    ) VALUES (
      ${input.domainId},
      ${emailAddress},
      ${input.displayName},
      ${input.purpose},
      ${input.isDefault ?? false},
      ${input.isInboundEnabled ?? false},
      ${input.replyToAddress ?? null}
    )
    RETURNING
      id, domain_id, email_address, display_name,
      purpose, is_default, is_inbound_enabled,
      reply_to_address, created_at, updated_at
  `

  return mapRowToAddress(result.rows[0] as Record<string, unknown>)
}

/**
 * Update a sender address
 */
export async function updateSenderAddress(
  id: string,
  input: UpdateSenderAddressInput
): Promise<SenderAddress | null> {
  // Get current address to check purpose if setting default
  const current = await getSenderAddressById(id)
  if (!current) {
    return null
  }

  // If setting as default, unset other defaults for this purpose
  if (input.isDefault && !current.isDefault) {
    const purpose = input.purpose ?? current.purpose
    await sql`
      UPDATE tenant_sender_addresses
      SET is_default = false, updated_at = NOW()
      WHERE purpose = ${purpose}
      AND is_default = true
      AND id != ${id}
    `
  }

  const result = await sql`
    UPDATE tenant_sender_addresses
    SET
      display_name = COALESCE(${input.displayName ?? null}, display_name),
      purpose = COALESCE(${input.purpose ?? null}, purpose),
      is_default = COALESCE(${input.isDefault ?? null}, is_default),
      is_inbound_enabled = COALESCE(${input.isInboundEnabled ?? null}, is_inbound_enabled),
      reply_to_address = CASE
        WHEN ${input.replyToAddress !== undefined} THEN ${input.replyToAddress ?? null}
        ELSE reply_to_address
      END,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id, domain_id, email_address, display_name,
      purpose, is_default, is_inbound_enabled,
      reply_to_address, created_at, updated_at
  `

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return mapRowToAddress(row as Record<string, unknown>)
}

/**
 * Delete a sender address
 */
export async function deleteSenderAddress(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM tenant_sender_addresses
    WHERE id = ${id}
    RETURNING id
  `

  return result.rows.length > 0
}

/**
 * Format sender address for email From header
 * Returns: "Display Name <email@domain.com>"
 */
export function formatSenderAddress(address: SenderAddress): string {
  // Escape quotes in display name
  const escapedName = address.displayName.replace(/"/g, '\\"')
  return `"${escapedName}" <${address.emailAddress}>`
}

/**
 * Get all verified sender addresses
 */
export async function getVerifiedSenderAddresses(): Promise<SenderAddressWithDomain[]> {
  const result = await sql`
    SELECT
      sa.id, sa.domain_id, sa.email_address, sa.display_name,
      sa.purpose, sa.is_default, sa.is_inbound_enabled,
      sa.reply_to_address, sa.created_at, sa.updated_at,
      d.domain, d.subdomain, d.verification_status
    FROM tenant_sender_addresses sa
    JOIN tenant_email_domains d ON d.id = sa.domain_id
    WHERE d.verification_status = 'verified'
    ORDER BY sa.is_default DESC, sa.created_at ASC
  `

  return result.rows.map((row) => mapRowToAddressWithDomain(row as Record<string, unknown>))
}

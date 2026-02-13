/**
 * Tax Information Functions
 *
 * Manages W-9 collection, tax info storage, and 1099 form access.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

import { sql, withTenant } from '@cgk-platform/db'

import { getPayoutMethods } from './payout-methods'
import type { CheckAddress, SubmitW9Input, TaxForm, W9Info } from './types'

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.TAX_ENCRYPTION_KEY || 'default-key-must-be-32-bytes!!'
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

/**
 * Check if W-9 is required for a payee
 *
 * W-9 is required for US-based payees before first payout
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function requiresW9(
  payeeId: string,
  tenantSlug: string
): Promise<boolean> {
  // Check if W-9 already submitted
  const existingW9 = await getTaxInfo(payeeId, tenantSlug)
  if (existingW9) {
    return false
  }

  // Check if any payout method is US-based
  const methods = await getPayoutMethods(payeeId, tenantSlug)
  const hasUSMethod = methods.some((m) => m.accountCountry === 'US')

  return hasUSMethod
}

/**
 * Get W-9 tax info for a payee
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getTaxInfo(
  payeeId: string,
  tenantSlug: string
): Promise<W9Info | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payee_tax_info
      WHERE payee_id = ${payeeId}
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToW9Info(result.rows[0] as Record<string, unknown>)
}

/**
 * Submit W-9 tax information
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantId - Tenant ID
 * @param tenantSlug - Tenant slug for schema access
 * @param input - W-9 form data
 * @param ipAddress - IP address of submitter (optional)
 */
export async function submitW9(
  payeeId: string,
  tenantId: string,
  tenantSlug: string,
  input: SubmitW9Input,
  ipAddress?: string
): Promise<W9Info> {
  // Validate tax ID format
  const taxIdClean = input.taxId.replace(/[^0-9]/g, '')
  if (input.taxIdType === 'ssn' && taxIdClean.length !== 9) {
    throw new TaxError('SSN must be 9 digits', 'INVALID_SSN')
  }
  if (input.taxIdType === 'ein' && taxIdClean.length !== 9) {
    throw new TaxError('EIN must be 9 digits', 'INVALID_EIN')
  }

  // Encrypt the tax ID
  const encryptedTaxId = encryptTaxId(taxIdClean)
  const taxIdLast4 = taxIdClean.slice(-4)

  // Check if W-9 already exists
  const existing = await getTaxInfo(payeeId, tenantSlug)
  if (existing) {
    // Update existing
    const result = await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE payee_tax_info
        SET
          tax_id_type = ${input.taxIdType},
          tax_id_last4 = ${taxIdLast4},
          tax_id_encrypted = ${encryptedTaxId},
          legal_name = ${input.legalName},
          business_name = ${input.businessName || null},
          entity_type = ${input.entityType},
          address = ${JSON.stringify(input.address)},
          signed_at = NOW(),
          signed_by = ${input.signature},
          ip_address = ${ipAddress || null},
          updated_at = NOW()
        WHERE payee_id = ${payeeId}
        RETURNING *
      `
    })
    return mapRowToW9Info(result.rows[0] as Record<string, unknown>)
  }

  // Create new
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      INSERT INTO payee_tax_info (
        payee_id, tenant_id, country, tax_id_type, tax_id_last4,
        tax_id_encrypted, legal_name, business_name, entity_type,
        address, signed_at, signed_by, ip_address
      )
      VALUES (
        ${payeeId}, ${tenantId}, 'US', ${input.taxIdType}, ${taxIdLast4},
        ${encryptedTaxId}, ${input.legalName}, ${input.businessName || null},
        ${input.entityType}, ${JSON.stringify(input.address)}, NOW(),
        ${input.signature}, ${ipAddress || null}
      )
      RETURNING *
    `
  })

  return mapRowToW9Info(result.rows[0] as Record<string, unknown>)
}

/**
 * Get tax forms (1099s) for a payee
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 * @param options - Filtering options
 */
export async function getTaxForms(
  payeeId: string,
  tenantSlug: string,
  options: {
    year?: number
    limit?: number
    offset?: number
  } = {}
): Promise<{ forms: TaxForm[]; total: number }> {
  const { year, limit = 50, offset = 0 } = options

  const result = await withTenant(tenantSlug, async () => {
    if (year) {
      return sql`
        SELECT *
        FROM payee_tax_forms
        WHERE payee_id = ${payeeId}
          AND tax_year = ${year}
        ORDER BY tax_year DESC, created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }
    return sql`
      SELECT *
      FROM payee_tax_forms
      WHERE payee_id = ${payeeId}
      ORDER BY tax_year DESC, created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  })

  const countResult = await withTenant(tenantSlug, async () => {
    if (year) {
      return sql`
        SELECT COUNT(*) as total
        FROM payee_tax_forms
        WHERE payee_id = ${payeeId}
          AND tax_year = ${year}
      `
    }
    return sql`
      SELECT COUNT(*) as total
      FROM payee_tax_forms
      WHERE payee_id = ${payeeId}
    `
  })

  return {
    forms: result.rows.map((row) =>
      mapRowToTaxForm(row as Record<string, unknown>)
    ),
    total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
  }
}

/**
 * Get a single tax form by ID
 *
 * @param formId - Tax form ID
 * @param payeeId - Payee ID for access control
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getTaxFormById(
  formId: string,
  payeeId: string,
  tenantSlug: string
): Promise<TaxForm | null> {
  const result = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT *
      FROM payee_tax_forms
      WHERE id = ${formId}
        AND payee_id = ${payeeId}
    `
  })

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToTaxForm(result.rows[0] as Record<string, unknown>)
}

/**
 * Get W-9 status summary
 *
 * @param payeeId - Contractor or creator ID
 * @param tenantSlug - Tenant slug for schema access
 */
export async function getW9Status(
  payeeId: string,
  tenantSlug: string
): Promise<{
  required: boolean
  submitted: boolean
  submittedAt: Date | null
  taxIdLast4: string | null
  entityType: string | null
}> {
  const [required, taxInfo] = await Promise.all([
    requiresW9(payeeId, tenantSlug),
    getTaxInfo(payeeId, tenantSlug),
  ])

  return {
    required,
    submitted: taxInfo !== null,
    submittedAt: taxInfo?.signedAt || null,
    taxIdLast4: taxInfo?.taxIdLast4 || null,
    entityType: taxInfo?.entityType || null,
  }
}

/**
 * Encrypt tax ID using AES-256-GCM
 */
function encryptTaxId(taxId: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  )

  let encrypted = cipher.update(taxId, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt tax ID (admin use only)
 */
export function decryptTaxId(encryptedTaxId: string): string {
  const parts = encryptedTaxId.split(':')
  const ivHex = parts[0]
  const authTagHex = parts[1]
  const encrypted = parts[2]

  if (!ivHex || !authTagHex || !encrypted) {
    throw new TaxError('Invalid encrypted tax ID format', 'INVALID_FORMAT')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  )
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Map database row to W9Info
 */
function mapRowToW9Info(row: Record<string, unknown>): W9Info {
  let address: CheckAddress = {
    name: '',
    line1: '',
    line2: null,
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  }
  try {
    const addressData = row.address
    if (addressData) {
      address =
        typeof addressData === 'string'
          ? JSON.parse(addressData)
          : (addressData as CheckAddress)
    }
  } catch {
    // Use default
  }

  return {
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    country: row.country as string,
    taxIdType: row.tax_id_type as 'ssn' | 'ein',
    taxIdLast4: row.tax_id_last4 as string,
    taxIdEncrypted: row.tax_id_encrypted as string,
    legalName: row.legal_name as string,
    businessName: (row.business_name as string) || null,
    entityType: row.entity_type as W9Info['entityType'],
    address,
    signedAt: new Date(row.signed_at as string),
    signedBy: row.signed_by as string,
    ipAddress: (row.ip_address as string) || null,
  }
}

/**
 * Map database row to TaxForm
 */
function mapRowToTaxForm(row: Record<string, unknown>): TaxForm {
  return {
    id: row.id as string,
    payeeId: row.payee_id as string,
    tenantId: row.tenant_id as string,
    formType: row.form_type as '1099-nec' | '1099-misc',
    taxYear: parseInt(row.tax_year as string, 10),
    totalAmountCents: parseInt(row.total_amount_cents as string, 10),
    status: row.status as TaxForm['status'],
    fileUrl: (row.file_url as string) || null,
    generatedAt: row.generated_at
      ? new Date(row.generated_at as string)
      : null,
    filedAt: row.filed_at ? new Date(row.filed_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Tax error class
 */
export class TaxError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'TaxError'
    this.code = code
  }
}

/**
 * W-9 Storage and Retrieval
 *
 * Handles W-9 form submission, encrypted TIN storage, and retrieval
 * with proper audit logging.
 *
 * @ai-pattern security-critical
 * @ai-required All TIN access must be logged
 */

import { getTaxPayee, logTaxAction, upsertTaxPayee, upsertW9Tracking } from './db.js'
import { decryptTIN, encryptTIN, getLastFour, isValidTIN } from './encryption.js'
import type { PayeeType, TaxPayee, W9Data } from './types.js'

export interface SaveW9Options {
  ipAddress?: string
  userAgent?: string
}

export interface W9ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate W-9 data before saving
 */
export function validateW9Data(data: W9Data): W9ValidationResult {
  const errors: string[] = []

  // Required fields
  if (!data.legalName?.trim()) {
    errors.push('Legal name is required')
  }

  if (!data.taxClassification) {
    errors.push('Tax classification is required')
  }

  // Address validation
  if (!data.address?.line1?.trim()) {
    errors.push('Address line 1 is required')
  }
  if (!data.address?.city?.trim()) {
    errors.push('City is required')
  }
  if (!data.address?.state?.trim()) {
    errors.push('State is required')
  }
  if (!data.address?.postalCode?.trim()) {
    errors.push('Postal code is required')
  }

  // US postal code validation
  if (data.address?.postalCode) {
    const zip = data.address.postalCode.replace(/\D/g, '')
    if (zip.length !== 5 && zip.length !== 9) {
      errors.push('Invalid postal code format')
    }
  }

  // TIN validation
  if (!data.tin) {
    errors.push('TIN (SSN or EIN) is required')
  } else if (!isValidTIN(data.tin, data.tinType)) {
    errors.push(`Invalid ${data.tinType === 'ssn' ? 'SSN' : 'EIN'} format`)
  }

  // Certification
  if (!data.certificationName?.trim()) {
    errors.push('Certification signature name is required')
  }

  if (!data.certificationDate) {
    errors.push('Certification date is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Save W-9 data with encrypted TIN
 */
export async function saveW9(
  tenantSlug: string,
  data: W9Data,
  submittedBy: string,
  options: SaveW9Options = {}
): Promise<TaxPayee> {
  // Validate data
  const validation = validateW9Data(data)
  if (!validation.valid) {
    throw new Error(`W-9 validation failed: ${validation.errors.join(', ')}`)
  }

  // Encrypt TIN
  const tinEncrypted = encryptTIN(data.tin)
  const tinLastFour = getLastFour(data.tin)

  // Save to database
  const taxPayee = await upsertTaxPayee(tenantSlug, {
    payeeId: data.payeeId,
    payeeType: data.payeeType,
    legalName: data.legalName,
    businessName: data.businessName,
    taxClassification: data.taxClassification,
    address: data.address,
    tinEncrypted,
    tinLastFour,
    tinType: data.tinType,
    w9CertifiedAt: data.certificationDate,
    w9CertifiedName: data.certificationName,
    w9CertifiedIp: data.certificationIp,
    eDeliveryConsent: data.eDeliveryConsent,
    eDeliveryConsentAt: data.eDeliveryConsentAt,
  })

  // Log the action
  await logTaxAction(
    tenantSlug,
    'tax_info_created',
    null,
    data.payeeId,
    data.payeeType,
    submittedBy,
    {
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      notes: 'W-9 form submitted',
    }
  )

  // Mark W-9 compliance as completed
  await upsertW9Tracking(tenantSlug, data.payeeId, data.payeeType, {
    completedAt: new Date(),
  })

  return taxPayee
}

/**
 * Update W-9 data
 */
export async function updateW9(
  tenantSlug: string,
  data: W9Data,
  updatedBy: string,
  options: SaveW9Options = {}
): Promise<TaxPayee> {
  // Get existing record
  const existing = await getTaxPayee(tenantSlug, data.payeeId, data.payeeType)
  if (!existing) {
    throw new Error(`No existing W-9 found for ${data.payeeType} ${data.payeeId}`)
  }

  // Validate data
  const validation = validateW9Data(data)
  if (!validation.valid) {
    throw new Error(`W-9 validation failed: ${validation.errors.join(', ')}`)
  }

  // Encrypt TIN
  const tinEncrypted = encryptTIN(data.tin)
  const tinLastFour = getLastFour(data.tin)

  // Track changes for audit
  const changes: Record<string, unknown> = {}
  if (existing.legalName !== data.legalName) {
    changes.legalName = { from: existing.legalName, to: data.legalName }
  }
  if (existing.tinLastFour !== tinLastFour) {
    changes.tinLastFour = { from: existing.tinLastFour, to: tinLastFour }
  }
  if (JSON.stringify(existing.address) !== JSON.stringify(data.address)) {
    changes.address = { from: existing.address, to: data.address }
  }

  // Save to database
  const taxPayee = await upsertTaxPayee(tenantSlug, {
    payeeId: data.payeeId,
    payeeType: data.payeeType,
    legalName: data.legalName,
    businessName: data.businessName,
    taxClassification: data.taxClassification,
    address: data.address,
    tinEncrypted,
    tinLastFour,
    tinType: data.tinType,
    w9CertifiedAt: data.certificationDate,
    w9CertifiedName: data.certificationName,
    w9CertifiedIp: data.certificationIp,
    eDeliveryConsent: data.eDeliveryConsent,
    eDeliveryConsentAt: data.eDeliveryConsentAt,
  })

  // Log the update
  await logTaxAction(
    tenantSlug,
    'tax_info_updated',
    null,
    data.payeeId,
    data.payeeType,
    updatedBy,
    {
      changes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      notes: 'W-9 form updated',
    }
  )

  return taxPayee
}

/**
 * Check if a payee has complete tax info
 */
export async function hasCompleteTaxInfo(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType
): Promise<boolean> {
  const taxPayee = await getTaxPayee(tenantSlug, payeeId, payeeType)
  return taxPayee !== null && !!taxPayee.w9CertifiedAt
}

/**
 * Get decrypted TIN with audit logging
 *
 * @ai-pattern security-critical
 * @ai-required Always log TIN decryption
 */
export async function getDecryptedTIN(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType,
  accessedBy: string,
  reason: string,
  options: { ipAddress?: string; userAgent?: string } = {}
): Promise<string | null> {
  const taxPayee = await getTaxPayee(tenantSlug, payeeId, payeeType)
  if (!taxPayee) {
    return null
  }

  // Log the decryption access
  await logTaxAction(
    tenantSlug,
    'tin_decrypted',
    null,
    payeeId,
    payeeType,
    accessedBy,
    {
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      notes: reason,
    }
  )

  return decryptTIN(taxPayee.tinEncrypted)
}

/**
 * Get W-9 status for a payee
 */
export async function getW9Status(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType
): Promise<{
  hasW9: boolean
  status: 'not_submitted' | 'approved' | 'expired'
  tinLastFour?: string
  certifiedAt?: Date
  certifiedName?: string
  eDeliveryConsent?: boolean
}> {
  const taxPayee = await getTaxPayee(tenantSlug, payeeId, payeeType)

  if (!taxPayee) {
    return { hasW9: false, status: 'not_submitted' }
  }

  // Check if W-9 is expired (older than 3 years is a common policy)
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const isExpired = taxPayee.w9CertifiedAt < threeYearsAgo

  return {
    hasW9: true,
    status: isExpired ? 'expired' : 'approved',
    tinLastFour: taxPayee.tinLastFour,
    certifiedAt: taxPayee.w9CertifiedAt,
    certifiedName: taxPayee.w9CertifiedName,
    eDeliveryConsent: taxPayee.eDeliveryConsent,
  }
}

/**
 * Re-export getTaxPayee for convenience
 */
export { getTaxPayee } from './db.js'

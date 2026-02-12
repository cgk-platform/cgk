/**
 * 1099 Corrections System
 *
 * Handles Type 1 (amount only) and Type 2 (recipient info) corrections.
 *
 * @ai-pattern tax-compliance
 * @ai-required Only filed forms can be corrected
 */

import { randomBytes } from 'crypto'

import {
  getTaxFormById,
  insertTaxForm,
  logTaxAction,
  updateTaxFormStatus,
} from './db.js'
import type { Address, TaxForm } from './types.js'

/**
 * Create a Type 1 correction (amount only)
 *
 * Type 1 corrections are used when only the dollar amount needs to be changed.
 * The original form remains filed, and a correction form is generated.
 */
export async function createAmountCorrection(
  tenantSlug: string,
  originalFormId: string,
  newAmounts: Record<string, number>,
  reason: string,
  createdBy: string
): Promise<TaxForm> {
  const original = await getTaxFormById(tenantSlug, originalFormId)

  if (!original) {
    throw new Error('Original form not found')
  }

  if (original.status !== 'filed') {
    throw new Error('Can only correct filed forms')
  }

  // Calculate new total
  const newTotal = Object.values(newAmounts).reduce((sum, amount) => sum + amount, 0)

  // Generate correction form ID
  const correctionId = `1099_corr1_${randomBytes(12).toString('hex')}`

  // Create correction form
  const correction: TaxForm = {
    ...original,
    id: correctionId,
    boxAmounts: newAmounts,
    totalAmountCents: newTotal,
    status: 'draft',
    createdAt: new Date(),
    createdBy,
    originalFormId,
    correctionType: 'type1',
    approvedAt: undefined,
    approvedBy: undefined,
    irsFiledAt: undefined,
    irsConfirmationNumber: undefined,
    stateFiledAt: undefined,
    stateConfirmationNumber: undefined,
    deliveredAt: undefined,
    deliveryConfirmedAt: undefined,
  }

  await insertTaxForm(tenantSlug, correction)

  await logTaxAction(
    tenantSlug,
    'form_corrected',
    correctionId,
    original.payeeId,
    original.payeeType,
    createdBy,
    {
      changes: {
        originalFormId,
        correctionType: 'type1',
        reason,
        originalAmount: original.totalAmountCents,
        newAmount: newTotal,
      },
      notes: `Type 1 correction: ${reason}`,
    }
  )

  return correction
}

/**
 * Create a Type 2 correction (recipient info change)
 *
 * Type 2 corrections are used when recipient information (name, TIN, address)
 * needs to be changed. This voids the original form and creates a new one.
 */
export async function createInfoCorrection(
  tenantSlug: string,
  originalFormId: string,
  correctedInfo: Partial<{
    recipientName: string
    recipientAddress: Address
    recipientTinLastFour: string
  }>,
  reason: string,
  createdBy: string
): Promise<TaxForm> {
  const original = await getTaxFormById(tenantSlug, originalFormId)

  if (!original) {
    throw new Error('Original form not found')
  }

  if (original.status !== 'filed') {
    throw new Error('Can only correct filed forms')
  }

  // Mark original as corrected
  await updateTaxFormStatus(tenantSlug, originalFormId, 'corrected')

  // Generate correction form ID
  const correctionId = `1099_corr2_${randomBytes(12).toString('hex')}`

  // Create new form with corrected info
  const correction: TaxForm = {
    ...original,
    id: correctionId,
    recipientName: correctedInfo.recipientName || original.recipientName,
    recipientAddress: correctedInfo.recipientAddress || original.recipientAddress,
    recipientTinLastFour: correctedInfo.recipientTinLastFour || original.recipientTinLastFour,
    status: 'draft',
    createdAt: new Date(),
    createdBy,
    originalFormId,
    correctionType: 'type2',
    approvedAt: undefined,
    approvedBy: undefined,
    irsFiledAt: undefined,
    irsConfirmationNumber: undefined,
    stateFiledAt: undefined,
    stateConfirmationNumber: undefined,
    deliveredAt: undefined,
    deliveryConfirmedAt: undefined,
  }

  await insertTaxForm(tenantSlug, correction)

  // Log the correction
  const changes: Record<string, unknown> = {
    originalFormId,
    correctionType: 'type2',
    reason,
  }

  if (correctedInfo.recipientName && correctedInfo.recipientName !== original.recipientName) {
    changes.recipientName = {
      from: original.recipientName,
      to: correctedInfo.recipientName,
    }
  }

  if (correctedInfo.recipientTinLastFour && correctedInfo.recipientTinLastFour !== original.recipientTinLastFour) {
    changes.recipientTinLastFour = {
      from: original.recipientTinLastFour,
      to: correctedInfo.recipientTinLastFour,
    }
  }

  await logTaxAction(
    tenantSlug,
    'form_corrected',
    correctionId,
    original.payeeId,
    original.payeeType,
    createdBy,
    {
      changes,
      notes: `Type 2 correction (voids original): ${reason}`,
    }
  )

  return correction
}

/**
 * Get all corrections for an original form
 */
export async function getCorrections(
  _tenantSlug: string,
  _originalFormId: string
): Promise<TaxForm[]> {
  // This would require a specific query - for now just return empty
  // In a full implementation, you'd query tax_forms WHERE original_form_id = originalFormId
  return []
}

/**
 * Check if a form has pending corrections
 */
export async function hasPendingCorrections(
  tenantSlug: string,
  formId: string
): Promise<boolean> {
  // Would need to check for any corrections in draft/pending_review status
  const corrections = await getCorrections(tenantSlug, formId)
  return corrections.some((c) => c.status === 'draft' || c.status === 'pending_review')
}

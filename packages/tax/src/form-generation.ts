/**
 * 1099 Form Generation
 *
 * Generates 1099 forms for payees meeting the $600 threshold.
 *
 * @ai-pattern tax-compliance
 * @ai-required Forms must be generated only for qualifying payees with W-9
 */

import { randomBytes } from 'crypto'

import {
  getApprovedForms,
  getTaxForm,
  getTaxPayee,
  insertTaxForm,
  listTaxForms,
  logTaxAction,
  updateTaxFormStatus,
} from './db.js'
import { getAnnualPayments, getPayeesRequiring1099 } from './payments.js'
import type {
  BulkGenerationResult,
  FormStatus,
  FormType,
  PayeeType,
  PayerInfo,
  TaxForm,
} from './types.js'
import { PAYEE_TYPE_FORM_MAP, THRESHOLD_CENTS } from './types.js'

/**
 * Get payer info from environment variables
 */
export function getPayerInfo(): PayerInfo {
  const tin = process.env.TAX_PAYER_EIN
  const name = process.env.TAX_PAYER_NAME
  const line1 = process.env.TAX_PAYER_ADDRESS_LINE1
  const city = process.env.TAX_PAYER_CITY
  const state = process.env.TAX_PAYER_STATE
  const postalCode = process.env.TAX_PAYER_ZIP

  if (!tin || !name || !line1 || !city || !state || !postalCode) {
    throw new Error(
      'Missing payer configuration. Set TAX_PAYER_EIN, TAX_PAYER_NAME, ' +
      'TAX_PAYER_ADDRESS_LINE1, TAX_PAYER_CITY, TAX_PAYER_STATE, TAX_PAYER_ZIP'
    )
  }

  return {
    tin,
    name,
    address: {
      line1,
      line2: process.env.TAX_PAYER_ADDRESS_LINE2,
      city,
      state,
      postalCode,
      country: 'US',
    },
  }
}

/**
 * Generate a unique form ID
 */
function generateFormId(prefix: string = '1099'): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

/**
 * Get the form type for a payee type
 */
export function getFormType(payeeType: PayeeType): FormType {
  return PAYEE_TYPE_FORM_MAP[payeeType]
}

/**
 * Calculate box amounts based on form type and total
 */
function calculateBoxAmounts(formType: FormType, totalCents: number): Record<string, number> {
  switch (formType) {
    case '1099-NEC':
      // Box 1: Nonemployee compensation
      return { box1: totalCents }
    case '1099-MISC':
      // Box 7: Nonemployee compensation (pre-2020) or Box 3: Other income
      return { box3: totalCents }
    case '1099-K':
      // Box 1a: Gross amount of payment card/third party network transactions
      return { box1a: totalCents }
    default:
      return { box1: totalCents }
  }
}

/**
 * Generate a single 1099 form for a payee
 */
export async function generate1099(
  tenantSlug: string,
  payeeId: string,
  payeeType: PayeeType,
  taxYear: number,
  generatedBy: string
): Promise<TaxForm> {
  // Get tax payee record (W-9 data)
  const taxPayee = await getTaxPayee(tenantSlug, payeeId, payeeType)
  if (!taxPayee) {
    throw new Error(`No W-9 on file for ${payeeType} ${payeeId}`)
  }

  // Calculate annual payments
  const totalCents = await getAnnualPayments(tenantSlug, payeeId, payeeType, taxYear)
  if (totalCents < THRESHOLD_CENTS) {
    throw new Error(`Below $600 threshold: $${(totalCents / 100).toFixed(2)}`)
  }

  // Check for existing form
  const existingForm = await getTaxForm(tenantSlug, payeeId, payeeType, taxYear)
  if (existingForm && existingForm.status !== 'voided') {
    throw new Error(`Form already exists for ${payeeType} ${payeeId} in ${taxYear}`)
  }

  // Get payer info
  const payer = getPayerInfo()

  // Determine form type
  const formType = getFormType(payeeType)

  // Generate form ID
  const formId = generateFormId()

  // Create form record
  const form: TaxForm = {
    id: formId,
    payeeId,
    payeeType,
    taxYear,
    formType,
    payerTin: payer.tin,
    payerName: payer.name,
    payerAddress: payer.address,
    recipientTinLastFour: taxPayee.tinLastFour,
    recipientName: taxPayee.legalName,
    recipientAddress: taxPayee.address,
    totalAmountCents: totalCents,
    boxAmounts: calculateBoxAmounts(formType, totalCents),
    status: 'draft',
    createdAt: new Date(),
    createdBy: generatedBy,
  }

  // Insert form
  const savedForm = await insertTaxForm(tenantSlug, form)

  // Log the action
  await logTaxAction(
    tenantSlug,
    'form_created',
    formId,
    payeeId,
    payeeType,
    generatedBy,
    {
      notes: `Generated ${formType} for tax year ${taxYear}`,
    }
  )

  return savedForm
}

/**
 * Bulk generate 1099s for all qualifying payees
 */
export async function bulkGenerate1099s(
  tenantSlug: string,
  taxYear: number,
  payeeType: PayeeType,
  generatedBy: string
): Promise<BulkGenerationResult> {
  const qualifying = await getPayeesRequiring1099(tenantSlug, payeeType, taxYear)

  let generated = 0
  let skipped = 0
  const errors: string[] = []

  for (const { payeeId } of qualifying) {
    try {
      // Check if form already exists
      const existing = await getTaxForm(tenantSlug, payeeId, payeeType, taxYear)
      if (existing && existing.status !== 'voided') {
        skipped++
        continue
      }

      await generate1099(tenantSlug, payeeId, payeeType, taxYear, generatedBy)
      generated++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${payeeType} ${payeeId}: ${message}`)
    }
  }

  return { generated, skipped, errors }
}

/**
 * Approve a 1099 form
 */
export async function approve1099(
  tenantSlug: string,
  formId: string,
  approvedBy: string
): Promise<TaxForm> {
  const form = await updateTaxFormStatus(tenantSlug, formId, 'approved', {
    approvedAt: new Date(),
    approvedBy,
  })

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  // Verify status transition is valid
  if (form.status !== 'approved') {
    throw new Error(`Cannot approve form in ${form.status} status`)
  }

  await logTaxAction(
    tenantSlug,
    'form_approved',
    formId,
    form.payeeId,
    form.payeeType,
    approvedBy,
    {
      notes: `Form approved for filing`,
    }
  )

  return form
}

/**
 * Bulk approve multiple 1099 forms
 */
export async function bulkApprove1099s(
  tenantSlug: string,
  formIds: string[],
  approvedBy: string
): Promise<{ approved: number; errors: string[] }> {
  let approved = 0
  const errors: string[] = []

  for (const formId of formIds) {
    try {
      await approve1099(tenantSlug, formId, approvedBy)
      approved++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${formId}: ${message}`)
    }
  }

  return { approved, errors }
}

/**
 * Void a 1099 form (only for draft/pending forms)
 */
export async function void1099(
  tenantSlug: string,
  formId: string,
  voidedBy: string,
  reason: string
): Promise<void> {
  const { forms } = await listTaxForms(tenantSlug, { limit: 1 })
  const form = forms.find((f) => f.id === formId)

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  // Cannot void filed forms
  if (form.status === 'filed') {
    throw new Error('Cannot void filed form - create a correction instead')
  }

  await updateTaxFormStatus(tenantSlug, formId, 'voided')

  await logTaxAction(
    tenantSlug,
    'form_voided',
    formId,
    form.payeeId,
    form.payeeType,
    voidedBy,
    {
      notes: reason,
    }
  )
}

/**
 * Submit a form for review
 */
export async function submitForReview(
  tenantSlug: string,
  formId: string,
  submittedBy: string
): Promise<TaxForm> {
  const form = await updateTaxFormStatus(tenantSlug, formId, 'pending_review')

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  await logTaxAction(
    tenantSlug,
    'form_created', // Using form_created as there's no specific submit action
    formId,
    form.payeeId,
    form.payeeType,
    submittedBy,
    {
      notes: 'Form submitted for review',
    }
  )

  return form
}

/**
 * Get forms ready for filing (approved status)
 */
export async function getFormsReadyForFiling(
  tenantSlug: string,
  taxYear: number,
  payeeType?: PayeeType
): Promise<TaxForm[]> {
  return getApprovedForms(tenantSlug, taxYear, payeeType)
}

/**
 * Get form generation statistics
 */
export async function getFormGenerationStats(
  tenantSlug: string,
  taxYear: number
): Promise<{
  draft: number
  pendingReview: number
  approved: number
  filed: number
  corrected: number
  voided: number
  total: number
}> {
  const statuses: FormStatus[] = ['draft', 'pending_review', 'approved', 'filed', 'corrected', 'voided']
  const stats: Record<string, number> = {}

  for (const status of statuses) {
    const { total } = await listTaxForms(tenantSlug, { taxYear, status, limit: 0 })
    stats[status] = total
  }

  return {
    draft: stats.draft || 0,
    pendingReview: stats.pending_review || 0,
    approved: stats.approved || 0,
    filed: stats.filed || 0,
    corrected: stats.corrected || 0,
    voided: stats.voided || 0,
    total: Object.values(stats).reduce((sum, count) => sum + count, 0) - (stats.voided || 0),
  }
}

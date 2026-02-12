/**
 * IRS IRIS Filing System
 *
 * Generates IRS IRIS-compatible CSV files and tracks filing status.
 *
 * @ai-pattern tax-compliance
 * @ai-required Pre-filing validation is mandatory
 */

import { getApprovedForms, getTaxPayee, logTaxAction, updateTaxFormStatus } from './db.js'
import { getDecryptedTIN } from './w9.js'
import type { FormType, PayeeType, ValidationResult } from './types.js'
import { THRESHOLD_CENTS } from './types.js'

/**
 * Validate forms before filing with IRS
 */
export async function validateForFiling(
  tenantSlug: string,
  taxYear: number,
  payeeType?: PayeeType
): Promise<ValidationResult> {
  const forms = await getApprovedForms(tenantSlug, taxYear, payeeType)
  const errors: string[] = []

  for (const form of forms) {
    const payee = await getTaxPayee(tenantSlug, form.payeeId, form.payeeType)

    if (!payee) {
      errors.push(`${form.id}: No W-9 on file for payee`)
      continue
    }

    if (!payee.w9CertifiedAt) {
      errors.push(`${form.id}: W-9 not certified`)
    }

    if (form.totalAmountCents < THRESHOLD_CENTS) {
      errors.push(`${form.id}: Below $600 threshold ($${(form.totalAmountCents / 100).toFixed(2)})`)
    }

    // Validate address
    if (!payee.address.line1 || !payee.address.city || !payee.address.state || !payee.address.postalCode) {
      errors.push(`${form.id}: Incomplete address`)
    }

    // Validate TIN is present
    if (!payee.tinEncrypted) {
      errors.push(`${form.id}: Missing TIN`)
    }
  }

  return {
    valid: errors.length === 0,
    formCount: forms.length,
    errors,
  }
}

/**
 * IRS IRIS CSV record structure
 */
interface IRISRecord {
  taxYear: string
  formType: string
  payerTIN: string
  payerName: string
  payerAddress: string
  payerCity: string
  payerState: string
  payerZip: string
  recipientTIN: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientState: string
  recipientZip: string
  amount: string
  accountNumber?: string
}

/**
 * Format form type for IRIS
 */
function formatFormTypeForIRIS(formType: FormType): string {
  switch (formType) {
    case '1099-NEC':
      return 'NEC'
    case '1099-MISC':
      return 'MISC'
    case '1099-K':
      return 'K'
  }
}

/**
 * Generate IRS IRIS CSV for filing
 */
export async function generateIRISCSV(
  tenantSlug: string,
  taxYear: number,
  payeeType?: PayeeType,
  accessedBy: string = 'system'
): Promise<{ csv: string; formIds: string[]; recordCount: number }> {
  const forms = await getApprovedForms(tenantSlug, taxYear, payeeType)
  const formIds: string[] = []
  const records: IRISRecord[] = []

  for (const form of forms) {
    const payee = await getTaxPayee(tenantSlug, form.payeeId, form.payeeType)
    if (!payee) continue

    // Decrypt TIN for filing (with audit log)
    const tin = await getDecryptedTIN(
      tenantSlug,
      form.payeeId,
      form.payeeType,
      accessedBy,
      'IRIS CSV generation',
      {}
    )

    if (!tin) continue

    records.push({
      taxYear: String(taxYear),
      formType: formatFormTypeForIRIS(form.formType),
      payerTIN: form.payerTin,
      payerName: form.payerName,
      payerAddress: form.payerAddress.line1,
      payerCity: form.payerAddress.city,
      payerState: form.payerAddress.state,
      payerZip: form.payerAddress.postalCode,
      recipientTIN: tin,
      recipientName: form.recipientName,
      recipientAddress: form.recipientAddress.line1,
      recipientCity: form.recipientAddress.city,
      recipientState: form.recipientAddress.state,
      recipientZip: form.recipientAddress.postalCode,
      amount: (form.totalAmountCents / 100).toFixed(2),
    })

    formIds.push(form.id)
  }

  // Generate CSV
  const headers = [
    'Tax Year',
    'Form Type',
    'Payer TIN',
    'Payer Name',
    'Payer Address',
    'Payer City',
    'Payer State',
    'Payer ZIP',
    'Recipient TIN',
    'Recipient Name',
    'Recipient Address',
    'Recipient City',
    'Recipient State',
    'Recipient ZIP',
    'Amount',
  ]

  const rows = records.map((r) => [
    r.taxYear,
    r.formType,
    r.payerTIN,
    `"${r.payerName}"`,
    `"${r.payerAddress}"`,
    `"${r.payerCity}"`,
    r.payerState,
    r.payerZip,
    r.recipientTIN,
    `"${r.recipientName}"`,
    `"${r.recipientAddress}"`,
    `"${r.recipientCity}"`,
    r.recipientState,
    r.recipientZip,
    r.amount,
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

  return {
    csv,
    formIds,
    recordCount: records.length,
  }
}

/**
 * Mark forms as filed with IRS
 */
export async function markFormsAsFiled(
  tenantSlug: string,
  formIds: string[],
  filedBy: string,
  irsConfirmationNumber: string
): Promise<{ filed: number; errors: string[] }> {
  let filed = 0
  const errors: string[] = []

  for (const formId of formIds) {
    try {
      const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', {
        irsFiledAt: new Date(),
        irsConfirmationNumber,
      })

      if (!form) {
        errors.push(`${formId}: Form not found`)
        continue
      }

      await logTaxAction(
        tenantSlug,
        'form_filed',
        formId,
        form.payeeId,
        form.payeeType,
        filedBy,
        {
          notes: `Filed with IRS, confirmation: ${irsConfirmationNumber}`,
        }
      )

      filed++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${formId}: ${message}`)
    }
  }

  return { filed, errors }
}

/**
 * Mark forms as filed with state
 */
export async function markFormsAsStateFiled(
  tenantSlug: string,
  formIds: string[],
  filedBy: string,
  stateConfirmationNumber: string
): Promise<{ filed: number; errors: string[] }> {
  let filed = 0
  const errors: string[] = []

  for (const formId of formIds) {
    try {
      const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', {
        stateFiledAt: new Date(),
        stateConfirmationNumber,
      })

      if (!form) {
        errors.push(`${formId}: Form not found`)
        continue
      }

      await logTaxAction(
        tenantSlug,
        'form_filed',
        formId,
        form.payeeId,
        form.payeeType,
        filedBy,
        {
          notes: `Filed with state, confirmation: ${stateConfirmationNumber}`,
        }
      )

      filed++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${formId}: ${message}`)
    }
  }

  return { filed, errors }
}

/**
 * Get filing statistics
 */
export async function getFilingStats(
  tenantSlug: string,
  taxYear: number
): Promise<{
  readyToFile: number
  filedWithIRS: number
  filedWithState: number
  pending: number
}> {
  const approved = await getApprovedForms(tenantSlug, taxYear)

  let readyToFile = 0
  let filedWithIRS = 0
  let filedWithState = 0
  let pending = 0

  for (const form of approved) {
    if (form.irsFiledAt) {
      filedWithIRS++
      if (form.stateFiledAt) {
        filedWithState++
      }
    } else {
      readyToFile++
    }
  }

  // Note: "pending" includes draft/pending_review forms - would need separate query
  pending = readyToFile

  return {
    readyToFile,
    filedWithIRS,
    filedWithState,
    pending,
  }
}

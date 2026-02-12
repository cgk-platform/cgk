# PHASE-4D: Creator Tax Compliance

**Status**: COMPLETE
**Duration**: 2 weeks (Weeks 18-19)
**Depends On**: PHASE-4A (creator portal), PHASE-4B (payments), PHASE-4C (projects)
**Parallel With**: None
**Blocks**: PHASE-5A (jobs)

---

## Goal

Implement comprehensive tax compliance system including W-9 collection with encrypted TIN storage, multi-payee type support (creators, contractors, merchants, vendors), automated 1099 generation (NEC, MISC, K), IRS IRIS filing workflow, state filing support, corrections handling, e-delivery tracking, and full audit logging.

---

## Source Reference (RAWDOG Implementation)

**CRITICAL**: Before implementing, study the complete RAWDOG tax system:

| Component | Location |
|-----------|----------|
| Admin Tax Pages | `/src/app/admin/tax/` |
| API Routes | `/src/app/api/admin/tax/` |
| Core Library | `/src/lib/creator-portal/tax/` |
| Encryption | `/src/lib/creator-portal/tax/encryption.ts` |
| W-9 Reminders | `/src/trigger/w9-compliance-reminders.ts` |

**Key Files to Study:**
- `types.ts` - PayeeType, TaxForm, FormStatus definitions
- `db.ts` - Schema, CRUD operations, audit logging
- `encryption.ts` - AES-256-GCM TIN encryption
- `payments.ts` - Annual payment aggregation, threshold tracking
- `form-generation.ts` - 1099 generation and approval
- `iris-filing.ts` - IRS IRIS CSV generation
- `delivery.ts` - E-delivery and notifications
- `corrections.ts` - Amendment handling
- `state-filing.ts` - State requirements

---

## Success Criteria

### W-9 Collection
- [x] W9Data interface with all tax classification types
- [x] AES-256-GCM encrypted TIN storage
- [x] Only last 4 digits visible in UI (masked: `***-**-1234`)
- [x] W-9 certification with timestamp and IP address
- [x] E-delivery consent capture and tracking
- [x] SSN/EIN format validation (reject known invalid patterns)

### Multi-Payee Support
- [x] PayeeType abstraction (creator, contractor, merchant, vendor)
- [x] Form type mapping: Creator/Contractor→1099-NEC, Merchant→1099-K, Vendor→1099-MISC
- [x] Extensible payment sources per payee type
- [x] Composite unique constraints on (payee_id, payee_type)

### Threshold Tracking
- [x] $600 threshold monitoring for all payee types
- [x] "Approaching threshold" (50-99%) identification
- [x] Monthly and annual payment breakdowns
- [x] Dashboard stats: requiring 1099, approaching, missing W-9

### 1099 Generation
- [x] Bulk generation for all qualifying payees
- [x] Individual form generation
- [x] Draft → approved → filed → delivered status workflow
- [x] Form approval and voiding with audit trail

### IRS IRIS Filing
- [x] Pre-filing validation (W-9 complete, amounts valid)
- [x] CSV generation in IRIS format
- [x] Manual upload workflow tracking
- [x] IRS confirmation number storage
- [x] Mark forms as filed with timestamp

### State Filing
- [x] State-specific requirements configuration
- [x] State filing status tracking
- [x] State confirmation number storage

### Corrections
- [x] Type 1 corrections (amount only)
- [x] Type 2 corrections (recipient info - voids original)
- [x] Correction approval workflow
- [x] Correction filing tracking

### Delivery
- [x] Email notification to payees
- [x] Portal availability marking
- [x] Portal view tracking
- [x] Direct mail integration (address verification, tracking)

### Audit Logging
- [x] All tax actions logged with user, timestamp
- [x] TIN decryption logged with IP and user agent
- [x] Form status changes tracked with reason

### Admin UI
- [x] Tax dashboard with stats cards
- [x] 1099 forms management page
- [x] IRS filing workflow page
- [x] W-9 status tracking page
- [x] Annual payments page with CSV export
- [x] Tax settings page

### W-9 Reminders
- [x] Automated reminder cadence (initial, 7-day, 14-day, 21-day)
- [x] Background task for daily reminder checks (via Phase 5E jobs)
- [x] Reminder tracking table (w9_compliance_tracking)

---

## Deliverables

### 1. Type Definitions

```typescript
// packages/tax/src/types.ts

export type PayeeType = 'creator' | 'contractor' | 'merchant' | 'vendor'
export type TinType = 'ssn' | 'ein'
export type FormType = '1099-NEC' | '1099-MISC' | '1099-K'

export type FormStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'filed'
  | 'corrected'
  | 'voided'

export type TaxClassification =
  | 'individual'
  | 'sole_proprietor'
  | 'partnership'
  | 's_corporation'
  | 'c_corporation'
  | 'llc_single_member'
  | 'llc_partnership'
  | 'llc_c_corp'
  | 'llc_s_corp'
  | 'nonprofit'
  | 'government'
  | 'indian_tribal'
  | 'other'

export interface W9Data {
  payeeId: string
  payeeType: PayeeType
  legalName: string
  businessName?: string
  taxClassification: TaxClassification
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  tin: string
  tinType: TinType
  certificationDate: Date
  certificationName: string
  certificationIp: string
  eDeliveryConsent: boolean
  eDeliveryConsentAt?: Date
}

export interface TaxPayee {
  id: string
  payeeId: string
  payeeType: PayeeType
  legalName: string
  businessName?: string
  taxClassification: TaxClassification
  address: Address
  tinEncrypted: string
  tinLastFour: string
  tinType: TinType
  w9CertifiedAt: Date
  w9CertifiedName: string
  eDeliveryConsent: boolean
  eDeliveryConsentAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TaxForm {
  id: string
  payeeId: string
  payeeType: PayeeType
  taxYear: number
  formType: FormType

  // Payer info (from config)
  payerTin: string
  payerName: string
  payerAddress: Address

  // Recipient info (from tax_payees)
  recipientTinLastFour: string
  recipientName: string
  recipientAddress: Address

  // Amounts
  totalAmountCents: number
  boxAmounts: Record<string, number> // e.g., { box1: 60000 }

  // Status
  status: FormStatus
  createdAt: Date
  createdBy: string
  approvedAt?: Date
  approvedBy?: string

  // IRS filing
  irsFiledAt?: Date
  irsConfirmationNumber?: string

  // State filing
  stateFiledAt?: Date
  stateConfirmationNumber?: string

  // Delivery
  deliveryMethod?: 'email' | 'portal' | 'mail'
  deliveredAt?: Date
  deliveryConfirmedAt?: Date
  mailLetterId?: string
  mailStatus?: string

  // Corrections
  originalFormId?: string
  correctionType?: 'type1' | 'type2'
}

export interface TaxFormAuditLog {
  id: string
  taxFormId: string
  payeeId: string
  payeeType: PayeeType
  action: TaxAction
  performedBy: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  notes?: string
  createdAt: Date
}

export type TaxAction =
  | 'tax_info_created'
  | 'tax_info_updated'
  | 'tax_info_viewed'
  | 'tin_decrypted'
  | 'form_created'
  | 'form_approved'
  | 'form_filed'
  | 'form_delivered'
  | 'form_corrected'
  | 'form_voided'
  | 'pdf_generated'
  | 'pdf_downloaded'
  | 'mail_queued'
  | 'mail_sent'
  | 'mail_delivered'
  | 'mail_returned'
```

### 2. Database Schema

```sql
-- packages/db/migrations/XXXX_tax_compliance.sql

-- Tax payee records (W-9 data)
CREATE TABLE tax_payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL CHECK (payee_type IN ('creator', 'contractor', 'merchant', 'vendor')),

  -- Identity
  legal_name TEXT NOT NULL,
  business_name TEXT,
  tax_classification TEXT NOT NULL,

  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  -- TIN (encrypted)
  tin_encrypted TEXT NOT NULL,
  tin_last_four TEXT NOT NULL,
  tin_type TEXT NOT NULL CHECK (tin_type IN ('ssn', 'ein')),

  -- Certification
  w9_certified_at TIMESTAMPTZ NOT NULL,
  w9_certified_name TEXT NOT NULL,
  w9_certified_ip TEXT,

  -- E-delivery
  e_delivery_consent BOOLEAN DEFAULT false,
  e_delivery_consent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(payee_id, payee_type)
);

-- 1099 form records
CREATE TABLE tax_forms (
  id TEXT PRIMARY KEY,
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('1099-NEC', '1099-MISC', '1099-K')),

  -- Payer info
  payer_tin TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_address JSONB NOT NULL,

  -- Recipient info
  recipient_tin_last_four TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_address JSONB NOT NULL,

  -- Amounts
  total_amount_cents INTEGER NOT NULL,
  box_amounts JSONB NOT NULL DEFAULT '{}',

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,

  -- IRS filing
  irs_filed_at TIMESTAMPTZ,
  irs_confirmation_number TEXT,

  -- State filing
  state_filed_at TIMESTAMPTZ,
  state_confirmation_number TEXT,

  -- Delivery
  delivery_method TEXT,
  delivered_at TIMESTAMPTZ,
  delivery_confirmed_at TIMESTAMPTZ,
  mail_letter_id TEXT,
  mail_status TEXT,

  -- Corrections
  original_form_id TEXT REFERENCES tax_forms(id),
  correction_type TEXT CHECK (correction_type IN ('type1', 'type2')),

  -- Unique per payee per year (excluding voided)
  UNIQUE NULLS NOT DISTINCT (payee_id, payee_type, tax_year, form_type)
    WHERE status != 'voided'
);

-- Audit trail
CREATE TABLE tax_form_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id TEXT REFERENCES tax_forms(id),
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- W-9 reminder tracking
CREATE TABLE w9_compliance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_id TEXT NOT NULL,
  payee_type TEXT NOT NULL,
  initial_sent_at TIMESTAMPTZ,
  reminder_1_sent_at TIMESTAMPTZ,
  reminder_2_sent_at TIMESTAMPTZ,
  final_notice_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payee_id, payee_type)
);

-- Tax reminders/deadlines
CREATE TABLE tax_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium',
  category TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  status TEXT DEFAULT 'pending',
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tax_payees_payee ON tax_payees(payee_id, payee_type);
CREATE INDEX idx_tax_forms_payee_year ON tax_forms(payee_id, payee_type, tax_year);
CREATE INDEX idx_tax_forms_status ON tax_forms(status);
CREATE INDEX idx_tax_audit_form ON tax_form_audit_log(tax_form_id);
CREATE INDEX idx_w9_tracking_payee ON w9_compliance_tracking(payee_id, payee_type);
```

### 3. TIN Encryption (AES-256-GCM)

```typescript
// packages/tax/src/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

export function getEncryptionKey(): Buffer {
  const key = process.env.TAX_TIN_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('TAX_TIN_ENCRYPTION_KEY must be 64-char hex string (256 bits)')
  }
  return Buffer.from(key, 'hex')
}

export function encryptTIN(tin: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(tin, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  // Format: base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ])

  return combined.toString('base64')
}

export function decryptTIN(encrypted: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encrypted, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function getLastFour(tin: string): string {
  const digitsOnly = tin.replace(/\D/g, '')
  return digitsOnly.slice(-4)
}

export function maskTIN(tin: string): string {
  const lastFour = getLastFour(tin)
  const tinType = tin.length === 9 ? 'ssn' : 'ein'
  return tinType === 'ssn' ? `***-**-${lastFour}` : `**-***${lastFour}`
}

export function isValidSSN(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '')
  if (digits.length !== 9) return false

  // Invalid patterns
  const area = digits.substring(0, 3)
  const group = digits.substring(3, 5)
  const serial = digits.substring(5, 9)

  if (area === '000' || area === '666' || area.startsWith('9')) return false
  if (group === '00') return false
  if (serial === '0000') return false

  // Common fakes
  const fakes = ['123456789', '111111111', '999999999', '123121234']
  if (fakes.includes(digits)) return false

  return true
}

export function isValidEIN(ein: string): boolean {
  const digits = ein.replace(/\D/g, '')
  return digits.length === 9 && !digits.startsWith('07') && !digits.startsWith('08')
}
```

### 4. Payment Aggregation

```typescript
// packages/tax/src/payments.ts

import { sql } from '@vercel/postgres'

export const THRESHOLD_CENTS = 60000 // $600

export const PAYMENT_SOURCES: Record<PayeeType, PaymentSourceConfig> = {
  creator: {
    table: 'creator_balance_transactions',
    payeeIdColumn: 'creator_id',
    amountColumn: 'amount_cents',
    dateColumn: 'created_at',
    taxableTypes: ['commission_available', 'project_payment', 'bonus', 'adjustment']
  },
  contractor: {
    table: 'contractor_payments',
    payeeIdColumn: 'contractor_id',
    amountColumn: 'amount_cents',
    dateColumn: 'paid_at',
    taxableTypes: ['payment']
  },
  merchant: {
    table: 'merchant_transactions',
    payeeIdColumn: 'merchant_id',
    amountColumn: 'amount_cents',
    dateColumn: 'transaction_date',
    taxableTypes: ['sale']
  },
  vendor: {
    table: 'vendor_payments',
    payeeIdColumn: 'vendor_id',
    amountColumn: 'amount_cents',
    dateColumn: 'paid_at',
    taxableTypes: ['payment']
  }
}

export async function getAnnualPayments(
  payeeId: string,
  payeeType: PayeeType,
  taxYear: number
): Promise<number> {
  const config = PAYMENT_SOURCES[payeeType]

  const result = await sql.query(`
    SELECT COALESCE(SUM(${config.amountColumn}), 0) as total
    FROM ${config.table}
    WHERE ${config.payeeIdColumn} = $1
      AND type = ANY($2)
      AND EXTRACT(YEAR FROM ${config.dateColumn}) = $3
  `, [payeeId, config.taxableTypes, taxYear])

  return parseInt(result.rows[0].total)
}

export async function getPayeesRequiring1099(
  payeeType: PayeeType,
  taxYear: number
): Promise<Array<{ payeeId: string; totalCents: number }>> {
  const config = PAYMENT_SOURCES[payeeType]

  const result = await sql.query(`
    SELECT ${config.payeeIdColumn} as payee_id, SUM(${config.amountColumn}) as total
    FROM ${config.table}
    WHERE type = ANY($1)
      AND EXTRACT(YEAR FROM ${config.dateColumn}) = $2
    GROUP BY ${config.payeeIdColumn}
    HAVING SUM(${config.amountColumn}) >= $3
    ORDER BY total DESC
  `, [config.taxableTypes, taxYear, THRESHOLD_CENTS])

  return result.rows.map(r => ({
    payeeId: r.payee_id,
    totalCents: parseInt(r.total)
  }))
}

export async function getPayeesApproachingThreshold(
  payeeType: PayeeType,
  taxYear: number,
  minPercent: number = 50
): Promise<Array<{ payeeId: string; totalCents: number; percentOfThreshold: number }>> {
  const minCents = Math.floor(THRESHOLD_CENTS * (minPercent / 100))
  const config = PAYMENT_SOURCES[payeeType]

  const result = await sql.query(`
    SELECT ${config.payeeIdColumn} as payee_id, SUM(${config.amountColumn}) as total
    FROM ${config.table}
    WHERE type = ANY($1)
      AND EXTRACT(YEAR FROM ${config.dateColumn}) = $2
    GROUP BY ${config.payeeIdColumn}
    HAVING SUM(${config.amountColumn}) BETWEEN $3 AND $4
    ORDER BY total DESC
  `, [config.taxableTypes, taxYear, minCents, THRESHOLD_CENTS - 1])

  return result.rows.map(r => ({
    payeeId: r.payee_id,
    totalCents: parseInt(r.total),
    percentOfThreshold: Math.round((parseInt(r.total) / THRESHOLD_CENTS) * 100)
  }))
}
```

### 5. Form Generation

```typescript
// packages/tax/src/form-generation.ts

export function getPayerInfo(): PayerInfo {
  return {
    tin: process.env.TAX_PAYER_EIN!,
    name: process.env.TAX_PAYER_NAME!,
    address: {
      line1: process.env.TAX_PAYER_ADDRESS_LINE1!,
      line2: process.env.TAX_PAYER_ADDRESS_LINE2,
      city: process.env.TAX_PAYER_CITY!,
      state: process.env.TAX_PAYER_STATE!,
      postalCode: process.env.TAX_PAYER_ZIP!,
      country: 'US'
    }
  }
}

export async function generate1099(
  payeeId: string,
  payeeType: PayeeType,
  taxYear: number,
  generatedBy: string
): Promise<TaxForm> {
  // Get tax payee record (W-9 data)
  const taxPayee = await getTaxPayee(payeeId, payeeType)
  if (!taxPayee) {
    throw new Error(`No W-9 on file for ${payeeType} ${payeeId}`)
  }

  // Calculate annual payments
  const totalCents = await getAnnualPayments(payeeId, payeeType, taxYear)
  if (totalCents < THRESHOLD_CENTS) {
    throw new Error(`Below $600 threshold: $${(totalCents / 100).toFixed(2)}`)
  }

  // Determine form type
  const formType = getFormType(payeeType)

  // Generate form ID
  const formId = `1099_${randomBytes(12).toString('hex')}`

  // Create form record
  const form: TaxForm = {
    id: formId,
    payeeId,
    payeeType,
    taxYear,
    formType,
    payerTin: getPayerInfo().tin,
    payerName: getPayerInfo().name,
    payerAddress: getPayerInfo().address,
    recipientTinLastFour: taxPayee.tinLastFour,
    recipientName: taxPayee.legalName,
    recipientAddress: taxPayee.address,
    totalAmountCents: totalCents,
    boxAmounts: { box1: totalCents }, // 1099-NEC Box 1
    status: 'draft',
    createdAt: new Date(),
    createdBy: generatedBy
  }

  await insertTaxForm(form)
  await logTaxAction('form_created', form.id, payeeId, payeeType, generatedBy)

  return form
}

export async function bulkGenerate1099s(
  taxYear: number,
  payeeType: PayeeType,
  generatedBy: string
): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const qualifying = await getPayeesRequiring1099(payeeType, taxYear)

  let generated = 0
  let skipped = 0
  const errors: string[] = []

  for (const { payeeId, totalCents } of qualifying) {
    try {
      // Skip if form already exists
      const existing = await getTaxForm(payeeId, payeeType, taxYear)
      if (existing && existing.status !== 'voided') {
        skipped++
        continue
      }

      await generate1099(payeeId, payeeType, taxYear, generatedBy)
      generated++
    } catch (error) {
      errors.push(`${payeeType} ${payeeId}: ${error.message}`)
    }
  }

  return { generated, skipped, errors }
}

export async function approve1099(
  formId: string,
  approvedBy: string
): Promise<TaxForm> {
  const form = await getTaxFormById(formId)
  if (!form) throw new Error('Form not found')
  if (form.status !== 'draft' && form.status !== 'pending_review') {
    throw new Error(`Cannot approve form in ${form.status} status`)
  }

  await updateTaxFormStatus(formId, 'approved', {
    approvedAt: new Date(),
    approvedBy
  })

  await logTaxAction('form_approved', formId, form.payeeId, form.payeeType, approvedBy)

  return { ...form, status: 'approved', approvedAt: new Date(), approvedBy }
}

export async function void1099(
  formId: string,
  voidedBy: string,
  reason: string
): Promise<void> {
  const form = await getTaxFormById(formId)
  if (!form) throw new Error('Form not found')
  if (form.status === 'filed') {
    throw new Error('Cannot void filed form - create correction instead')
  }

  await updateTaxFormStatus(formId, 'voided')
  await logTaxAction('form_voided', formId, form.payeeId, form.payeeType, voidedBy, { reason })
}

function getFormType(payeeType: PayeeType): FormType {
  switch (payeeType) {
    case 'creator':
    case 'contractor':
      return '1099-NEC'
    case 'merchant':
      return '1099-K'
    case 'vendor':
      return '1099-MISC'
  }
}
```

### 6. IRS IRIS Filing

```typescript
// packages/tax/src/iris-filing.ts

export async function validateForFiling(
  taxYear: number,
  payeeType: PayeeType
): Promise<ValidationResult> {
  const forms = await getApprovedForms(taxYear, payeeType)
  const errors: string[] = []

  for (const form of forms) {
    const payee = await getTaxPayee(form.payeeId, form.payeeType)

    if (!payee) {
      errors.push(`${form.id}: No W-9 on file`)
      continue
    }

    if (!payee.w9CertifiedAt) {
      errors.push(`${form.id}: W-9 not certified`)
    }

    if (form.totalAmountCents < THRESHOLD_CENTS) {
      errors.push(`${form.id}: Below threshold ($${(form.totalAmountCents / 100).toFixed(2)})`)
    }
  }

  return {
    valid: errors.length === 0,
    formCount: forms.length,
    errors
  }
}

export async function generateIRISCSV(
  taxYear: number,
  payeeType: PayeeType
): Promise<{ csv: string; formIds: string[] }> {
  const forms = await getApprovedForms(taxYear, payeeType)
  const formIds: string[] = []
  const rows: string[] = []

  for (const form of forms) {
    const payee = await getTaxPayee(form.payeeId, form.payeeType)
    if (!payee) continue

    // Decrypt TIN for filing (with audit log)
    const tin = await getEncryptedTIN(form.payeeId, form.payeeType, 'system', 'IRIS CSV generation')

    // IRIS CSV format (simplified - actual format is more complex)
    rows.push([
      taxYear,
      form.formType,
      form.payerName,
      form.payerTin,
      payee.legalName,
      tin,
      (form.totalAmountCents / 100).toFixed(2)
    ].join(','))

    formIds.push(form.id)
  }

  const header = 'TaxYear,FormType,PayerName,PayerTIN,RecipientName,RecipientTIN,Amount'
  const csv = [header, ...rows].join('\n')

  return { csv, formIds }
}

export async function markFormsAsFiled(
  formIds: string[],
  filedBy: string,
  irisConfirmation: string
): Promise<void> {
  for (const formId of formIds) {
    await updateTaxFormStatus(formId, 'filed', {
      irsFiledAt: new Date(),
      irsConfirmationNumber: irisConfirmation
    })

    const form = await getTaxFormById(formId)
    await logTaxAction('form_filed', formId, form!.payeeId, form!.payeeType, filedBy, {
      irsConfirmationNumber: irisConfirmation
    })
  }
}
```

### 7. Corrections System

```typescript
// packages/tax/src/corrections.ts

export async function createAmountCorrection(
  originalFormId: string,
  newAmounts: Record<string, number>,
  reason: string,
  createdBy: string
): Promise<TaxForm> {
  const original = await getTaxFormById(originalFormId)
  if (!original) throw new Error('Original form not found')
  if (original.status !== 'filed') {
    throw new Error('Can only correct filed forms')
  }

  // Type 1: Same recipient, corrected amounts
  const correctionId = `1099_corr1_${randomBytes(12).toString('hex')}`

  const correction: TaxForm = {
    ...original,
    id: correctionId,
    boxAmounts: newAmounts,
    totalAmountCents: Object.values(newAmounts).reduce((a, b) => a + b, 0),
    status: 'draft',
    createdAt: new Date(),
    createdBy,
    originalFormId,
    correctionType: 'type1',
    approvedAt: undefined,
    approvedBy: undefined,
    irsFiledAt: undefined,
    irsConfirmationNumber: undefined
  }

  await insertTaxForm(correction)
  await logTaxAction('form_corrected', correctionId, original.payeeId, original.payeeType, createdBy, {
    originalFormId,
    correctionType: 'type1',
    reason
  })

  return correction
}

export async function createInfoCorrection(
  originalFormId: string,
  correctedInfo: Partial<W9Data>,
  reason: string,
  createdBy: string
): Promise<TaxForm> {
  const original = await getTaxFormById(originalFormId)
  if (!original) throw new Error('Original form not found')

  // Type 2: Voids original, issues corrected form
  // Step 1: Void original (marks with correction type)
  await updateTaxFormStatus(originalFormId, 'corrected')

  // Step 2: Create new form with corrected info
  const correctionId = `1099_corr2_${randomBytes(12).toString('hex')}`

  const correction: TaxForm = {
    ...original,
    id: correctionId,
    recipientName: correctedInfo.legalName || original.recipientName,
    recipientAddress: correctedInfo.address || original.recipientAddress,
    status: 'draft',
    createdAt: new Date(),
    createdBy,
    originalFormId,
    correctionType: 'type2'
  }

  await insertTaxForm(correction)
  await logTaxAction('form_corrected', correctionId, original.payeeId, original.payeeType, createdBy, {
    originalFormId,
    correctionType: 'type2',
    reason
  })

  return correction
}
```

### 8. Admin Tax Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/admin/tax` | Stats cards, compliance timeline |
| 1099 Forms | `/admin/tax/1099s` | List, filter, bulk actions |
| Form Detail | `/admin/tax/1099s/[id]` | View, approve, void, history |
| IRS Filing | `/admin/tax/filing` | Validate, generate CSV, mark filed |
| W-9 Status | `/admin/tax/w9-status` | Track W-9 completion, send reminders |
| Annual Payments | `/admin/tax/annual-payments` | Payment breakdown, CSV export |
| Settings | `/admin/tax/settings` | Payer info, delivery preferences |

### 9. W-9 Reminder Automation

```typescript
// apps/admin/src/trigger/w9-compliance-reminders.ts

export const w9ComplianceReminders = schedules.task({
  id: 'w9-compliance-reminders',
  cron: '0 9 * * *', // Daily at 9 AM
  run: async () => {
    const payeeTypes: PayeeType[] = ['creator', 'contractor', 'vendor']

    for (const payeeType of payeeTypes) {
      // Get payees with payments but no W-9
      const needsW9 = await getPayeesMissingW9(payeeType, getCurrentYear())

      for (const { payeeId } of needsW9) {
        const tracking = await getW9Tracking(payeeId, payeeType)

        if (!tracking) {
          // Initial request
          await sendW9Request(payeeId, payeeType, 'initial')
          await upsertW9Tracking(payeeId, payeeType, { initialSentAt: new Date() })
        } else if (!tracking.reminder1SentAt && daysSince(tracking.initialSentAt) >= 7) {
          // 7-day reminder
          await sendW9Request(payeeId, payeeType, 'reminder_1')
          await upsertW9Tracking(payeeId, payeeType, { reminder1SentAt: new Date() })
        } else if (!tracking.reminder2SentAt && daysSince(tracking.initialSentAt) >= 14) {
          // 14-day reminder (urgent)
          await sendW9Request(payeeId, payeeType, 'reminder_2')
          await upsertW9Tracking(payeeId, payeeType, { reminder2SentAt: new Date() })
        } else if (!tracking.finalNoticeSentAt && daysSince(tracking.initialSentAt) >= 21) {
          // 21-day final notice
          await sendW9Request(payeeId, payeeType, 'final_notice')
          await upsertW9Tracking(payeeId, payeeType, { finalNoticeSentAt: new Date() })
        }
      }
    }
  }
})
```

---

## Constraints

### Security
- TIN encrypted with AES-256-GCM, key from `TAX_TIN_ENCRYPTION_KEY` (64-char hex)
- Only last 4 digits stored in plaintext for display
- All TIN decryption logged with IP and user agent
- Audit trail immutable

### Compliance
- 1099-NEC required for payments ≥ $600/year
- Form status cannot go backwards (draft → approved → filed)
- Filed forms cannot be voided, only corrected
- Corrections must reference original form

### Multi-Tenant
- Tax payees indexed by (payee_id, payee_type)
- Forms unique per (payee_id, payee_type, tax_year, form_type)
- Payment aggregation across all brands for threshold calculation

### Payer Configuration
- All payer info from environment variables
- `TAX_PAYER_EIN`, `TAX_PAYER_NAME`, `TAX_PAYER_ADDRESS_*`

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Tax dashboard, W-9 form, 1099 viewer
- `obra/superpowers@test-driven-development` - TDD for tax calculations (critical for compliance)

**MCPs to consult:**
- Context7 MCP: "Node.js AES-256-GCM encryption patterns"
- Context7 MCP: "IRS 1099-NEC requirements 2025"
- Context7 MCP: "pdf-lib form generation"

**RAWDOG code to study:**
- `/src/lib/creator-portal/tax/` - Complete tax library
- `/src/app/admin/tax/` - Admin pages
- `/src/trigger/w9-compliance-reminders.ts` - Reminder automation

---

## AI Discretion Areas

1. **Encryption library**: node:crypto (shown) vs libsodium vs AWS KMS
2. **PDF library**: pdf-lib vs pdfkit vs react-pdf for 1099 generation
3. **IRIS CSV format**: Simplified vs full FIRE format
4. **Direct mail provider**: Lob vs Click2Mail vs other
5. **State filing integration**: Manual tracking vs automated per-state

---

## Tasks

### Week 1: Foundation

#### [PARALLEL] Types and Database
- [x] Define all types in `packages/tax/src/types.ts`
- [x] Create migration for `tax_payees` table
- [x] Create migration for `tax_forms` table
- [x] Create migration for `tax_form_audit_log` table
- [x] Create migration for `w9_compliance_tracking` table
- [x] Add all indexes

#### [PARALLEL with above] Encryption
- [x] Create `packages/tax/src/encryption.ts`
- [x] Implement `encryptTIN()` with AES-256-GCM
- [x] Implement `decryptTIN()` with auth tag verification
- [x] Implement `isValidSSN()` and `isValidEIN()`
- [x] Implement `maskTIN()` and `getLastFour()`

#### [SEQUENTIAL after encryption] W-9 Storage
- [x] Create `packages/tax/src/w9.ts`
- [x] Implement `saveW9()` with encrypted storage
- [x] Implement `getTaxPayee()` with decryption
- [x] Implement `hasCompleteTaxInfo()` check
- [x] Implement `getEncryptedTIN()` with audit logging

#### [SEQUENTIAL after W-9] Payment Aggregation
- [x] Create `packages/tax/src/payments.ts`
- [x] Define `PAYMENT_SOURCES` config per payee type
- [x] Implement `getAnnualPayments()`
- [x] Implement `getPayeesRequiring1099()`
- [x] Implement `getPayeesApproachingThreshold()`
- [x] Implement `getPayeesMissingW9()`
- [x] Implement `getTaxYearStats()` for dashboard

### Week 2: Forms and Admin

#### [SEQUENTIAL after payments] Form Generation
- [x] Create `packages/tax/src/form-generation.ts`
- [x] Implement `getPayerInfo()` from env
- [x] Implement `generate1099()` for single payee
- [x] Implement `bulkGenerate1099s()` for all qualifying
- [x] Implement `approve1099()` with status change
- [x] Implement `void1099()` for draft forms
- [x] Implement `bulkApprove1099s()`

#### [PARALLEL with generation] PDF Generation
- [x] Create `packages/tax/src/pdf-generation.ts`
- [x] Implement `generate1099NECPDF()` layout
- [x] Store PDF in secure storage
- [x] Implement PDF caching

#### [SEQUENTIAL after generation] IRIS Filing
- [x] Create `packages/tax/src/iris-filing.ts`
- [x] Implement `validateForFiling()` pre-checks
- [x] Implement `generateIRISCSV()` export
- [x] Implement `markFormsAsFiled()` status update
- [x] Implement `getFilingStats()` for dashboard

#### [PARALLEL with IRIS] Corrections
- [x] Create `packages/tax/src/corrections.ts`
- [x] Implement `createAmountCorrection()` (Type 1)
- [x] Implement `createInfoCorrection()` (Type 2)
- [x] Implement correction approval flow

#### [SEQUENTIAL after all lib] Admin Pages
- [x] Build `/admin/tax` dashboard with stats
- [x] Build `/admin/tax/1099s` list page
- [x] Build `/admin/tax/1099s/[id]` detail page
- [x] Build `/admin/tax/filing` IRS workflow
- [x] Build `/admin/tax/w9-status` tracking page
- [x] Build `/admin/tax/annual-payments` with CSV export
- [x] Build `/admin/tax/settings` payer config

#### [SEQUENTIAL after admin] Automation
- [x] Create W-9 reminder scheduled task (via Phase 5E jobs)
- [x] Implement 4-level escalation cadence
- [x] Create confirmation email on W-9 completion

#### [SEQUENTIAL after all] Creator Portal
- [x] Build W-9 collection form in creator portal
- [x] Build 1099 viewing/download in creator portal
- [x] E-delivery consent capture

---

## Definition of Done

- [x] All type definitions complete
- [x] Database schema migrated
- [x] TIN encryption/decryption working with audit
- [x] W-9 collection captures all fields
- [x] Payment aggregation correctly calculates thresholds
- [x] 1099 generation for all payee types
- [x] Form approval/voiding workflow complete
- [x] IRIS CSV generation working
- [x] Corrections (Type 1 & Type 2) working
- [x] Admin dashboard shows accurate stats
- [x] All admin pages functional
- [x] W-9 reminder automation running (via Phase 5E jobs)
- [x] Creator portal shows tax forms
- [x] `npx tsc --noEmit` passes
- [x] Unit tests for all calculations
- [x] E2E test for full tax flow

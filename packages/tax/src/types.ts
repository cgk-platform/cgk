/**
 * Tax compliance type definitions
 *
 * @ai-pattern tax-compliance
 * @ai-required Use these types for all tax operations
 */

// ============================================================================
// Core Enums
// ============================================================================

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

export type DeliveryMethod = 'email' | 'portal' | 'mail'

export type CorrectionType = 'type1' | 'type2'

export type W9Status = 'not_submitted' | 'pending_review' | 'approved' | 'rejected' | 'expired'

export type ReminderLevel = 'initial' | 'reminder_1' | 'reminder_2' | 'final_notice'

// ============================================================================
// Core Interfaces
// ============================================================================

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface W9Data {
  payeeId: string
  payeeType: PayeeType
  legalName: string
  businessName?: string
  taxClassification: TaxClassification
  address: Address
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
  w9CertifiedIp?: string
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

  // Payer info
  payerTin: string
  payerName: string
  payerAddress: Address

  // Recipient info
  recipientTinLastFour: string
  recipientName: string
  recipientAddress: Address

  // Amounts
  totalAmountCents: number
  boxAmounts: Record<string, number>

  // Status workflow
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
  deliveryMethod?: DeliveryMethod
  deliveredAt?: Date
  deliveryConfirmedAt?: Date
  mailLetterId?: string
  mailStatus?: string

  // Corrections
  originalFormId?: string
  correctionType?: CorrectionType
}

export interface TaxFormAuditLog {
  id: string
  taxFormId?: string
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

export interface W9ComplianceTracking {
  id: string
  payeeId: string
  payeeType: PayeeType
  initialSentAt?: Date
  reminder1SentAt?: Date
  reminder2SentAt?: Date
  finalNoticeSentAt?: Date
  completedAt?: Date
  flaggedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TaxReminder {
  id: string
  title: string
  description?: string
  dueDate: Date
  priority: 'low' | 'medium' | 'high'
  category?: string
  recurring: boolean
  recurrenceRule?: string
  status: 'pending' | 'completed' | 'dismissed'
  dismissedAt?: Date
  completedAt?: Date
  createdAt: Date
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface PayerInfo {
  tin: string
  name: string
  address: Address
}

export interface PaymentSourceConfig {
  table: string
  payeeIdColumn: string
  amountColumn: string
  dateColumn: string
  taxableTypes: string[]
}

// ============================================================================
// Stats and Report Interfaces
// ============================================================================

export interface TaxYearStats {
  taxYear: number
  totalPayees: number
  w9ApprovedCount: number
  w9PendingCount: number
  w9MissingCount: number
  requires1099Count: number
  approachingThresholdCount: number
  formsGeneratedCount: number
  formsApprovedCount: number
  formsFiledCount: number
  formsDeliveredCount: number
  totalReportableCents: number
}

export interface PayeePaymentSummary {
  payeeId: string
  payeeType: PayeeType
  totalCents: number
  percentOfThreshold: number
  hasW9: boolean
  w9Status?: W9Status
  formStatus?: FormStatus
}

export interface ValidationResult {
  valid: boolean
  formCount: number
  errors: string[]
}

export interface BulkGenerationResult {
  generated: number
  skipped: number
  errors: string[]
}

// ============================================================================
// Constants
// ============================================================================

export const THRESHOLD_CENTS = 60000 // $600

export const TAX_CLASSIFICATIONS: TaxClassification[] = [
  'individual',
  'sole_proprietor',
  'partnership',
  's_corporation',
  'c_corporation',
  'llc_single_member',
  'llc_partnership',
  'llc_c_corp',
  'llc_s_corp',
  'nonprofit',
  'government',
  'indian_tribal',
  'other',
]

export const TAX_CLASSIFICATION_LABELS: Record<TaxClassification, string> = {
  individual: 'Individual/Sole Proprietor',
  sole_proprietor: 'Sole Proprietor',
  partnership: 'Partnership',
  s_corporation: 'S Corporation',
  c_corporation: 'C Corporation',
  llc_single_member: 'LLC (Single Member)',
  llc_partnership: 'LLC (Partnership)',
  llc_c_corp: 'LLC (C Corporation)',
  llc_s_corp: 'LLC (S Corporation)',
  nonprofit: 'Non-Profit Organization',
  government: 'Government Entity',
  indian_tribal: 'Indian Tribal Entity',
  other: 'Other',
}

export const PAYEE_TYPE_FORM_MAP: Record<PayeeType, FormType> = {
  creator: '1099-NEC',
  contractor: '1099-NEC',
  merchant: '1099-K',
  vendor: '1099-MISC',
}

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  filed: 'Filed with IRS',
  corrected: 'Corrected',
  voided: 'Voided',
}

export const W9_STATUS_LABELS: Record<W9Status, string> = {
  not_submitted: 'Not Submitted',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
}

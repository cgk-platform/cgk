/**
 * Contractor Payment Types
 *
 * Types for contractor payment processing, invoices, payout methods,
 * withdrawals, and tax compliance.
 */

// ============================================================================
// Payout Method Types
// ============================================================================

export type PayoutMethodType =
  | 'stripe_connect'
  | 'stripe_connect_standard'
  | 'paypal'
  | 'venmo'
  | 'check'

export type PayoutMethodStatus = 'active' | 'pending' | 'disabled' | 'requires_action'

export type StripeAccountStatus =
  | 'pending'
  | 'restricted'
  | 'restricted_soon'
  | 'enabled'
  | 'complete'
  | 'rejected'

export interface StripeRequirementError {
  code: string
  reason: string
  requirement: string
}

export interface PayoutMethod {
  id: string
  payeeId: string
  tenantId: string
  type: PayoutMethodType
  isDefault: boolean
  status: PayoutMethodStatus

  // Stripe Connect fields
  stripeAccountId: string | null
  stripeAccountStatus: StripeAccountStatus | null
  stripeOnboardingComplete: boolean
  stripePayoutsEnabled: boolean
  stripeChargesEnabled: boolean
  stripeDetailsSubmitted: boolean
  stripeCapabilities: Record<string, string> | null
  stripeRequirementsDue: string[]
  stripeRequirementsErrors: StripeRequirementError[]
  stripeAccessToken: string | null
  stripeRefreshToken: string | null
  accountCountry: string | null
  accountCurrency: string | null

  // Alternative method fields
  paypalEmail: string | null
  venmoHandle: string | null
  checkAddress: CheckAddress | null
  bankName: string | null
  accountLastFour: string | null

  verificationStatus: 'verified' | 'pending' | 'failed' | null
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CheckAddress {
  name: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
}

// ============================================================================
// Balance & Transaction Types
// ============================================================================

export interface PayeeBalance {
  payeeId: string
  tenantId: string
  pendingCents: number // Awaiting approval
  availableCents: number // Can withdraw
  paidCents: number // Lifetime total
  lastUpdatedAt: Date
}

export type BalanceTransactionType =
  | 'payment_request_approved'
  | 'payment_request_rejected'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_failed'
  | 'adjustment'
  | 'refund'

export interface BalanceTransaction {
  id: string
  payeeId: string
  tenantId: string
  type: BalanceTransactionType
  amountCents: number
  balanceAfterCents: number
  description: string
  referenceType: 'payment_request' | 'withdrawal' | 'adjustment' | null
  referenceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

// ============================================================================
// Payment Request (Invoice) Types
// ============================================================================

export type PaymentRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paid'

export type WorkType =
  | 'contract_work'
  | 'consulting'
  | 'project_delivery'
  | 'maintenance'
  | 'event'
  | 'other'

export interface PaymentRequestAttachment {
  id: string
  url: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: Date
}

export interface PaymentRequest {
  id: string
  payeeId: string
  tenantId: string
  amountCents: number
  description: string
  workType: WorkType
  projectId: string | null
  attachments: PaymentRequestAttachment[]
  status: PaymentRequestStatus
  adminNotes: string | null
  approvedAmountCents: number | null
  approvedBy: string | null
  rejectionReason: string | null
  createdAt: Date
  reviewedAt: Date | null
  paidAt: Date | null
}

export const PAYMENT_REQUEST_RULES = {
  minAmountCents: 1000, // $10 minimum
  minDescriptionLength: 10,
  maxPendingRequests: 3,
  allowedWorkTypes: [
    'contract_work',
    'consulting',
    'project_delivery',
    'maintenance',
    'event',
    'other',
  ] as const,
} as const

// ============================================================================
// Withdrawal Types
// ============================================================================

export type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface WithdrawalRequest {
  id: string
  payeeId: string
  tenantId: string
  amountCents: number
  payoutMethodId: string
  payoutMethod: PayoutMethod | null
  status: WithdrawalStatus
  processedAt: Date | null
  failureReason: string | null
  externalTransferId: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Tax Types
// ============================================================================

export type TaxEntityType =
  | 'individual'
  | 'llc'
  | 's_corp'
  | 'c_corp'
  | 'partnership'
  | 'sole_proprietor'

export interface W9Info {
  payeeId: string
  tenantId: string
  country: string
  taxIdType: 'ssn' | 'ein'
  taxIdLast4: string
  taxIdEncrypted: string // AES-256-GCM encrypted
  legalName: string
  businessName: string | null
  entityType: TaxEntityType
  address: CheckAddress
  signedAt: Date
  signedBy: string
  ipAddress: string | null
}

export interface TaxForm {
  id: string
  payeeId: string
  tenantId: string
  formType: '1099-nec' | '1099-misc'
  taxYear: number
  totalAmountCents: number
  status: 'draft' | 'generated' | 'filed' | 'corrected'
  fileUrl: string | null
  generatedAt: Date | null
  filedAt: Date | null
  createdAt: Date
}

// ============================================================================
// Stripe Connect Onboarding Types
// ============================================================================

export type StripeBusinessType = 'individual' | 'company'

export interface StripeOnboardingStep1 {
  businessType: StripeBusinessType
  country: string
}

export interface StripeOnboardingStep2Individual {
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: {
    day: number
    month: number
    year: number
  }
}

export interface StripeOnboardingStep2Company {
  companyName: string
  companyPhone: string
  taxId: string
}

export type StripeOnboardingStep2 =
  | StripeOnboardingStep2Individual
  | StripeOnboardingStep2Company

export interface StripeOnboardingStep3 {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface StripeOnboardingStep4US {
  ssn: string
}

export interface StripeOnboardingStep4International {
  nationalId?: string
  cpf?: string // Brazil
  ssnLast4?: string
}

export type StripeOnboardingStep4 =
  | StripeOnboardingStep4US
  | StripeOnboardingStep4International

export interface StripeOnboardingProgress {
  payeeId: string
  tenantId: string
  stripeAccountId: string | null
  currentStep: 1 | 2 | 3 | 4 | 5
  step1Data: StripeOnboardingStep1 | null
  step2Data: StripeOnboardingStep2 | null
  step3Data: StripeOnboardingStep3 | null
  step4Completed: boolean
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Country Specifications
// ============================================================================

export interface CountrySpec {
  code: string
  name: string
  supportedCurrencies: string[]
  defaultCurrency: string
  supportedBusinessTypes: StripeBusinessType[]
  requiresFullSSN?: boolean
  requiresCPF?: boolean
  requiresNationalId?: boolean
  requiresIdentityVerification: boolean
  identityDocumentTypes?: string[]
}

export const SUPPORTED_COUNTRIES: CountrySpec[] = [
  {
    code: 'US',
    name: 'United States',
    supportedCurrencies: ['usd'],
    defaultCurrency: 'usd',
    supportedBusinessTypes: ['individual', 'company'],
    requiresFullSSN: true,
    requiresIdentityVerification: true,
  },
  {
    code: 'CA',
    name: 'Canada',
    supportedCurrencies: ['cad', 'usd'],
    defaultCurrency: 'cad',
    supportedBusinessTypes: ['individual', 'company'],
    requiresNationalId: true,
    requiresIdentityVerification: true,
    identityDocumentTypes: ['sin'],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    supportedCurrencies: ['gbp', 'eur', 'usd'],
    defaultCurrency: 'gbp',
    supportedBusinessTypes: ['individual', 'company'],
    requiresNationalId: true,
    requiresIdentityVerification: true,
    identityDocumentTypes: ['national_insurance_number'],
  },
  {
    code: 'AU',
    name: 'Australia',
    supportedCurrencies: ['aud', 'usd'],
    defaultCurrency: 'aud',
    supportedBusinessTypes: ['individual', 'company'],
    requiresNationalId: true,
    requiresIdentityVerification: true,
    identityDocumentTypes: ['tfn'],
  },
  {
    code: 'BR',
    name: 'Brazil',
    supportedCurrencies: ['brl'],
    defaultCurrency: 'brl',
    supportedBusinessTypes: ['individual', 'company'],
    requiresCPF: true,
    requiresIdentityVerification: true,
  },
  {
    code: 'DE',
    name: 'Germany',
    supportedCurrencies: ['eur'],
    defaultCurrency: 'eur',
    supportedBusinessTypes: ['individual', 'company'],
    requiresNationalId: true,
    requiresIdentityVerification: true,
  },
  {
    code: 'FR',
    name: 'France',
    supportedCurrencies: ['eur'],
    defaultCurrency: 'eur',
    supportedBusinessTypes: ['individual', 'company'],
    requiresNationalId: true,
    requiresIdentityVerification: true,
  },
]

export function getCountrySpec(countryCode: string): CountrySpec | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.code === countryCode)
}

export function isCountrySupported(countryCode: string): boolean {
  return SUPPORTED_COUNTRIES.some((c) => c.code === countryCode)
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreatePaymentRequestInput {
  amountCents: number
  description: string
  workType: WorkType
  projectId?: string
  attachmentIds?: string[]
}

export interface CreateWithdrawalInput {
  amountCents: number
  payoutMethodId: string
}

export interface AddPayoutMethodInput {
  type: Exclude<PayoutMethodType, 'stripe_connect' | 'stripe_connect_standard'>
  paypalEmail?: string
  venmoHandle?: string
  checkAddress?: CheckAddress
  setAsDefault?: boolean
}

export interface UpdatePayoutMethodInput {
  isDefault?: boolean
  paypalEmail?: string
  venmoHandle?: string
  checkAddress?: CheckAddress
}

export interface SubmitW9Input {
  taxIdType: 'ssn' | 'ein'
  taxId: string
  legalName: string
  businessName?: string
  entityType: TaxEntityType
  address: CheckAddress
  signature: string // Base64 signature or typed name
}

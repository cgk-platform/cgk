/**
 * Payout Types
 *
 * Types for creator payouts via Stripe Connect and Wise Business
 */

/**
 * Payout provider names
 */
export type PayoutProviderName = 'stripe' | 'wise'

/**
 * Payout request (input for executing a payout)
 */
export interface PayoutRequest {
  /** Amount in cents */
  amountCents: number
  /** Currency code (e.g., 'USD', 'EUR') */
  currency: string
  /** ISO country code of recipient */
  country: string
  /** Creator ID for reference */
  creatorId: string
  /** Unique reference ID for idempotency */
  referenceId: string
  /** Recipient's payment method ID */
  paymentMethodId?: string
  /** Optional metadata */
  metadata?: Record<string, string>
}

/**
 * Payout result (output from executing a payout)
 */
export interface PayoutResult {
  /** Whether the payout was successful */
  success: boolean
  /** Which provider was used */
  provider: PayoutProviderName
  /** External transfer/payout ID from the provider */
  transferId?: string
  /** Estimated arrival date */
  estimatedArrival?: Date
  /** Actual amount sent (may differ due to fees) */
  amountSent?: number
  /** Currency sent */
  currency?: string
  /** Fee charged */
  feeCents?: number
  /** Error message if failed */
  error?: string
  /** Error code if failed */
  errorCode?: string
}

/**
 * Payout provider interface
 */
export interface PayoutProvider {
  /** Provider name */
  readonly name: PayoutProviderName

  /**
   * Create a payout account for a creator
   * @param params Account creation parameters
   */
  createAccount(params: CreateAccountParams): Promise<CreateAccountResult>

  /**
   * Get account onboarding status
   * @param accountId External account ID
   */
  getAccountStatus(accountId: string): Promise<AccountStatus>

  /**
   * Create a payout to the account
   * @param request Payout request
   */
  createPayout(request: PayoutRequest): Promise<PayoutResult>

  /**
   * Get payout status
   * @param transferId External transfer ID
   */
  getPayoutStatus(transferId: string): Promise<PayoutStatusResult>

  /**
   * Cancel a pending payout
   * @param transferId External transfer ID
   */
  cancelPayout(transferId: string): Promise<boolean>
}

/**
 * Parameters for creating a payout account
 */
export interface CreateAccountParams {
  /** Creator ID */
  creatorId: string
  /** Email address */
  email: string
  /** ISO country code */
  country: string
  /** Account type for Stripe */
  accountType?: 'express' | 'standard'
  /** Business type */
  businessType?: 'individual' | 'company'
  /** Return URL after onboarding */
  returnUrl?: string
  /** Refresh URL for incomplete onboarding */
  refreshUrl?: string
}

/**
 * Result of creating a payout account
 */
export interface CreateAccountResult {
  /** Whether creation was successful */
  success: boolean
  /** External account ID */
  accountId?: string
  /** Onboarding URL (for Stripe Connect) */
  onboardingUrl?: string
  /** Whether onboarding is required */
  requiresOnboarding: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Account status
 */
export interface AccountStatus {
  /** External account ID */
  accountId: string
  /** Whether the account is active */
  isActive: boolean
  /** Whether charges are enabled (Stripe) */
  chargesEnabled: boolean
  /** Whether payouts are enabled */
  payoutsEnabled: boolean
  /** Whether onboarding is complete */
  onboardingComplete: boolean
  /** Country */
  country?: string
  /** Default currency */
  defaultCurrency?: string
  /** Requirements that need to be fulfilled */
  pendingRequirements?: string[]
  /** Details submitted flag */
  detailsSubmitted?: boolean
}

/**
 * Payout status result
 */
export interface PayoutStatusResult {
  /** Transfer ID */
  transferId: string
  /** Status string */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  /** Amount in cents */
  amountCents: number
  /** Currency */
  currency: string
  /** Estimated or actual arrival */
  arrivalDate?: Date
  /** Failure reason if failed */
  failureReason?: string
  /** Raw provider data */
  rawData?: unknown
}

/**
 * Supported countries for Wise payouts
 */
export const WISE_SUPPORTED_COUNTRIES = [
  // Europe
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO',
  // Asia Pacific
  'AU', 'NZ', 'JP', 'SG', 'HK', 'MY', 'PH', 'TH', 'ID', 'VN',
  'IN', 'BD', 'LK', 'PK', 'NP',
  // Americas (excluding US - use Stripe)
  'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE',
  // Middle East & Africa
  'AE', 'IL', 'ZA', 'KE', 'NG', 'GH', 'MA', 'EG',
] as const

export type WiseSupportedCountry = (typeof WISE_SUPPORTED_COUNTRIES)[number]

/**
 * Check if a country is supported by Wise
 */
export function isWiseSupportedCountry(country: string): country is WiseSupportedCountry {
  return WISE_SUPPORTED_COUNTRIES.includes(country as WiseSupportedCountry)
}

/**
 * Countries that require Stripe Standard accounts (OAuth flow)
 */
export const STRIPE_STANDARD_REQUIRED_COUNTRIES = [
  'BR', // Brazil
] as const

/**
 * Check if country requires Stripe Standard account
 */
export function requiresStripeStandardAccount(country: string): boolean {
  return STRIPE_STANDARD_REQUIRED_COUNTRIES.includes(
    country as (typeof STRIPE_STANDARD_REQUIRED_COUNTRIES)[number]
  )
}

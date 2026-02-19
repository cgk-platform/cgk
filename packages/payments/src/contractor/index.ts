/**
 * Contractor Payment Module
 *
 * Exports all contractor payment functionality including:
 * - Balance and transaction tracking
 * - Payment request (invoice) management
 * - Payout method management
 * - Withdrawal requests
 * - Tax info (W-9) and forms (1099)
 * - Stripe Connect integration
 */

// Types
export * from './types'

// Balance functions
export {
  getPayeeBalance,
  getBalanceTransactions,
  recordBalanceTransaction,
} from './balance'

// Payment request functions
export {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestById,
  getPendingRequestCount,
  createPaymentAttachment,
  PaymentRequestError,
} from './payment-request'

// Payout method functions
export {
  getPayoutMethods,
  getPayoutMethodById,
  getDefaultPayoutMethod,
  addPayoutMethod,
  updatePayoutMethod,
  removePayoutMethod,
  upsertStripeConnectMethod,
  PayoutMethodError,
} from './payout-methods'

// Withdrawal functions
export {
  createWithdrawalRequest,
  getWithdrawalRequests,
  getWithdrawalById,
  cancelWithdrawal,
  WithdrawalError,
} from './withdrawal'

// Tax functions
export {
  requiresW9,
  getTaxInfo,
  submitW9,
  getTaxForms,
  getTaxFormById,
  getW9Status,
  decryptTaxId,
  TaxError,
} from './tax'

// Stripe Connect functions
export {
  getStripeOAuthUrl,
  handleStripeOAuthCallback,
  createStripeAccount,
  updateStripeAccountStep2,
  updateStripeAccountStep3,
  updateStripeAccountStep4,
  syncStripeAccountStatus,
  getOnboardingProgress,
  getAvailableCountries,
  createStripeOAuthState,
  validateStripeOAuthState,
  StripeConnectError,
} from './stripe-connect'

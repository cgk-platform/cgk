/**
 * @cgk/payments - Stripe and Wise payment abstraction
 *
 * @ai-pattern payments-abstraction
 * @ai-note Unified interface for payment providers
 */

// Stripe integration
export { createStripeClient, type StripeClient } from './stripe'
export type {
  StripePaymentIntent,
  StripeCustomer,
  StripeSubscription,
  StripePrice,
  StripeWebhookEvent,
} from './stripe/types'

// Wise integration
export { createWiseClient, type WiseClient } from './wise'
export type { WiseTransfer, WiseRecipient, WiseQuote } from './wise/types'

// Unified payment interface
export { createPaymentProvider, type PaymentProvider } from './provider'
export type {
  PaymentIntent,
  PaymentMethod,
  PaymentResult,
  RefundResult,
} from './types'

// Webhooks
export { verifyStripeWebhook, verifyWiseWebhook } from './webhooks'

// ============================================================
// PAYOUT SYSTEM (Creator Payments)
// ============================================================

// Payout orchestration
export {
  createPayoutOrchestrator,
  getPayoutOrchestrator,
  resetPayoutOrchestrator,
  executePayout,
  selectProvider,
  WISE_SUPPORTED_COUNTRIES,
  STRIPE_STANDARD_REQUIRED_COUNTRIES,
  isWiseSupportedCountry,
  requiresStripeStandardAccount,
} from './payout'

export type {
  PayoutOrchestrator,
  PayoutOrchestratorConfig,
  PayoutProvider,
  PayoutProviderName,
  PayoutRequest,
  PayoutResult,
  CreateAccountParams,
  CreateAccountResult,
  AccountStatus,
  PayoutStatusResult,
  ProviderSelectionCriteria,
  WiseSupportedCountry,
} from './payout'

// Stripe Connect provider
export {
  createStripeConnectProvider,
  createStripeAccountLink,
  completeStripeOAuth,
  createStripeDashboardLink,
} from './payout'
export type { StripeConnectConfig } from './payout'

// Wise Business provider
export {
  createWiseBusinessProvider,
  createWiseRecipient,
  getWiseAccountRequirements,
} from './payout'
export type { WiseBusinessConfig } from './payout'

// ============================================================
// BALANCE SYSTEM
// ============================================================

export {
  getCreatorBalance,
  getEarningsBreakdown,
  getUpcomingMaturations,
  recordBalanceTransaction,
  recordPendingCommission,
  maturePendingCommissions,
  listBalanceTransactions,
  calculateStoreCreditBonus,
  COMMISSION_HOLD_DAYS,
  MINIMUM_WITHDRAWAL_CENTS,
  STORE_CREDIT_BONUS_PERCENT,
} from './balance'

export type {
  CreatorBalance,
  BrandBalance,
  EarningsBreakdown,
  UpcomingMaturation,
  BalanceTransaction,
  RecordTransactionParams,
  TransactionListFilters,
  TransactionListResult,
  BalanceTransactionType,
} from './balance'

// ============================================================
// WITHDRAWAL SYSTEM
// ============================================================

export {
  getWithdrawalRequest,
  getActiveWithdrawal,
  hasPendingWithdrawal,
  getCreatorWithdrawalStatus,
  getWithdrawalBlockingStatus,
  validateWithdrawal,
  requestWithdrawal,
  updateWithdrawalStatus,
  listWithdrawalRequests,
} from './withdrawal'

export type {
  WithdrawalRequest,
  WithdrawalStatus,
  PayoutType,
  CreateWithdrawalParams,
  WithdrawalValidationResult,
  WithdrawalErrorCode,
  WithdrawalBlockingStatus,
  WithdrawalBlocker,
  CreatorWithdrawalStatus,
} from './withdrawal'

// ============================================================
// CONTRACTOR PAYMENT SYSTEM
// ============================================================

// Contractor balance and transactions
export {
  getPayeeBalance,
  getBalanceTransactions,
  recordBalanceTransaction as recordContractorTransaction,
} from './contractor'

export type {
  PayeeBalance,
  BalanceTransaction as ContractorBalanceTransaction,
  BalanceTransactionType as ContractorTransactionType,
} from './contractor'

// Contractor payment requests (invoices)
export {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestById,
  getPendingRequestCount,
  createPaymentAttachment,
  PaymentRequestError,
} from './contractor'

export type {
  PaymentRequest,
  PaymentRequestStatus,
  PaymentRequestAttachment,
  WorkType,
  CreatePaymentRequestInput,
} from './contractor'

// Contractor payout methods
export {
  getPayoutMethods,
  getPayoutMethodById,
  getDefaultPayoutMethod,
  addPayoutMethod,
  updatePayoutMethod,
  removePayoutMethod,
  upsertStripeConnectMethod,
  PayoutMethodError,
} from './contractor'

export type {
  PayoutMethod as ContractorPayoutMethod,
  PayoutMethodType,
  PayoutMethodStatus,
  CheckAddress,
  AddPayoutMethodInput,
  UpdatePayoutMethodInput,
} from './contractor'

// Contractor withdrawals
export {
  createWithdrawalRequest as createContractorWithdrawal,
  getWithdrawalRequests as getContractorWithdrawals,
  getWithdrawalById as getContractorWithdrawalById,
  cancelWithdrawal,
  WithdrawalError,
} from './contractor'

export type {
  WithdrawalRequest as ContractorWithdrawalRequest,
  WithdrawalStatus as ContractorWithdrawalStatus,
  CreateWithdrawalInput,
} from './contractor'

// Contractor tax info
export {
  requiresW9,
  getTaxInfo,
  submitW9,
  getTaxForms,
  getTaxFormById,
  getW9Status,
  decryptTaxId,
  TaxError,
} from './contractor'

export type {
  W9Info,
  TaxForm,
  TaxEntityType,
  SubmitW9Input,
} from './contractor'

// Contractor Stripe Connect
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
  StripeConnectError,
} from './contractor'

export type {
  StripeOnboardingProgress,
  StripeOnboardingStep1,
  StripeOnboardingStep2,
  StripeOnboardingStep3,
  StripeBusinessType,
  StripeAccountStatus,
  StripeRequirementError,
  CountrySpec,
} from './contractor'

export { PAYMENT_REQUEST_RULES, SUPPORTED_COUNTRIES } from './contractor'

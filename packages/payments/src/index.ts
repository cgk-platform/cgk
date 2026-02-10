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

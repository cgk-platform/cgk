/**
 * Stripe client
 */

import Stripe from 'stripe'

export interface StripeClient {
  readonly stripe: Stripe

  createPaymentIntent(params: Stripe.PaymentIntentCreateParams): Promise<Stripe.PaymentIntent>
  retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent>
  confirmPaymentIntent(id: string): Promise<Stripe.PaymentIntent>
  cancelPaymentIntent(id: string): Promise<Stripe.PaymentIntent>

  createCustomer(params: Stripe.CustomerCreateParams): Promise<Stripe.Customer>
  retrieveCustomer(id: string): Promise<Stripe.Customer>

  createRefund(params: Stripe.RefundCreateParams): Promise<Stripe.Refund>
}

export interface StripeConfig {
  secretKey: string
  apiVersion?: Stripe.LatestApiVersion
}

/**
 * Create a Stripe client
 */
export function createStripeClient(config: StripeConfig): StripeClient {
  const stripe = new Stripe(config.secretKey, {
    apiVersion: config.apiVersion ?? '2025-02-24.acacia',
  })

  return {
    stripe,

    createPaymentIntent: (params) => stripe.paymentIntents.create(params),
    retrievePaymentIntent: (id) => stripe.paymentIntents.retrieve(id),
    confirmPaymentIntent: (id) => stripe.paymentIntents.confirm(id),
    cancelPaymentIntent: (id) => stripe.paymentIntents.cancel(id),

    createCustomer: (params) => stripe.customers.create(params),
    retrieveCustomer: (id) => stripe.customers.retrieve(id) as Promise<Stripe.Customer>,

    createRefund: (params) => stripe.refunds.create(params),
  }
}

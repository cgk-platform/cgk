/**
 * Stripe types re-exports
 */

import type Stripe from 'stripe'

export type StripePaymentIntent = Stripe.PaymentIntent
export type StripeCustomer = Stripe.Customer
export type StripeSubscription = Stripe.Subscription
export type StripePrice = Stripe.Price
export type StripeWebhookEvent = Stripe.Event

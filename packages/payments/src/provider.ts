/**
 * Unified payment provider interface
 *
 * This provides a common interface for payment operations across different providers.
 * For most use cases, prefer using the provider-specific implementations directly:
 * - `createStripeProvider(config)` from './providers/stripe'
 * - `createWiseProvider(config)` from './providers/wise'
 *
 * The unified interface is useful when you need to switch providers dynamically
 * based on tenant configuration or feature flags.
 */

import type { PaymentIntent, PaymentResult, RefundResult } from './types.js'
import { createStripeProvider, type StripeProviderConfig } from './providers/stripe.js'

export interface PaymentProvider {
  readonly provider: 'stripe' | 'wise'

  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentResult>
  confirmPaymentIntent(intentId: string): Promise<PaymentResult>
  cancelPaymentIntent(intentId: string): Promise<PaymentResult>
  refundPayment(intentId: string, amount?: number): Promise<RefundResult>
  getPaymentIntent(intentId: string): Promise<PaymentIntent | null>
}

export interface CreatePaymentIntentParams {
  amount: number
  currency: string
  customerId?: string
  metadata?: Record<string, string>
  description?: string
}

/**
 * Configuration for creating a unified payment provider
 */
export interface UnifiedPaymentProviderConfig {
  provider: 'stripe' | 'wise'
  /** Tenant ID for credential lookup (required for tenant-owned credentials) */
  tenantId: string
  /** Platform fee percentage for payouts (0-100) */
  platformFeePercent?: number
}

/**
 * Create a unified payment provider for a tenant
 *
 * Routes to the appropriate provider implementation based on the provider type.
 * Credentials are loaded from the tenant's integration configuration.
 *
 * @example
 * ```typescript
 * const payments = createPaymentProvider({
 *   provider: 'stripe',
 *   tenantId: 'rawdog',
 * })
 *
 * const result = await payments.createPaymentIntent({
 *   amount: 2999, // $29.99 in cents
 *   currency: 'usd',
 * })
 * ```
 */
export function createPaymentProvider(config: UnifiedPaymentProviderConfig): PaymentProvider {
  switch (config.provider) {
    case 'stripe': {
      const stripeConfig: StripeProviderConfig = {
        tenantId: config.tenantId,
        platformFeePercent: config.platformFeePercent,
      }
      return createStripeProvider(stripeConfig)
    }

    case 'wise': {
      // Wise is primarily used for international payouts, not standard payment intents.
      // For PaymentProvider interface operations (payment intents), use Stripe.
      // For payouts to creators/contractors, use WiseProvider directly:
      //   import { createWiseProvider } from './providers/wise'
      throw new Error(
        'Wise does not support payment intents. Use WiseProvider directly for international payouts.'
      )
    }

    default:
      throw new Error(`Unknown payment provider: ${config.provider}`)
  }
}

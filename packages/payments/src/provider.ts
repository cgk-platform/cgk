/**
 * Unified payment provider interface
 */

import type { PaymentIntent, PaymentResult, RefundResult, PaymentProviderConfig } from './types'

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
 * Create a unified payment provider
 */
export function createPaymentProvider(config: PaymentProviderConfig): PaymentProvider {
  // TODO: Implement provider-specific logic
  return {
    provider: config.provider,

    async createPaymentIntent(_params) {
      throw new Error(`Payment provider '${config.provider}' not implemented`)
    },

    async confirmPaymentIntent(_intentId) {
      throw new Error(`Payment provider '${config.provider}' not implemented`)
    },

    async cancelPaymentIntent(_intentId) {
      throw new Error(`Payment provider '${config.provider}' not implemented`)
    },

    async refundPayment(_intentId, _amount) {
      throw new Error(`Payment provider '${config.provider}' not implemented`)
    },

    async getPaymentIntent(_intentId) {
      throw new Error(`Payment provider '${config.provider}' not implemented`)
    },
  }
}

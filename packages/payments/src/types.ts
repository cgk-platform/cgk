/**
 * Unified payment types
 */

export interface PaymentIntent {
  id: string
  provider: 'stripe' | 'wise'
  amount: number
  currency: string
  status: PaymentStatus
  metadata?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'

export interface PaymentMethod {
  id: string
  type: PaymentMethodType
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
}

export type PaymentMethodType = 'card' | 'bank_transfer' | 'wallet'

export interface PaymentResult {
  success: boolean
  paymentIntent?: PaymentIntent
  error?: PaymentError
  requiresAction?: boolean
  clientSecret?: string
}

export interface PaymentError {
  code: string
  message: string
  declineCode?: string
}

export interface RefundResult {
  success: boolean
  refundId?: string
  amount?: number
  error?: PaymentError
}

/**
 * @deprecated Use UnifiedPaymentProviderConfig from provider.ts instead.
 * This config was designed for direct secret key configuration, but the platform
 * now uses tenant-owned credentials loaded from the integrations system.
 */
export interface PaymentProviderConfig {
  provider: 'stripe' | 'wise'
  secretKey: string
  webhookSecret?: string
}

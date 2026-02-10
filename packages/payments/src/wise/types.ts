/**
 * Wise types
 */

export interface WiseProfile {
  id: number
  type: 'personal' | 'business'
  details: {
    firstName?: string
    lastName?: string
    name?: string
  }
}

export interface WiseQuote {
  id: string
  sourceCurrency: string
  targetCurrency: string
  sourceAmount: number
  targetAmount: number
  rate: number
  fee: number
  rateType: string
  createdTime: string
  expirationTime: string
}

export interface WiseRecipient {
  id: number
  profile: number
  accountHolderName: string
  type: string
  currency: string
  country: string
  details: Record<string, unknown>
}

export interface WiseTransfer {
  id: number
  user: number
  targetAccount: number
  sourceAccount: number | null
  quote: string
  status: WiseTransferStatus
  reference: string
  rate: number
  created: string
  sourceCurrency: string
  sourceValue: number
  targetCurrency: string
  targetValue: number
  customerTransactionId: string
}

export type WiseTransferStatus =
  | 'incoming_payment_waiting'
  | 'incoming_payment_initiated'
  | 'processing'
  | 'funds_converted'
  | 'outgoing_payment_sent'
  | 'cancelled'
  | 'funds_refunded'
  | 'bounced_back'

/**
 * Wise Payment Provider for International Payouts
 *
 * Implements international creator payouts using tenant-owned Wise credentials.
 * Each tenant has their own Wise Business account configured in tenant_wise_config.
 *
 * Features:
 * - Batch payout processing for multiple recipients
 * - Real-time exchange rate queries
 * - Recipient validation with bank detail verification
 * - Status tracking for in-flight transfers
 */

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'
import { sql, withTenant } from '@cgk-platform/db'

import type { PaymentProvider } from '../provider'
import type { PaymentIntent, PaymentResult, RefundResult } from '../types'

// =============================================================================
// Types
// =============================================================================

/** Wise provider configuration (fetched from tenant_wise_config) */
export interface WiseProviderConfig {
  /** Tenant ID for credential lookup */
  tenantId: string
  /** API key (decrypted) */
  apiKey: string
  /** Wise profile ID (business profile) */
  profileId: string
  /** Use sandbox environment */
  sandbox?: boolean
  /** Source currency for payouts (default USD) */
  sourceCurrency?: string
}

/** Payout batch request */
export interface PayoutBatchRequest {
  /** Unique batch reference */
  batchId: string
  /** Individual payout items */
  items: PayoutBatchItem[]
  /** Source currency (default from config) */
  sourceCurrency?: string
  /** Metadata for tracking */
  metadata?: Record<string, string>
}

/** Individual payout item in a batch */
export interface PayoutBatchItem {
  /** Unique reference for this payout */
  referenceId: string
  /** Wise recipient ID */
  recipientId: string
  /** Amount in source currency cents */
  amountCents: number
  /** Payment reference (shown to recipient) */
  reference?: string
}

/** Batch payout result */
export interface PayoutBatchResult {
  /** Batch ID */
  batchId: string
  /** Whether batch was successfully submitted */
  success: boolean
  /** Individual transfer results */
  transfers: TransferResult[]
  /** Total amount sent (in source currency cents) */
  totalAmountCents: number
  /** Total fees charged (in source currency cents) */
  totalFeeCents: number
  /** Error message if batch failed */
  error?: string
}

/** Individual transfer result */
export interface TransferResult {
  /** Reference ID from request */
  referenceId: string
  /** Wise transfer ID */
  transferId?: string
  /** Whether transfer was successful */
  success: boolean
  /** Amount sent (in target currency) */
  amountSent?: number
  /** Target currency */
  targetCurrency?: string
  /** Fee charged (in source currency cents) */
  feeCents?: number
  /** Exchange rate applied */
  exchangeRate?: number
  /** Estimated arrival date */
  estimatedArrival?: Date
  /** Error message if failed */
  error?: string
}

/** Payout status */
export interface WisePayoutStatus {
  /** Transfer ID */
  transferId: string
  /** Current status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'bounced'
  /** Amount in target currency */
  targetAmount: number
  /** Target currency */
  targetCurrency: string
  /** Source amount */
  sourceAmount: number
  /** Source currency */
  sourceCurrency: string
  /** Exchange rate */
  rate: number
  /** Creation timestamp */
  createdAt: Date
  /** Estimated or actual delivery date */
  deliveryDate?: Date
  /** Failure reason if applicable */
  failureReason?: string
  /** Raw Wise status */
  rawStatus: string
}

/** Exchange rate quote */
export interface ExchangeRateQuote {
  /** Quote ID (for creating transfer) */
  quoteId: string
  /** Source currency */
  sourceCurrency: string
  /** Target currency */
  targetCurrency: string
  /** Exchange rate */
  rate: number
  /** Fee in source currency */
  feeCents: number
  /** Source amount (if specified) */
  sourceAmount?: number
  /** Target amount (after conversion) */
  targetAmount?: number
  /** Quote expiration time */
  expiresAt: Date
}

/** Recipient validation result */
export interface RecipientValidationResult {
  /** Whether recipient details are valid */
  valid: boolean
  /** Recipient ID if valid */
  recipientId?: string
  /** Account holder name */
  accountHolderName?: string
  /** Target currency */
  currency?: string
  /** Country code */
  country?: string
  /** Validation errors if any */
  errors?: RecipientValidationError[]
}

/** Validation error detail */
export interface RecipientValidationError {
  /** Field name with error */
  field: string
  /** Error message */
  message: string
  /** Error code */
  code?: string
}

/** Recipient creation parameters */
export interface CreateRecipientParams {
  /** Account holder name */
  accountHolderName: string
  /** Target currency */
  currency: string
  /** Account type (e.g., 'iban', 'sort_code', 'aba', 'swift_code') */
  type: string
  /** Bank details (varies by type) */
  details: Record<string, unknown>
}

// =============================================================================
// Wise API Types (internal)
// =============================================================================

interface WiseQuoteResponse {
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

interface WiseRecipientResponse {
  id: number
  profile: number
  accountHolderName: string
  type: string
  currency: string
  country: string
  details: Record<string, unknown>
  active: boolean
}

interface WiseTransferResponse {
  id: number
  user: number
  targetAccount: number
  sourceAccount: number | null
  quote: string
  status: string
  reference: string
  rate: number
  created: string
  sourceCurrency: string
  sourceValue: number
  targetCurrency: string
  targetValue: number
  customerTransactionId: string
}

interface WiseFundingResponse {
  type: string
  status: string
  errorCode?: string
  errorMessage?: string
}

interface WiseAccountRequirement {
  type: string
  title: string
  fields: Array<{
    group: Array<{
      key: string
      name: string
      type: string
      required: boolean
      validationRegexp?: string
      example?: string
    }>
  }>
}

// =============================================================================
// WiseProvider Class
// =============================================================================

/**
 * Wise Payment Provider
 *
 * Handles international payouts using Wise (formerly TransferWise) API.
 * Uses tenant-owned credentials stored in tenant_wise_config.
 */
export class WiseProvider implements Partial<PaymentProvider> {
  readonly provider = 'wise' as const
  /** Tenant ID this provider is configured for */
  readonly tenantId: string
  private readonly apiKey: string
  readonly profileId: string
  private readonly baseUrl: string
  readonly sourceCurrency: string

  constructor(config: WiseProviderConfig) {
    this.tenantId = config.tenantId
    this.apiKey = config.apiKey
    this.profileId = config.profileId
    this.baseUrl = config.sandbox
      ? 'https://api.sandbox.transferwise.tech'
      : 'https://api.transferwise.com'
    this.sourceCurrency = config.sourceCurrency || 'USD'
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Make authenticated request to Wise API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetchWithTimeout(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      timeout: FETCH_TIMEOUTS.PAYMENT,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: { message?: string; errors?: Array<{ message: string; path?: string }> } = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      const message = errorData.message ||
        errorData.errors?.[0]?.message ||
        `Wise API error: ${response.status} ${errorText}`
      throw new Error(message)
    }

    return response.json() as Promise<T>
  }

  /**
   * Map Wise transfer status to our status
   */
  private mapTransferStatus(wiseStatus: string): WisePayoutStatus['status'] {
    switch (wiseStatus) {
      case 'incoming_payment_waiting':
      case 'incoming_payment_initiated':
        return 'pending'
      case 'processing':
      case 'funds_converted':
      case 'outgoing_payment_sent':
        return 'processing'
      case 'outgoing_payment_delivered':
        return 'completed'
      case 'cancelled':
        return 'cancelled'
      case 'funds_refunded':
      case 'bounced_back':
        return 'bounced'
      default:
        return 'failed'
    }
  }

  // ===========================================================================
  // Public Methods - Batch Payouts
  // ===========================================================================

  /**
   * Create a batch of payouts to multiple recipients
   *
   * This processes multiple payouts efficiently by:
   * 1. Creating quotes for each recipient's currency
   * 2. Creating transfers for each payout
   * 3. Funding all transfers from balance
   *
   * @param request Batch payout request
   * @returns Batch result with individual transfer statuses
   */
  async createPayoutBatch(request: PayoutBatchRequest): Promise<PayoutBatchResult> {
    const results: TransferResult[] = []
    let totalAmountCents = 0
    let totalFeeCents = 0
    const sourceCurrency = request.sourceCurrency || this.sourceCurrency

    try {
      for (const item of request.items) {
        try {
          // Get recipient to determine target currency
          const recipient = await this.request<WiseRecipientResponse>(
            'GET',
            `/v1/accounts/${item.recipientId}`
          )

          // Convert cents to currency units
          const sourceAmount = item.amountCents / 100

          // Create quote
          const quote = await this.request<WiseQuoteResponse>(
            'POST',
            `/v3/profiles/${this.profileId}/quotes`,
            {
              sourceCurrency,
              targetCurrency: recipient.currency,
              sourceAmount,
            }
          )

          // Create transfer
          const transfer = await this.request<WiseTransferResponse>(
            'POST',
            '/v1/transfers',
            {
              targetAccount: parseInt(item.recipientId, 10),
              quoteUuid: quote.id,
              customerTransactionId: item.referenceId,
              details: {
                reference: item.reference || `Payout ${item.referenceId}`,
                transferPurpose: 'verification.transfers.purpose.pay.other',
              },
            }
          )

          // Fund from balance
          const funding = await this.request<WiseFundingResponse>(
            'POST',
            `/v3/profiles/${this.profileId}/transfers/${transfer.id}/payments`,
            { type: 'BALANCE' }
          )

          if (funding.status === 'REJECTED') {
            results.push({
              referenceId: item.referenceId,
              success: false,
              error: funding.errorMessage || 'Funding rejected',
            })
            continue
          }

          // Calculate amounts
          const feeCents = Math.round(quote.fee * 100)
          totalAmountCents += item.amountCents
          totalFeeCents += feeCents

          // Estimate arrival (typically 1-4 business days)
          const estimatedArrival = new Date()
          estimatedArrival.setDate(estimatedArrival.getDate() + 3)

          results.push({
            referenceId: item.referenceId,
            transferId: transfer.id.toString(),
            success: true,
            amountSent: transfer.targetValue,
            targetCurrency: transfer.targetCurrency,
            feeCents,
            exchangeRate: quote.rate,
            estimatedArrival,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          results.push({
            referenceId: item.referenceId,
            success: false,
            error: message,
          })
        }
      }

      return {
        batchId: request.batchId,
        success: results.every(r => r.success),
        transfers: results,
        totalAmountCents,
        totalFeeCents,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        batchId: request.batchId,
        success: false,
        transfers: results,
        totalAmountCents: 0,
        totalFeeCents: 0,
        error: message,
      }
    }
  }

  // ===========================================================================
  // Public Methods - Status Tracking
  // ===========================================================================

  /**
   * Get the current status of a payout
   *
   * @param transferId Wise transfer ID
   * @returns Current payout status
   */
  async getPayoutStatus(transferId: string): Promise<WisePayoutStatus> {
    const transfer = await this.request<WiseTransferResponse>(
      'GET',
      `/v1/transfers/${transferId}`
    )

    return {
      transferId: transfer.id.toString(),
      status: this.mapTransferStatus(transfer.status),
      targetAmount: transfer.targetValue,
      targetCurrency: transfer.targetCurrency,
      sourceAmount: transfer.sourceValue,
      sourceCurrency: transfer.sourceCurrency,
      rate: transfer.rate,
      createdAt: new Date(transfer.created),
      rawStatus: transfer.status,
    }
  }

  /**
   * Get statuses for multiple transfers
   *
   * @param transferIds Array of transfer IDs
   * @returns Map of transfer ID to status
   */
  async getPayoutStatuses(transferIds: string[]): Promise<Map<string, WisePayoutStatus>> {
    const statuses = new Map<string, WisePayoutStatus>()

    // Wise doesn't have a batch status endpoint, so we query individually
    // In production, this could be optimized with parallel requests
    await Promise.all(
      transferIds.map(async (id) => {
        try {
          const status = await this.getPayoutStatus(id)
          statuses.set(id, status)
        } catch {
          // Skip failed lookups
        }
      })
    )

    return statuses
  }

  // ===========================================================================
  // Public Methods - Exchange Rates
  // ===========================================================================

  /**
   * Get current exchange rate quote
   *
   * Quotes are valid for a limited time (typically 30 minutes).
   * Use the returned quoteId when creating transfers to lock in the rate.
   *
   * @param sourceCurrency Source currency code (e.g., 'USD')
   * @param targetCurrency Target currency code (e.g., 'EUR')
   * @param sourceAmountCents Optional source amount in cents
   * @param targetAmountCents Optional target amount in cents (if source not specified)
   * @returns Exchange rate quote
   */
  async getExchangeRate(
    sourceCurrency: string,
    targetCurrency: string,
    sourceAmountCents?: number,
    targetAmountCents?: number
  ): Promise<ExchangeRateQuote> {
    const params: Record<string, unknown> = {
      sourceCurrency: sourceCurrency.toUpperCase(),
      targetCurrency: targetCurrency.toUpperCase(),
    }

    if (sourceAmountCents) {
      params.sourceAmount = sourceAmountCents / 100
    } else if (targetAmountCents) {
      params.targetAmount = targetAmountCents / 100
    } else {
      // Default to 1000 source currency for rate lookup
      params.sourceAmount = 1000
    }

    const quote = await this.request<WiseQuoteResponse>(
      'POST',
      `/v3/profiles/${this.profileId}/quotes`,
      params
    )

    return {
      quoteId: quote.id,
      sourceCurrency: quote.sourceCurrency,
      targetCurrency: quote.targetCurrency,
      rate: quote.rate,
      feeCents: Math.round(quote.fee * 100),
      sourceAmount: sourceAmountCents ? sourceAmountCents / 100 : undefined,
      targetAmount: quote.targetAmount,
      expiresAt: new Date(quote.expirationTime),
    }
  }

  /**
   * Get exchange rates for multiple currency pairs
   *
   * @param pairs Array of [source, target] currency pairs
   * @returns Map of "SOURCE-TARGET" to rate
   */
  async getExchangeRates(
    pairs: Array<[string, string]>
  ): Promise<Map<string, number>> {
    const rates = new Map<string, number>()

    await Promise.all(
      pairs.map(async ([source, target]) => {
        try {
          const quote = await this.getExchangeRate(source, target)
          rates.set(`${source}-${target}`, quote.rate)
        } catch {
          // Skip failed lookups
        }
      })
    )

    return rates
  }

  // ===========================================================================
  // Public Methods - Recipient Validation
  // ===========================================================================

  /**
   * Validate recipient bank details before creating a transfer
   *
   * @param recipientId Wise recipient ID to validate
   * @returns Validation result with any errors
   */
  async validateRecipient(recipientId: string): Promise<RecipientValidationResult> {
    try {
      const recipient = await this.request<WiseRecipientResponse>(
        'GET',
        `/v1/accounts/${recipientId}`
      )

      if (!recipient.active) {
        return {
          valid: false,
          errors: [{
            field: 'account',
            message: 'Recipient account is inactive',
            code: 'INACTIVE_ACCOUNT',
          }],
        }
      }

      return {
        valid: true,
        recipientId: recipient.id.toString(),
        accountHolderName: recipient.accountHolderName,
        currency: recipient.currency,
        country: recipient.country,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        valid: false,
        errors: [{
          field: 'account',
          message,
          code: 'VALIDATION_ERROR',
        }],
      }
    }
  }

  /**
   * Create a new recipient with bank details
   *
   * @param params Recipient creation parameters
   * @returns Validation result with new recipient ID if successful
   */
  async createRecipient(params: CreateRecipientParams): Promise<RecipientValidationResult> {
    try {
      const recipient = await this.request<WiseRecipientResponse>(
        'POST',
        '/v1/accounts',
        {
          profile: this.profileId,
          accountHolderName: params.accountHolderName,
          currency: params.currency,
          type: params.type,
          details: params.details,
        }
      )

      return {
        valid: true,
        recipientId: recipient.id.toString(),
        accountHolderName: recipient.accountHolderName,
        currency: recipient.currency,
        country: recipient.country,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      // Try to parse Wise validation errors
      const errors: RecipientValidationError[] = []
      try {
        const errorData = JSON.parse(message.replace('Wise API error: ', '').replace(/^\d+ /, ''))
        if (errorData.errors && Array.isArray(errorData.errors)) {
          for (const e of errorData.errors as Array<{ path?: string; message: string; code?: string }>) {
            errors.push({
              field: e.path || 'unknown',
              message: e.message,
              code: e.code,
            })
          }
        }
      } catch {
        errors.push({
          field: 'unknown',
          message,
        })
      }

      return {
        valid: false,
        errors,
      }
    }
  }

  /**
   * Get required fields for a specific account type and currency
   *
   * Use this to build dynamic recipient forms based on the target country.
   *
   * @param targetCurrency Target currency code
   * @returns Array of account type requirements
   */
  async getAccountRequirements(
    targetCurrency: string
  ): Promise<WiseAccountRequirement[]> {
    const response = await this.request<WiseAccountRequirement[]>(
      'GET',
      `/v1/account-requirements?source=${this.sourceCurrency}&target=${targetCurrency}&sourceAmount=1000`
    )

    return response
  }

  // ===========================================================================
  // PaymentProvider Interface Methods (Partial Implementation)
  // ===========================================================================

  /**
   * Create a payment intent (not typically used for payouts)
   * Wise is primarily for payouts, not accepting payments
   */
  async createPaymentIntent(): Promise<PaymentResult> {
    return {
      success: false,
      error: {
        code: 'not_supported',
        message: 'Wise does not support payment intents. Use for payouts only.',
      },
    }
  }

  async confirmPaymentIntent(): Promise<PaymentResult> {
    return {
      success: false,
      error: {
        code: 'not_supported',
        message: 'Wise does not support payment intents. Use for payouts only.',
      },
    }
  }

  async cancelPaymentIntent(): Promise<PaymentResult> {
    return {
      success: false,
      error: {
        code: 'not_supported',
        message: 'Wise does not support payment intents. Use for payouts only.',
      },
    }
  }

  async refundPayment(): Promise<RefundResult> {
    return {
      success: false,
      error: {
        code: 'not_supported',
        message: 'Wise does not support refunds. Use for payouts only.',
      },
    }
  }

  async getPaymentIntent(): Promise<PaymentIntent | null> {
    return null
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Wise provider using direct configuration
 *
 * @param config Provider configuration
 * @returns WiseProvider instance
 */
export function createWiseProvider(config: WiseProviderConfig): WiseProvider {
  return new WiseProvider(config)
}

/**
 * Create a Wise provider using tenant credentials from database
 *
 * This fetches and decrypts the tenant's Wise credentials from tenant_wise_config.
 *
 * @param tenantId Tenant ID
 * @returns WiseProvider instance or null if not configured
 */
export async function createTenantWiseProvider(
  tenantId: string
): Promise<WiseProvider | null> {
  // Fetch tenant config
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        api_key_encrypted,
        profile_id,
        source_currency,
        sandbox_mode,
        is_active
      FROM tenant_wise_config
      WHERE tenant_id = ${tenantId} AND is_active = true
    `
  })

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row || !row.profile_id) {
    return null
  }

  // Decrypt API key
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is required for tenant credentials')
  }

  // Import decryption function dynamically to avoid circular dependencies
  const { decryptToken } = await import('@cgk-platform/integrations')
  const apiKey = await decryptToken(row.api_key_encrypted as string, encryptionKey)

  return new WiseProvider({
    tenantId,
    apiKey,
    profileId: row.profile_id as string,
    sandbox: row.sandbox_mode as boolean,
    sourceCurrency: (row.source_currency as string) || 'USD',
  })
}

/**
 * Create a Wise provider or throw if not configured
 *
 * @param tenantId Tenant ID
 * @returns WiseProvider instance
 * @throws Error if Wise is not configured for the tenant
 */
export async function requireTenantWiseProvider(
  tenantId: string
): Promise<WiseProvider> {
  const provider = await createTenantWiseProvider(tenantId)
  if (!provider) {
    throw new Error(`Wise is not configured for tenant: ${tenantId}`)
  }
  return provider
}

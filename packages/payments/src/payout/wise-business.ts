/**
 * Wise Business Provider
 *
 * Implements PayoutProvider for international creators using Wise Business API.
 * Handles recipient creation, quotes, and transfers.
 */

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'

import type {
  PayoutProvider,
  CreateAccountParams,
  CreateAccountResult,
  AccountStatus,
  PayoutRequest,
  PayoutResult,
  PayoutStatusResult,
} from './types'

export interface WiseBusinessConfig {
  /** Wise API token */
  apiToken: string
  /** Wise profile ID (business profile) */
  profileId: string
  /** Use sandbox environment */
  sandbox?: boolean
}

interface WiseQuote {
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

interface WiseRecipient {
  id: number
  profile: number
  accountHolderName: string
  type: string
  currency: string
  country: string
  details: Record<string, unknown>
}

interface WiseTransfer {
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

interface WiseFundingResult {
  type: string
  status: string
  errorCode?: string
  errorMessage?: string
}

/**
 * Create a Wise Business payout provider
 */
export function createWiseBusinessProvider(config: WiseBusinessConfig): PayoutProvider {
  const baseUrl = config.sandbox
    ? 'https://api.sandbox.transferwise.tech'
    : 'https://api.transferwise.com'

  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetchWithTimeout(`${baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      timeout: FETCH_TIMEOUTS.PAYMENT,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: { message?: string; errors?: Array<{ message: string }> } = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON, use text
      }
      const message = errorData.message ||
        errorData.errors?.[0]?.message ||
        `Wise API error: ${response.status} ${errorText}`
      throw new Error(message)
    }

    return response.json() as Promise<T>
  }

  /**
   * Create a quote for a transfer
   */
  async function createQuote(
    sourceCurrency: string,
    targetCurrency: string,
    sourceAmount: number
  ): Promise<WiseQuote> {
    return request<WiseQuote>('POST', `/v3/profiles/${config.profileId}/quotes`, {
      sourceCurrency,
      targetCurrency,
      sourceAmount,
    })
  }

  /**
   * Get a recipient by ID
   */
  async function getRecipient(recipientId: string): Promise<WiseRecipient> {
    return request<WiseRecipient>('GET', `/v1/accounts/${recipientId}`)
  }

  /**
   * Create a transfer
   */
  async function createTransfer(
    quoteId: string,
    targetAccount: string,
    customerTransactionId: string,
    reference?: string
  ): Promise<WiseTransfer> {
    return request<WiseTransfer>('POST', '/v1/transfers', {
      targetAccount: parseInt(targetAccount, 10),
      quoteUuid: quoteId,
      customerTransactionId,
      details: {
        reference: reference || customerTransactionId,
        transferPurpose: 'verification.transfers.purpose.pay.other',
      },
    })
  }

  /**
   * Fund a transfer from balance
   */
  async function fundTransfer(transferId: number): Promise<WiseFundingResult> {
    return request<WiseFundingResult>(
      'POST',
      `/v3/profiles/${config.profileId}/transfers/${transferId}/payments`,
      { type: 'BALANCE' }
    )
  }

  /**
   * Get transfer details
   */
  async function getTransfer(transferId: string): Promise<WiseTransfer> {
    return request<WiseTransfer>('GET', `/v1/transfers/${transferId}`)
  }

  return {
    name: 'wise',

    async createAccount(params: CreateAccountParams): Promise<CreateAccountResult> {
      // Wise doesn't require pre-creating accounts like Stripe Connect
      // Recipients are created when setting up payout details
      // Return success with instruction to add bank details

      return {
        success: true,
        accountId: `wise_pending_${params.creatorId}`,
        requiresOnboarding: true,
        // No onboarding URL - bank details collected via our UI
      }
    },

    async getAccountStatus(accountId: string): Promise<AccountStatus> {
      // For Wise, account status is based on whether a recipient exists
      if (accountId.startsWith('wise_pending_')) {
        return {
          accountId,
          isActive: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingComplete: false,
        }
      }

      try {
        const recipient = await getRecipient(accountId)
        return {
          accountId: accountId,
          isActive: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          onboardingComplete: true,
          country: recipient.country,
          defaultCurrency: recipient.currency,
        }
      } catch {
        return {
          accountId,
          isActive: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingComplete: false,
        }
      }
    },

    async createPayout(request: PayoutRequest): Promise<PayoutResult> {
      try {
        // Get recipient ID from payment method
        const recipientId = request.paymentMethodId

        if (!recipientId) {
          return {
            success: false,
            provider: 'wise',
            error: 'No Wise recipient ID provided',
            errorCode: 'missing_recipient',
          }
        }

        // Get recipient to determine target currency
        const recipient = await getRecipient(recipientId)
        const targetCurrency = recipient.currency

        // Convert cents to dollars for Wise API
        const sourceAmount = request.amountCents / 100

        // Create quote
        const quote = await createQuote(
          request.currency.toUpperCase(),
          targetCurrency.toUpperCase(),
          sourceAmount
        )

        // Create transfer
        const transfer = await createTransfer(
          quote.id,
          recipientId,
          request.referenceId,
          `Payout ${request.referenceId}`
        )

        // Fund the transfer from balance
        const fundingResult = await fundTransfer(transfer.id)

        if (fundingResult.status === 'REJECTED') {
          return {
            success: false,
            provider: 'wise',
            error: fundingResult.errorMessage || 'Transfer funding rejected',
            errorCode: fundingResult.errorCode || 'funding_rejected',
          }
        }

        // Estimate arrival (typically 1-4 business days)
        const estimatedArrival = new Date()
        estimatedArrival.setDate(estimatedArrival.getDate() + 3)

        return {
          success: true,
          provider: 'wise',
          transferId: transfer.id.toString(),
          estimatedArrival,
          amountSent: Math.round(transfer.targetValue * 100), // Convert to cents
          currency: transfer.targetCurrency,
          feeCents: Math.round(quote.fee * 100),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error creating Wise transfer'
        return {
          success: false,
          provider: 'wise',
          error: message,
          errorCode: 'transfer_failed',
        }
      }
    },

    async getPayoutStatus(transferId: string): Promise<PayoutStatusResult> {
      const transfer = await getTransfer(transferId)

      // Map Wise transfer status to our status
      let status: PayoutStatusResult['status'] = 'processing'
      switch (transfer.status) {
        case 'incoming_payment_waiting':
        case 'incoming_payment_initiated':
          status = 'pending'
          break
        case 'processing':
        case 'funds_converted':
          status = 'processing'
          break
        case 'outgoing_payment_sent':
          status = 'completed'
          break
        case 'cancelled':
          status = 'cancelled'
          break
        case 'funds_refunded':
        case 'bounced_back':
          status = 'failed'
          break
      }

      return {
        transferId: transfer.id.toString(),
        status,
        amountCents: Math.round(transfer.targetValue * 100),
        currency: transfer.targetCurrency,
        arrivalDate: new Date(transfer.created),
        rawData: transfer,
      }
    },

    async cancelPayout(transferId: string): Promise<boolean> {
      try {
        await request<WiseTransfer>('PUT', `/v1/transfers/${transferId}/cancel`)
        return true
      } catch {
        return false
      }
    },
  }
}

/**
 * Create a Wise recipient for a creator
 */
export async function createWiseRecipient(
  config: WiseBusinessConfig,
  params: {
    creatorId: string
    accountHolderName: string
    currency: string
    type: string // 'iban', 'sort_code', 'aba', etc.
    details: Record<string, unknown>
  }
): Promise<{ recipientId: string; success: boolean; error?: string }> {
  const baseUrl = config.sandbox
    ? 'https://api.sandbox.transferwise.tech'
    : 'https://api.transferwise.com'

  try {
    const response = await fetchWithTimeout(`${baseUrl}/v1/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile: config.profileId,
        accountHolderName: params.accountHolderName,
        currency: params.currency,
        type: params.type,
        details: params.details,
      }),
      timeout: FETCH_TIMEOUTS.PAYMENT,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        recipientId: '',
        success: false,
        error: errorText,
      }
    }

    const recipient = await response.json() as WiseRecipient
    return {
      recipientId: recipient.id.toString(),
      success: true,
    }
  } catch (error) {
    return {
      recipientId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get supported account types for a currency/country combination
 */
export async function getWiseAccountRequirements(
  config: WiseBusinessConfig,
  sourceCurrency: string,
  targetCurrency: string
): Promise<Array<{ type: string; title: string; fields: Array<{ name: string; required: boolean }> }>> {
  const baseUrl = config.sandbox
    ? 'https://api.sandbox.transferwise.tech'
    : 'https://api.transferwise.com'

  const response = await fetchWithTimeout(
    `${baseUrl}/v1/account-requirements?source=${sourceCurrency}&target=${targetCurrency}&sourceAmount=1000`,
    {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
      },
      timeout: FETCH_TIMEOUTS.PAYMENT,
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get account requirements')
  }

  const requirements = await response.json() as Array<{
    type: string
    title: string
    fields: Array<{
      group: Array<{
        key: string
        name: string
        type: string
        required: boolean
      }>
    }>
  }>

  return requirements.map(req => ({
    type: req.type,
    title: req.title,
    fields: req.fields.flatMap(f => f.group.map(g => ({
      name: g.name,
      required: g.required,
    }))),
  }))
}

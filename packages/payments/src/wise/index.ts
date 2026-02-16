/**
 * Wise (TransferWise) client
 */

import { fetchWithTimeout, FETCH_TIMEOUTS } from '@cgk-platform/core'

import type { WiseTransfer, WiseRecipient, WiseQuote } from './types'

export interface WiseClient {
  readonly profileId: string

  // Quotes
  createQuote(params: CreateQuoteParams): Promise<WiseQuote>
  getQuote(id: string): Promise<WiseQuote>

  // Recipients
  createRecipient(params: CreateRecipientParams): Promise<WiseRecipient>
  getRecipient(id: string): Promise<WiseRecipient>
  listRecipients(): Promise<WiseRecipient[]>

  // Transfers
  createTransfer(params: CreateTransferParams): Promise<WiseTransfer>
  fundTransfer(transferId: string): Promise<WiseTransfer>
  getTransfer(id: string): Promise<WiseTransfer>
  cancelTransfer(id: string): Promise<WiseTransfer>
}

export interface WiseConfig {
  apiToken: string
  profileId: string
  sandbox?: boolean
}

export interface CreateQuoteParams {
  sourceCurrency: string
  targetCurrency: string
  sourceAmount?: number
  targetAmount?: number
}

export interface CreateRecipientParams {
  currency: string
  type: string
  accountHolderName: string
  details: Record<string, unknown>
}

export interface CreateTransferParams {
  targetAccount: string
  quoteId: string
  customerTransactionId: string
  details?: {
    reference?: string
    transferPurpose?: string
  }
}

/**
 * Create a Wise client
 */
export function createWiseClient(config: WiseConfig): WiseClient {
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
      const error = await response.text()
      throw new Error(`Wise API error: ${response.status} ${error}`)
    }

    return response.json() as Promise<T>
  }

  return {
    profileId: config.profileId,

    createQuote: (params) =>
      request<WiseQuote>('POST', `/v3/profiles/${config.profileId}/quotes`, params),

    getQuote: (id) =>
      request<WiseQuote>('GET', `/v3/profiles/${config.profileId}/quotes/${id}`),

    createRecipient: (params) =>
      request<WiseRecipient>('POST', '/v1/accounts', {
        profile: config.profileId,
        ...params,
      }),

    getRecipient: (id) =>
      request<WiseRecipient>('GET', `/v1/accounts/${id}`),

    listRecipients: () =>
      request<WiseRecipient[]>('GET', `/v1/accounts?profile=${config.profileId}`),

    createTransfer: (params) =>
      request<WiseTransfer>('POST', '/v1/transfers', params),

    fundTransfer: (transferId) =>
      request<WiseTransfer>(
        'POST',
        `/v3/profiles/${config.profileId}/transfers/${transferId}/payments`,
        { type: 'BALANCE' }
      ),

    getTransfer: (id) =>
      request<WiseTransfer>('GET', `/v1/transfers/${id}`),

    cancelTransfer: (id) =>
      request<WiseTransfer>('PUT', `/v1/transfers/${id}/cancel`),
  }
}

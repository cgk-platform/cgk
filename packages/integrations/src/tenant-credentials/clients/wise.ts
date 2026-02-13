/**
 * Tenant Wise Client
 *
 * Creates Wise API clients using tenant-owned credentials.
 * Each tenant has their own Wise Business account for international payouts.
 */

import { getTenantWiseApiKey, getTenantWiseConfig } from '../storage.js'
import type { TenantWiseConfig } from '../types.js'

// Wise API base URLs
const WISE_API_BASE = 'https://api.transferwise.com'
const WISE_SANDBOX_BASE = 'https://api.sandbox.transferwise.tech'

/**
 * Wise API client interface
 *
 * Provides typed methods for common Wise operations.
 */
export interface WiseClient {
  /** The tenant's profile ID */
  profileId: string | null
  /** Whether using sandbox mode */
  sandboxMode: boolean
  /** Make authenticated GET request */
  get<T>(path: string): Promise<T>
  /** Make authenticated POST request */
  post<T>(path: string, body: unknown): Promise<T>
  /** Get account balances */
  getBalances(): Promise<WiseBalance[]>
  /** Get profiles */
  getProfiles(): Promise<WiseProfile[]>
  /** Create a quote for transfer */
  createQuote(params: CreateQuoteParams): Promise<WiseQuote>
  /** Create a recipient */
  createRecipient(params: CreateRecipientParams): Promise<WiseRecipient>
  /** Create a transfer */
  createTransfer(params: CreateTransferParams): Promise<WiseTransfer>
  /** Fund a transfer */
  fundTransfer(transferId: string): Promise<WiseFundingResult>
}

/** Wise balance */
export interface WiseBalance {
  id: number
  currency: string
  amount: { value: number; currency: string }
  type: string
}

/** Wise profile */
export interface WiseProfile {
  id: number
  type: 'personal' | 'business'
  details: {
    name?: string
    firstName?: string
    lastName?: string
  }
}

/** Quote creation params */
export interface CreateQuoteParams {
  sourceCurrency: string
  targetCurrency: string
  sourceAmount?: number
  targetAmount?: number
  payOut?: 'BALANCE' | 'BANK_TRANSFER'
}

/** Wise quote */
export interface WiseQuote {
  id: string
  sourceCurrency: string
  targetCurrency: string
  sourceAmount: number
  targetAmount: number
  rate: number
  fee: number
  expirationTime: string
}

/** Recipient creation params */
export interface CreateRecipientParams {
  currency: string
  type: string
  profile: number
  accountHolderName: string
  details: Record<string, unknown>
}

/** Wise recipient */
export interface WiseRecipient {
  id: number
  accountHolderName: string
  currency: string
  type: string
  active: boolean
}

/** Transfer creation params */
export interface CreateTransferParams {
  targetAccount: number
  quoteUuid: string
  customerTransactionId: string
  details?: {
    reference?: string
    sourceOfFunds?: string
  }
}

/** Wise transfer */
export interface WiseTransfer {
  id: number
  user: number
  targetAccount: number
  sourceAccount: number | null
  quote: string
  quoteUuid: string
  status: string
  rate: number
  created: string
  sourceCurrency: string
  sourceValue: number
  targetCurrency: string
  targetValue: number
  customerTransactionId: string
}

/** Funding result */
export interface WiseFundingResult {
  type: string
  status: string
  errorMessage?: string
}

// API key cache
const keyCache = new Map<string, { apiKey: string; config: TenantWiseConfig; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a Wise client for a specific tenant
 *
 * Returns null if the tenant has no Wise configuration.
 */
export async function getTenantWiseClient(
  tenantId: string
): Promise<WiseClient | null> {
  // Check cache
  let cached = keyCache.get(tenantId)
  if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
    const config = await getTenantWiseConfig(tenantId)
    if (!config) return null

    const apiKey = await getTenantWiseApiKey(tenantId)
    if (!apiKey) return null

    cached = { apiKey, config, timestamp: Date.now() }
    keyCache.set(tenantId, cached)
  }

  const { apiKey, config } = cached
  const baseUrl = config.sandboxMode ? WISE_SANDBOX_BASE : WISE_API_BASE

  // Create request helper
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wise API error: ${response.status} - ${errorText}`)
    }

    return response.json() as Promise<T>
  }

  return {
    profileId: config.profileId,
    sandboxMode: config.sandboxMode,

    get<T>(path: string): Promise<T> {
      return request<T>('GET', path)
    },

    post<T>(path: string, body: unknown): Promise<T> {
      return request<T>('POST', path, body)
    },

    async getBalances(): Promise<WiseBalance[]> {
      if (!config.profileId) {
        throw new Error('Profile ID not configured')
      }
      return request<WiseBalance[]>('GET', `/v4/profiles/${config.profileId}/balances?types=STANDARD`)
    },

    async getProfiles(): Promise<WiseProfile[]> {
      return request<WiseProfile[]>('GET', '/v1/profiles')
    },

    async createQuote(params: CreateQuoteParams): Promise<WiseQuote> {
      if (!config.profileId) {
        throw new Error('Profile ID not configured')
      }
      return request<WiseQuote>('POST', '/v3/quotes', {
        ...params,
        profile: config.profileId,
      })
    },

    async createRecipient(params: CreateRecipientParams): Promise<WiseRecipient> {
      return request<WiseRecipient>('POST', '/v1/accounts', params)
    },

    async createTransfer(params: CreateTransferParams): Promise<WiseTransfer> {
      return request<WiseTransfer>('POST', '/v1/transfers', params)
    },

    async fundTransfer(transferId: string): Promise<WiseFundingResult> {
      if (!config.profileId) {
        throw new Error('Profile ID not configured')
      }
      return request<WiseFundingResult>(
        'POST',
        `/v3/profiles/${config.profileId}/transfers/${transferId}/payments`,
        { type: 'BALANCE' }
      )
    },
  }
}

/**
 * Get a Wise client or throw if not configured
 */
export async function requireTenantWiseClient(tenantId: string): Promise<WiseClient> {
  const client = await getTenantWiseClient(tenantId)
  if (!client) {
    throw new Error(`Wise is not configured for tenant: ${tenantId}`)
  }
  return client
}

/**
 * Verify tenant's Wise credentials by fetching profiles
 */
export async function verifyTenantWiseCredentials(
  tenantId: string
): Promise<{
  valid: boolean
  profiles?: WiseProfile[]
  error?: string
}> {
  try {
    const client = await getTenantWiseClient(tenantId)
    if (!client) {
      return { valid: false, error: 'Wise not configured' }
    }

    const profiles = await client.getProfiles()

    return {
      valid: true,
      profiles,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, error: message }
  }
}

/**
 * Clear cached Wise credentials for a tenant
 */
export function clearTenantWiseCache(tenantId: string): void {
  keyCache.delete(tenantId)
}

/**
 * Clear all cached Wise credentials
 */
export function clearAllWiseCache(): void {
  keyCache.clear()
}

/**
 * Check if tenant has Wise configured
 */
export async function hasTenantWiseConfig(tenantId: string): Promise<boolean> {
  const config = await getTenantWiseConfig(tenantId)
  return config !== null
}

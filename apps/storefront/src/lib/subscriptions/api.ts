/**
 * Subscription API client for customer portal
 *
 * Server-side functions that call the subscription provider abstraction.
 * These work with any configured provider (Loop, ReCharge, Shopify native).
 */

import { getTenantConfig } from '@/lib/tenant'

import type {
  CancellationReason,
  FrequencyOption,
  PauseOptions,
  PaymentMethod,
  SaveOffer,
  Subscription,
  SubscriptionActionResult,
  SubscriptionFilters,
  SubscriptionListResponse,
  SubscriptionOrder,
  SwappableProduct,
} from './types'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

async function getApiBaseUrl(): Promise<string> {
  const config = await getTenantConfig()
  if (!config) {
    throw new Error('Tenant configuration not found')
  }
  return `/api/subscriptions`
}

async function fetchWithTenant<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = await getApiBaseUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Subscription List & Details
// ---------------------------------------------------------------------------

export async function listSubscriptions(
  filters?: SubscriptionFilters
): Promise<SubscriptionListResponse> {
  const params = new URLSearchParams()
  if (filters?.status && filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters?.limit) {
    params.set('limit', String(filters.limit))
  }
  if (filters?.cursor) {
    params.set('cursor', filters.cursor)
  }

  const query = params.toString()
  return fetchWithTenant<SubscriptionListResponse>(query ? `?${query}` : '')
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  try {
    return await fetchWithTenant<Subscription>(`/${id}`)
  } catch {
    return null
  }
}

export async function getSubscriptionOrders(
  subscriptionId: string,
  limit = 10
): Promise<SubscriptionOrder[]> {
  return fetchWithTenant<SubscriptionOrder[]>(
    `/${subscriptionId}/orders?limit=${limit}`
  )
}

// ---------------------------------------------------------------------------
// Subscription Lifecycle Actions
// ---------------------------------------------------------------------------

export async function pauseSubscription(
  id: string,
  options?: PauseOptions
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/pause`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
}

export async function resumeSubscription(
  id: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/resume`, {
    method: 'POST',
  })
}

export async function cancelSubscription(
  id: string,
  reasonId: string,
  comment?: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reasonId, comment }),
  })
}

export async function reactivateSubscription(
  id: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/reactivate`, {
    method: 'POST',
  })
}

// ---------------------------------------------------------------------------
// Order Actions
// ---------------------------------------------------------------------------

export async function skipNextOrder(
  id: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/skip`, {
    method: 'POST',
  })
}

export async function rescheduleNextOrder(
  id: string,
  newDate: Date
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ nextOrderDate: newDate.toISOString() }),
  })
}

export async function orderNow(
  id: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/order-now`, {
    method: 'POST',
  })
}

// ---------------------------------------------------------------------------
// Subscription Updates
// ---------------------------------------------------------------------------

export async function updateFrequency(
  id: string,
  frequency: { intervalCount: number; interval: string }
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(`/${id}/frequency`, {
    method: 'PATCH',
    body: JSON.stringify(frequency),
  })
}

export async function updateItemQuantity(
  subscriptionId: string,
  itemId: string,
  quantity: number
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(
    `/${subscriptionId}/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }
  )
}

export async function swapItem(
  subscriptionId: string,
  itemId: string,
  newVariantId: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(
    `/${subscriptionId}/items/${itemId}/swap`,
    {
      method: 'POST',
      body: JSON.stringify({ variantId: newVariantId }),
    }
  )
}

export async function removeItem(
  subscriptionId: string,
  itemId: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(
    `/${subscriptionId}/items/${itemId}`,
    {
      method: 'DELETE',
    }
  )
}

// ---------------------------------------------------------------------------
// Payment Methods
// ---------------------------------------------------------------------------

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return fetchWithTenant<PaymentMethod[]>('/payment-methods')
}

export async function updatePaymentMethod(
  subscriptionId: string,
  paymentMethodId: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(
    `/${subscriptionId}/payment-method`,
    {
      method: 'PATCH',
      body: JSON.stringify({ paymentMethodId }),
    }
  )
}

export async function requestPaymentUpdateLink(
  subscriptionId: string
): Promise<{ success: boolean; message: string }> {
  return fetchWithTenant<{ success: boolean; message: string }>(
    `/${subscriptionId}/payment-method/update-link`,
    {
      method: 'POST',
    }
  )
}

// ---------------------------------------------------------------------------
// Options & Configuration
// ---------------------------------------------------------------------------

export async function getFrequencyOptions(
  subscriptionId: string
): Promise<FrequencyOption[]> {
  return fetchWithTenant<FrequencyOption[]>(`/${subscriptionId}/frequency-options`)
}

export async function getSwappableProducts(
  subscriptionId: string,
  itemId: string
): Promise<SwappableProduct[]> {
  return fetchWithTenant<SwappableProduct[]>(
    `/${subscriptionId}/items/${itemId}/swappable`
  )
}

export async function getCancellationReasons(): Promise<CancellationReason[]> {
  return fetchWithTenant<CancellationReason[]>('/cancellation-reasons')
}

export async function getSaveOffers(
  subscriptionId: string,
  reasonId: string
): Promise<SaveOffer[]> {
  return fetchWithTenant<SaveOffer[]>(
    `/${subscriptionId}/save-offers?reasonId=${reasonId}`
  )
}

export async function applySaveOffer(
  subscriptionId: string,
  offerId: string
): Promise<SubscriptionActionResult> {
  return fetchWithTenant<SubscriptionActionResult>(
    `/${subscriptionId}/save-offers/${offerId}/apply`,
    {
      method: 'POST',
    }
  )
}

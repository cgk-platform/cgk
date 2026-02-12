/**
 * Customer Portal API Client
 *
 * Provides tenant-isolated API calls for portal features.
 * All requests include tenant context from headers.
 */

import type {
  AddToWishlistRequest,
  CancelOrderRequest,
  CreateTicketRequest,
  FaqCategory,
  LoyaltyAccount,
  LoyaltyReward,
  LoyaltyTierInfo,
  Order,
  PaginatedResult,
  PointsTransaction,
  PortalFeatureFlags,
  RedeemRewardRequest,
  RedeemRewardResponse,
  Referral,
  ReferralCode,
  ReferralReward,
  ReferralStats,
  ReplyToTicketRequest,
  ReturnRequest,
  ReturnRequestResponse,
  ShareWishlistResponse,
  SupportTicket,
  Wishlist,
  WishlistItem,
} from './types'

const API_BASE = '/api/account'

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }

  return response.json()
}

// ============================================================================
// Feature Flags
// ============================================================================

export async function getFeatureFlags(): Promise<PortalFeatureFlags> {
  return apiFetch<PortalFeatureFlags>('/features')
}

// ============================================================================
// Orders API
// ============================================================================

export async function getOrders(
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<Order>> {
  return apiFetch<PaginatedResult<Order>>(
    `/orders?page=${page}&pageSize=${pageSize}`
  )
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`)
}

export async function cancelOrder(request: CancelOrderRequest): Promise<Order> {
  return apiFetch<Order>(`/orders/${request.orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      reason: request.reason,
      reasonDetails: request.reasonDetails,
    }),
  })
}

export async function requestReturn(
  request: ReturnRequest
): Promise<ReturnRequestResponse> {
  return apiFetch<ReturnRequestResponse>(`/orders/${request.orderId}/return`, {
    method: 'POST',
    body: JSON.stringify({
      items: request.items,
      reason: request.reason,
      reasonDetails: request.reasonDetails,
      preferredResolution: request.preferredResolution,
    }),
  })
}

export async function getReturnStatus(
  orderId: string,
  returnId: string
): Promise<ReturnRequestResponse> {
  return apiFetch<ReturnRequestResponse>(
    `/orders/${orderId}/returns/${returnId}`
  )
}

// ============================================================================
// Wishlist API
// ============================================================================

export async function getWishlists(): Promise<Wishlist[]> {
  return apiFetch<Wishlist[]>('/wishlists')
}

export async function getWishlist(wishlistId: string): Promise<Wishlist> {
  return apiFetch<Wishlist>(`/wishlists/${wishlistId}`)
}

export async function getDefaultWishlist(): Promise<Wishlist> {
  return apiFetch<Wishlist>('/wishlists/default')
}

export async function createWishlist(name: string): Promise<Wishlist> {
  return apiFetch<Wishlist>('/wishlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function addToWishlist(
  request: AddToWishlistRequest
): Promise<WishlistItem> {
  const wishlistId = request.wishlistId ?? 'default'
  return apiFetch<WishlistItem>(`/wishlists/${wishlistId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      productId: request.productId,
      variantId: request.variantId,
    }),
  })
}

export async function removeFromWishlist(
  wishlistId: string,
  itemId: string
): Promise<void> {
  await apiFetch<void>(`/wishlists/${wishlistId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

export async function shareWishlist(
  wishlistId: string,
  expiresInDays?: number
): Promise<ShareWishlistResponse> {
  return apiFetch<ShareWishlistResponse>(`/wishlists/${wishlistId}/share`, {
    method: 'POST',
    body: JSON.stringify({ expiresInDays }),
  })
}

export async function moveToCart(
  wishlistId: string,
  itemId: string
): Promise<void> {
  await apiFetch<void>(`/wishlists/${wishlistId}/items/${itemId}/move-to-cart`, {
    method: 'POST',
  })
}

// ============================================================================
// Referrals API
// ============================================================================

export async function getReferralCode(): Promise<ReferralCode> {
  return apiFetch<ReferralCode>('/referrals/code')
}

export async function getReferralStats(): Promise<ReferralStats> {
  return apiFetch<ReferralStats>('/referrals/stats')
}

export async function getReferralHistory(
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<Referral>> {
  return apiFetch<PaginatedResult<Referral>>(
    `/referrals/history?page=${page}&pageSize=${pageSize}`
  )
}

export async function getReferralRewards(
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<ReferralReward>> {
  return apiFetch<PaginatedResult<ReferralReward>>(
    `/referrals/rewards?page=${page}&pageSize=${pageSize}`
  )
}

export async function sendReferralInvite(email: string): Promise<void> {
  await apiFetch<void>('/referrals/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

// ============================================================================
// Loyalty API
// ============================================================================

export async function getLoyaltyAccount(): Promise<LoyaltyAccount> {
  return apiFetch<LoyaltyAccount>('/loyalty/account')
}

export async function getLoyaltyTiers(): Promise<LoyaltyTierInfo[]> {
  return apiFetch<LoyaltyTierInfo[]>('/loyalty/tiers')
}

export async function getPointsHistory(
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<PointsTransaction>> {
  return apiFetch<PaginatedResult<PointsTransaction>>(
    `/loyalty/history?page=${page}&pageSize=${pageSize}`
  )
}

export async function getAvailableRewards(): Promise<LoyaltyReward[]> {
  return apiFetch<LoyaltyReward[]>('/loyalty/rewards')
}

export async function redeemReward(
  request: RedeemRewardRequest
): Promise<RedeemRewardResponse> {
  return apiFetch<RedeemRewardResponse>('/loyalty/rewards/redeem', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// ============================================================================
// Support API
// ============================================================================

export async function getTickets(
  page = 1,
  pageSize = 10
): Promise<PaginatedResult<SupportTicket>> {
  return apiFetch<PaginatedResult<SupportTicket>>(
    `/support/tickets?page=${page}&pageSize=${pageSize}`
  )
}

export async function getTicket(ticketId: string): Promise<SupportTicket> {
  return apiFetch<SupportTicket>(`/support/tickets/${ticketId}`)
}

export async function createTicket(
  request: CreateTicketRequest
): Promise<SupportTicket> {
  const formData = new FormData()
  formData.append('subject', request.subject)
  formData.append('category', request.category)
  formData.append('message', request.message)
  if (request.orderId) {
    formData.append('orderId', request.orderId)
  }
  request.attachments.forEach((file, index) => {
    formData.append(`attachment_${index}`, file)
  })

  const response = await fetch(`${API_BASE}/support/tickets`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export async function replyToTicket(
  request: ReplyToTicketRequest
): Promise<SupportTicket> {
  const formData = new FormData()
  formData.append('message', request.message)
  request.attachments.forEach((file, index) => {
    formData.append(`attachment_${index}`, file)
  })

  const response = await fetch(
    `${API_BASE}/support/tickets/${request.ticketId}/reply`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export async function closeTicket(ticketId: string): Promise<SupportTicket> {
  return apiFetch<SupportTicket>(`/support/tickets/${ticketId}/close`, {
    method: 'POST',
  })
}

export async function getFaqCategories(): Promise<FaqCategory[]> {
  return apiFetch<FaqCategory[]>('/support/faq')
}

export async function searchFaq(query: string): Promise<FaqCategory[]> {
  return apiFetch<FaqCategory[]>(
    `/support/faq/search?q=${encodeURIComponent(query)}`
  )
}

export async function markFaqHelpful(
  faqId: string,
  helpful: boolean
): Promise<void> {
  await apiFetch<void>(`/support/faq/${faqId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ helpful }),
  })
}

// ============================================================================
// Live Chat API
// ============================================================================

export interface ChatSession {
  sessionId: string
  websocketUrl: string
  agentName: string | null
  queuePosition: number | null
}

export async function startChatSession(): Promise<ChatSession> {
  return apiFetch<ChatSession>('/support/chat/start', {
    method: 'POST',
  })
}

export async function endChatSession(sessionId: string): Promise<void> {
  await apiFetch<void>(`/support/chat/${sessionId}/end`, {
    method: 'POST',
  })
}

// ============================================================================
// Profile API
// ============================================================================

import type {
  CustomerProfile,
  StoreCreditAccount,
  UpdateProfileRequest,
} from './types'

export async function getProfile(): Promise<CustomerProfile> {
  return apiFetch<CustomerProfile>('/profile')
}

export async function updateProfile(
  request: UpdateProfileRequest
): Promise<CustomerProfile> {
  return apiFetch<CustomerProfile>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

export async function requestPasswordReset(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/profile/password-reset', {
    method: 'POST',
  })
}

// ============================================================================
// Addresses API
// ============================================================================

export interface CustomerAddress {
  id: string
  firstName: string
  lastName: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string
  provinceCode: string | null
  postalCode: string
  country: string
  countryCode: string
  phone: string | null
  isDefault: boolean
}

export interface CreateAddressRequest {
  firstName: string
  lastName: string
  company?: string | null
  address1: string
  address2?: string | null
  city: string
  province: string
  postalCode: string
  country: string
  countryCode: string
  phone?: string | null
  isDefault?: boolean
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  id: string
}

export async function getAddresses(): Promise<CustomerAddress[]> {
  return apiFetch<CustomerAddress[]>('/addresses')
}

export async function createAddress(
  request: CreateAddressRequest
): Promise<CustomerAddress> {
  return apiFetch<CustomerAddress>('/addresses', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function updateAddress(
  request: UpdateAddressRequest
): Promise<CustomerAddress> {
  return apiFetch<CustomerAddress>(`/addresses/${request.id}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiFetch<void>(`/addresses/${addressId}`, {
    method: 'DELETE',
  })
}

export async function setDefaultAddress(addressId: string): Promise<CustomerAddress> {
  return apiFetch<CustomerAddress>(`/addresses/${addressId}/default`, {
    method: 'POST',
  })
}

// ============================================================================
// Store Credit API
// ============================================================================

export async function getStoreCredit(): Promise<StoreCreditAccount> {
  return apiFetch<StoreCreditAccount>('/store-credit')
}
